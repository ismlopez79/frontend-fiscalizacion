import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Box, Button, Collapse, IconButton, Paper, Skeleton, Stack, Tooltip } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import type { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import DoneAllRoundedIcon from "@mui/icons-material/DoneAllRounded";
import FlagOutlinedIcon from "@mui/icons-material/FlagOutlined";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";
import { actaApi } from "@/api/actaApi";
import { getApiErrorMessage } from "@/utils/apiError";
import { ConfirmacionAccion } from "@/components/ConfirmacionAccion";
import { useToast } from "@/hooks/useToast";
import { ToastSnackbar } from "@/components/ToastSnackbar";
import { PageHeader } from "@/components/ui/PageHeader";
import { Callout } from "@/components/ui/Callout";
import { designTokens } from "@/theme/theme";
import type { ActaResponse } from "@/types/acta";
import { EmptyState, actaColumns, actaGridSx, actaNumberFormatter } from "./actaUi";

type ConfirmState = { type: "aprobar" | "observar" | "rechazar"; acta: ActaResponse } | null;

/**
 * Bandeja de trabajo del revisor: solo actas en PENDIENTE_REVISION, via el
 * endpoint dedicado GET /actas/pendientes-revision (no /actas?status=...).
 * Acciones rapidas por fila para no tener que abrir cada acta para
 * aprobar/observar/rechazar — tocar la fila abre el detalle para los casos
 * que necesitan mas contexto (o para anular, que solo vive ahi).
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

  const pending = aprobarMutation.isPending || observarMutation.isPending || rechazarMutation.isPending;

  const columns: GridColDef<ActaResponse>[] = useMemo(
    () => [
      actaColumns.number,
      actaColumns.date,
      actaColumns.duicentro,
      actaColumns.createdBy,
      actaColumns.total,
      actaColumns.flags,
      {
        field: "actions",
        headerName: "",
        width: 196,
        sortable: false,
        filterable: false,
        align: "right",
        renderCell: (params) => {
          const acta = params.row;
          // stopPropagation: las acciones no deben abrir el detalle (eso es el clic en la fila).
          return (
            <Stack direction="row" gap={0.5} alignItems="center" onClick={(e) => e.stopPropagation()}>
              <Tooltip title="Observar">
                <span>
                  <IconButton
                    size="small"
                    aria-label={`Observar acta ${acta.actaNumber}`}
                    disabled={pending}
                    onClick={() => setConfirmState({ type: "observar", acta })}
                    sx={{ color: designTokens.status.warning.fg }}
                  >
                    <FlagOutlinedIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Rechazar">
                <span>
                  <IconButton
                    size="small"
                    aria-label={`Rechazar acta ${acta.actaNumber}`}
                    disabled={pending}
                    onClick={() => setConfirmState({ type: "rechazar", acta })}
                    sx={{ color: designTokens.status.error.fg }}
                  >
                    <CancelOutlinedIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Button
                size="small"
                variant="contained"
                color="success"
                startIcon={<CheckRoundedIcon />}
                disabled={pending}
                onClick={() => setConfirmState({ type: "aprobar", acta })}
                sx={{ ml: 0.5, minHeight: 32 }}
              >
                Aprobar
              </Button>
            </Stack>
          );
        },
      },
    ],
    [pending]
  );

  const totalPendientes = pendientesQuery.data?.totalElements ?? 0;

  return (
    <Stack spacing={{ xs: 2, md: 2.5 }} sx={{ flexShrink: 0, pb: 2 }}>
      <PageHeader
        title="Pendientes de revisión"
        titleAdornment={
          pendientesQuery.isLoading ? (
            <Skeleton variant="rounded" width={40} height={26} sx={{ borderRadius: 999 }} />
          ) : (
            <Box
              component="span"
              aria-label={`${totalPendientes} pendientes`}
              sx={{
                px: 1.25,
                height: 26,
                display: "inline-flex",
                alignItems: "center",
                borderRadius: 999,
                bgcolor: totalPendientes > 0 ? designTokens.status.warning.bg : designTokens.status.success.bg,
                color: totalPendientes > 0 ? designTokens.status.warning.fg : designTokens.status.success.fg,
                fontWeight: 700,
                fontSize: "0.8125rem",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {actaNumberFormatter.format(totalPendientes)}
            </Box>
          )
        }
        subtitle="Aprueba, observa o rechaza desde la fila. Toca el acta para revisar su detalle y archivos."
        actions={
          <Button
            variant="outlined"
            color="success"
            startIcon={<DoneAllRoundedIcon />}
            disabled={totalPendientes === 0 || aprobarTodasMutation.isPending}
            onClick={() => setConfirmAprobarTodas(true)}
          >
            Aprobar todas
          </Button>
        }
      />

      <Collapse in={pendientesQuery.isError}>
        <Callout tone="error" title="No se pudo cargar la bandeja">
          {getApiErrorMessage(pendientesQuery.error, "Revisa tu conexión e inténtalo de nuevo.")}
        </Callout>
      </Collapse>

      <Paper variant="outlined" sx={{ overflow: "hidden" }}>
        <DataGrid
          autoHeight
          rows={pendientesQuery.data?.content ?? []}
          columns={columns}
          loading={pendientesQuery.isFetching}
          disableRowSelectionOnClick
          disableColumnMenu
          rowHeight={60}
          columnHeaderHeight={44}
          paginationMode="server"
          rowCount={totalPendientes}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[10, 20, 50]}
          onRowClick={(params) => navigate(`/actas/${params.row.id}`)}
          onCellKeyDown={(params, event) => {
            if (event.key === "Enter" && params.field !== "actions") navigate(`/actas/${params.row.id}`);
          }}
          localeText={{
            MuiTablePagination: {
              labelRowsPerPage: "Por página",
              labelDisplayedRows: ({ from, to, count }) => `${from}–${to} de ${actaNumberFormatter.format(count)}`,
            },
          }}
          slots={{
            noRowsOverlay: () => (
              <EmptyState
                icon={<TaskAltRoundedIcon sx={{ color: designTokens.status.success.fg }} />}
                title="Todo al día"
                hint="No hay actas esperando revisión. Las nuevas aparecerán aquí en cuanto se envíen."
              />
            ),
          }}
          sx={{ ...actaGridSx, "--DataGrid-overlayHeight": "300px" }}
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
