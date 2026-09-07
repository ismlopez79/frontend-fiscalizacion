import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Chip, Collapse, IconButton, Paper, Stack, Tooltip, Typography } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import type { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import WarningAmberIcon from "@mui/icons-material/WarningAmberOutlined";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import DoneAllRoundedIcon from "@mui/icons-material/DoneAllRounded";
import FlagOutlinedIcon from "@mui/icons-material/FlagOutlined";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import { actaApi } from "@/api/actaApi";
import { getApiErrorMessage } from "@/utils/apiError";
import { ConfirmacionAccion } from "@/components/ConfirmacionAccion";
import { useToast } from "@/hooks/useToast";
import { ToastSnackbar } from "@/components/ToastSnackbar";
import type { ActaResponse } from "@/types/acta";

type ConfirmState = { type: "aprobar" | "observar" | "rechazar"; acta: ActaResponse } | null;

/**
 * Bandeja de trabajo del revisor: solo actas en PENDIENTE_REVISION, via el
 * endpoint dedicado GET /actas/pendientes-revision (no /actas?status=...).
 * Acciones rapidas por fila para no tener que abrir cada acta para
 * aprobar/observar/rechazar — abrir el detalle sigue disponible para los
 * casos que necesitan mas contexto (o para anular, que solo vive ahi).
 */
export function ActasPendientesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 20 });
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);
  const [confirmAprobarTodas, setConfirmAprobarTodas] = useState(false);
  const { toast, showToast, closeToast } = useToast();

  const pendientesQuery = useQuery({
    queryKey: ["actas", "pendientes-revision", paginationModel.page, paginationModel.pageSize],
    queryFn: () => actaApi.getPendientesRevision(paginationModel.page, paginationModel.pageSize),
    placeholderData: keepPreviousData,
  });

  const invalidatePendientes = () => {
    queryClient.invalidateQueries({ queryKey: ["actas"] });
  };

  const aprobarMutation = useMutation({
    mutationFn: (acta: ActaResponse) => actaApi.aprobar(acta.id),
    onSuccess: () => {
      invalidatePendientes();
      showToast("success", "Acta aprobada.");
    },
    onError: (error) => showToast("error", getApiErrorMessage(error, "No se pudo aprobar el acta.")),
  });

  const observarMutation = useMutation({
    mutationFn: ({ acta, comment }: { acta: ActaResponse; comment: string }) =>
      actaApi.observar(acta.id, comment),
    onSuccess: () => {
      invalidatePendientes();
      showToast("success", "Acta observada.");
    },
    onError: (error) => showToast("error", getApiErrorMessage(error, "No se pudo observar el acta.")),
  });

  const rechazarMutation = useMutation({
    mutationFn: ({ acta, comment }: { acta: ActaResponse; comment: string }) =>
      actaApi.rechazar(acta.id, comment),
    onSuccess: () => {
      invalidatePendientes();
      showToast("success", "Acta rechazada.");
    },
    onError: (error) => showToast("error", getApiErrorMessage(error, "No se pudo rechazar el acta.")),
  });

  const aprobarTodasMutation = useMutation({
    mutationFn: () => actaApi.aprobarTodasPendientes(),
    onSuccess: ({ approvedCount }) => {
      invalidatePendientes();
      showToast(
        "success",
        approvedCount === 1 ? "1 acta aprobada." : `${approvedCount} actas aprobadas.`
      );
    },
    onError: (error) => showToast("error", getApiErrorMessage(error, "No se pudieron aprobar las actas.")),
  });

  const columns: GridColDef<ActaResponse>[] = useMemo(
    () => [
      { field: "actaNumber", headerName: "N° de acta", width: 160 },
      { field: "actaDate", headerName: "Fecha", width: 120 },
      { field: "duicentroName", headerName: "Duicentro", flex: 1, minWidth: 180 },
      { field: "createdByUsername", headerName: "Creada por", width: 130 },
      {
        field: "calculatedTotal",
        headerName: "Total",
        width: 100,
        valueGetter: (_v, row) => row.calculatedTotal,
      },
      {
        field: "flags",
        headerName: "Alertas",
        width: 140,
        sortable: false,
        renderCell: (params) => (
          <Stack direction="row" spacing={0.5}>
            {params.row.hasDiscrepancy && (
              <Tooltip title="El total declarado no coincide con el calculado">
                <Chip
                  size="small"
                  icon={<WarningAmberIcon fontSize="small" />}
                  label="Discrepancia"
                  color="warning"
                  variant="outlined"
                />
              </Tooltip>
            )}
            {params.row.possibleDuplicate && (
              <Tooltip title="Posible duplicado de otra acta">
                <Chip size="small" label="Duplicado?" color="error" variant="outlined" />
              </Tooltip>
            )}
          </Stack>
        ),
      },
      {
        field: "actions",
        headerName: "Acciones",
        width: 170,
        sortable: false,
        filterable: false,
        renderCell: (params) => {
          const acta = params.row;
          const pending = aprobarMutation.isPending || observarMutation.isPending || rechazarMutation.isPending;
          return (
            <Stack direction="row" spacing={0.5}>
              <Tooltip title="Aprobar">
                <span>
                  <IconButton
                    size="small"
                    color="success"
                    disabled={pending}
                    onClick={() => setConfirmState({ type: "aprobar", acta })}
                  >
                    <CheckCircleOutlineRoundedIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Observar">
                <span>
                  <IconButton
                    size="small"
                    color="warning"
                    disabled={pending}
                    onClick={() => setConfirmState({ type: "observar", acta })}
                  >
                    <FlagOutlinedIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Rechazar">
                <span>
                  <IconButton
                    size="small"
                    color="error"
                    disabled={pending}
                    onClick={() => setConfirmState({ type: "rechazar", acta })}
                  >
                    <CancelOutlinedIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Ver detalle">
                <IconButton size="small" onClick={() => navigate(`/actas/${acta.id}`)}>
                  <VisibilityOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          );
        },
      },
    ],
    [navigate, aprobarMutation.isPending, observarMutation.isPending, rechazarMutation.isPending]
  );

  const totalPendientes = pendientesQuery.data?.totalElements ?? 0;

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" flexWrap="wrap" rowGap={1}>
        <Stack>
          <Typography variant="h3">Actas pendientes de revisión</Typography>
          <Typography variant="body2" color="text.secondary">
            Cola de trabajo para supervisores: actas en estado Pendiente de revisión, con acceso
            directo a aprobar, observar o rechazar.
          </Typography>
        </Stack>
        <Button
          variant="outlined"
          color="success"
          startIcon={<DoneAllRoundedIcon />}
          disabled={totalPendientes === 0 || aprobarTodasMutation.isPending}
          onClick={() => setConfirmAprobarTodas(true)}
        >
          Aprobar todas
        </Button>
      </Stack>

      <Collapse in={pendientesQuery.isError}>
        <Alert severity="error">
          {getApiErrorMessage(pendientesQuery.error, "No se pudo cargar la bandeja de pendientes.")}
        </Alert>
      </Collapse>

      {!pendientesQuery.isError && (pendientesQuery.data?.content ?? []).length === 0 && !pendientesQuery.isLoading && (
        <Alert severity="success">No hay actas pendientes de revisión.</Alert>
      )}

      <Paper variant="outlined" sx={{ height: 600 }}>
        <DataGrid
          rows={pendientesQuery.data?.content ?? []}
          columns={columns}
          loading={pendientesQuery.isFetching}
          disableRowSelectionOnClick
          density="comfortable"
          paginationMode="server"
          rowCount={pendientesQuery.data?.totalElements ?? 0}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[10, 20, 50]}
          onRowDoubleClick={(params) => navigate(`/actas/${params.row.id}`)}
          sx={{ border: "none" }}
        />
      </Paper>

      <ConfirmacionAccion
        open={confirmState?.type === "aprobar"}
        titulo="Aprobar acta"
        descripcion={confirmState ? `El acta ${confirmState.acta.actaNumber} pasará a estado Aprobada.` : undefined}
        confirmLabel="Aprobar"
        onConfirm={() => {
          if (confirmState) aprobarMutation.mutate(confirmState.acta);
          setConfirmState(null);
        }}
        onCancel={() => setConfirmState(null)}
      />

      <ConfirmacionAccion
        open={confirmState?.type === "observar"}
        titulo="Observar acta"
        descripcion={
          confirmState
            ? `El acta ${confirmState.acta.actaNumber} volverá al digitador con tu comentario para que la corrija y la reenvíe.`
            : undefined
        }
        requiereComentario
        confirmLabel="Observar"
        onConfirm={(comment) => {
          if (confirmState && comment) observarMutation.mutate({ acta: confirmState.acta, comment });
          setConfirmState(null);
        }}
        onCancel={() => setConfirmState(null)}
      />

      <ConfirmacionAccion
        open={confirmState?.type === "rechazar"}
        titulo="Rechazar acta"
        descripcion={
          confirmState
            ? `El acta ${confirmState.acta.actaNumber} quedará en estado Rechazada. Esta acción no se puede deshacer, salvo anulándola.`
            : undefined
        }
        requiereComentario
        variant="destructive"
        confirmLabel="Rechazar"
        onConfirm={(comment) => {
          if (confirmState && comment) rechazarMutation.mutate({ acta: confirmState.acta, comment });
          setConfirmState(null);
        }}
        onCancel={() => setConfirmState(null)}
      />

      <ConfirmacionAccion
        open={confirmAprobarTodas}
        titulo="Aprobar todas las actas pendientes"
        descripcion={
          totalPendientes === 1
            ? "Se aprobará 1 acta que está en Pendiente de revisión."
            : `Se aprobarán ${totalPendientes} actas que están en Pendiente de revisión.`
        }
        confirmLabel="Aprobar todas"
        loading={aprobarTodasMutation.isPending}
        onConfirm={() => {
          aprobarTodasMutation.mutate();
          setConfirmAprobarTodas(false);
        }}
        onCancel={() => setConfirmAprobarTodas(false)}
      />

      <ToastSnackbar toast={toast} onClose={closeToast} />
    </Stack>
  );
}
