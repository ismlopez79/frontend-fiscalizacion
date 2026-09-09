import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Collapse, IconButton, Paper, Stack, Tooltip, Typography } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import type { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import FlagOutlinedIcon from "@mui/icons-material/FlagOutlined";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import { fiscalizationFormApi } from "@/api/fiscalizationFormApi";
import { getApiErrorMessage } from "@/utils/apiError";
import { ConfirmacionAccion } from "@/components/ConfirmacionAccion";
import { useToast } from "@/hooks/useToast";
import { ToastSnackbar } from "@/components/ToastSnackbar";
import type { FiscalizationFormResponse } from "@/types/fiscalizacionForm";

type ConfirmState = { type: "aprobar" | "observar" | "rechazar"; formulario: FiscalizationFormResponse } | null;

/** Bandeja de trabajo del revisor — mismo criterio que ActasPendientesPage. */
export function FiscalizacionPendientesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 20 });
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);
  const { toast, showToast, closeToast } = useToast();

  const pendientesQuery = useQuery({
    queryKey: ["formularios-fiscalizacion", "pendientes-revision", paginationModel.page, paginationModel.pageSize],
    queryFn: () => fiscalizationFormApi.getPendientesRevision(paginationModel.page, paginationModel.pageSize),
    placeholderData: keepPreviousData,
  });

  const invalidatePendientes = () => {
    queryClient.invalidateQueries({ queryKey: ["formularios-fiscalizacion"] });
  };

  const aprobarMutation = useMutation({
    mutationFn: (formulario: FiscalizationFormResponse) => fiscalizationFormApi.aprobar(formulario.id),
    onSuccess: () => {
      invalidatePendientes();
      showToast("success", "Formulario aprobado.");
    },
    onError: (error) => showToast("error", getApiErrorMessage(error, "No se pudo aprobar el formulario.")),
  });

  const observarMutation = useMutation({
    mutationFn: ({ formulario, comment }: { formulario: FiscalizationFormResponse; comment: string }) =>
      fiscalizationFormApi.observar(formulario.id, comment),
    onSuccess: () => {
      invalidatePendientes();
      showToast("success", "Formulario observado.");
    },
    onError: (error) => showToast("error", getApiErrorMessage(error, "No se pudo observar el formulario.")),
  });

  const rechazarMutation = useMutation({
    mutationFn: ({ formulario, comment }: { formulario: FiscalizationFormResponse; comment: string }) =>
      fiscalizationFormApi.rechazar(formulario.id, comment),
    onSuccess: () => {
      invalidatePendientes();
      showToast("success", "Formulario rechazado.");
    },
    onError: (error) => showToast("error", getApiErrorMessage(error, "No se pudo rechazar el formulario.")),
  });

  const columns: GridColDef<FiscalizationFormResponse>[] = useMemo(
    () => [
      {
        field: "formNumber",
        headerName: "N° de formulario",
        width: 170,
        valueGetter: (_v, row) => row.formNumber ?? "—",
      },
      { field: "formDate", headerName: "Fecha", width: 120 },
      { field: "serviceCenterName", headerName: "Centro de servicio", flex: 1, minWidth: 200 },
      { field: "delegateName", headerName: "Delegado", width: 160 },
      {
        field: "actions",
        headerName: "Acciones",
        width: 170,
        sortable: false,
        filterable: false,
        renderCell: (params) => {
          const formulario = params.row;
          const pending = aprobarMutation.isPending || observarMutation.isPending || rechazarMutation.isPending;
          return (
            <Stack direction="row" spacing={0.5}>
              <Tooltip title="Aprobar">
                <span>
                  <IconButton
                    size="small"
                    color="success"
                    disabled={pending}
                    onClick={() => setConfirmState({ type: "aprobar", formulario })}
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
                    onClick={() => setConfirmState({ type: "observar", formulario })}
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
                    onClick={() => setConfirmState({ type: "rechazar", formulario })}
                  >
                    <CancelOutlinedIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Ver detalle">
                <IconButton size="small" onClick={() => navigate(`/fiscalizacion/${formulario.id}`)}>
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

  return (
    <Stack spacing={2.5}>
      <Stack>
        <Typography variant="h3">Formularios pendientes de revisión</Typography>
        <Typography variant="body2" color="text.secondary">
          Cola de trabajo para supervisores: formularios de fiscalización en estado Pendiente de
          revisión.
        </Typography>
      </Stack>

      <Collapse in={pendientesQuery.isError}>
        <Alert severity="error">
          {getApiErrorMessage(pendientesQuery.error, "No se pudo cargar la bandeja de pendientes.")}
        </Alert>
      </Collapse>

      {!pendientesQuery.isError && (pendientesQuery.data?.content ?? []).length === 0 && !pendientesQuery.isLoading && (
        <Alert severity="success">No hay formularios pendientes de revisión.</Alert>
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
          onRowDoubleClick={(params) => navigate(`/fiscalizacion/${params.row.id}`)}
          sx={{ border: "none" }}
        />
      </Paper>

      <ConfirmacionAccion
        open={confirmState?.type === "aprobar"}
        titulo="Aprobar formulario"
        descripcion={
          confirmState ? `El formulario de "${confirmState.formulario.serviceCenterName}" pasará a estado Aprobada.` : undefined
        }
        confirmLabel="Aprobar"
        onConfirm={() => {
          if (confirmState) aprobarMutation.mutate(confirmState.formulario);
          setConfirmState(null);
        }}
        onCancel={() => setConfirmState(null)}
      />

      <ConfirmacionAccion
        open={confirmState?.type === "observar"}
        titulo="Observar formulario"
        descripcion={
          confirmState
            ? `El formulario de "${confirmState.formulario.serviceCenterName}" volverá al delegado con tu comentario para que lo corrija y lo reenvíe.`
            : undefined
        }
        requiereComentario
        confirmLabel="Observar"
        onConfirm={(comment) => {
          if (confirmState && comment) observarMutation.mutate({ formulario: confirmState.formulario, comment });
          setConfirmState(null);
        }}
        onCancel={() => setConfirmState(null)}
      />

      <ConfirmacionAccion
        open={confirmState?.type === "rechazar"}
        titulo="Rechazar formulario"
        descripcion={
          confirmState
            ? `El formulario de "${confirmState.formulario.serviceCenterName}" quedará en estado Rechazada. Esta acción no se puede deshacer, salvo anulándolo.`
            : undefined
        }
        requiereComentario
        variant="destructive"
        confirmLabel="Rechazar"
        onConfirm={(comment) => {
          if (confirmState && comment) rechazarMutation.mutate({ formulario: confirmState.formulario, comment });
          setConfirmState(null);
        }}
        onCancel={() => setConfirmState(null)}
      />

      <ToastSnackbar toast={toast} onClose={closeToast} />
    </Stack>
  );
}
