import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Box, Button, Collapse, IconButton, Paper, Skeleton, Stack, Tooltip } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import type { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import FlagOutlinedIcon from "@mui/icons-material/FlagOutlined";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";
import { fiscalizationFormApi } from "@/api/fiscalizationFormApi";
import { getApiErrorMessage } from "@/utils/apiError";
import { ConfirmacionAccion } from "@/components/ConfirmacionAccion";
import { useToast } from "@/hooks/useToast";
import { ToastSnackbar } from "@/components/ToastSnackbar";
import { PageHeader } from "@/components/ui/PageHeader";
import { Callout } from "@/components/ui/Callout";
import { EmptyState } from "@/components/ui/EmptyState";
import { designTokens } from "@/theme/theme";
import { actaGridSx, actaNumberFormatter } from "@/pages/actas/actaUi";
import type { FiscalizationFormResponse } from "@/types/fiscalizacionForm";
import { fiscalizacionColumns } from "./fiscalizacionUi";

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

  const pending = aprobarMutation.isPending || observarMutation.isPending || rechazarMutation.isPending;

  const columns: GridColDef<FiscalizationFormResponse>[] = useMemo(
    () => [
      fiscalizacionColumns.number,
      fiscalizacionColumns.date,
      fiscalizacionColumns.centro,
      fiscalizacionColumns.delegate,
      {
        field: "actions",
        headerName: "",
        width: 196,
        sortable: false,
        filterable: false,
        align: "right",
        renderCell: (params) => {
          const formulario = params.row;
          // stopPropagation: las acciones no deben abrir el detalle (eso es el clic en la fila).
          return (
            <Stack direction="row" gap={0.5} alignItems="center" onClick={(e) => e.stopPropagation()}>
              <Tooltip title="Observar">
                <span>
                  <IconButton
                    size="small"
                    aria-label="Observar formulario"
                    disabled={pending}
                    onClick={() => setConfirmState({ type: "observar", formulario })}
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
                    aria-label="Rechazar formulario"
                    disabled={pending}
                    onClick={() => setConfirmState({ type: "rechazar", formulario })}
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
                onClick={() => setConfirmState({ type: "aprobar", formulario })}
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
        subtitle="Formularios de fiscalización esperando revisión. Toca uno para ver sus respuestas completas."
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
          rowHeight={56}
          columnHeaderHeight={44}
          paginationMode="server"
          rowCount={totalPendientes}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[10, 20, 50]}
          onRowClick={(params) => navigate(`/fiscalizacion/${params.row.id}`)}
          onCellKeyDown={(params, event) => {
            if (event.key === "Enter" && params.field !== "actions") navigate(`/fiscalizacion/${params.row.id}`);
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
                hint="No hay formularios esperando revisión. Los nuevos aparecerán aquí en cuanto se envíen."
              />
            ),
          }}
          sx={{ ...actaGridSx, "--DataGrid-overlayHeight": "300px" }}
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
