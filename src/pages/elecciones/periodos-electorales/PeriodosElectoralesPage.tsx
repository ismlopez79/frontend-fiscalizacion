import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Chip, Collapse, IconButton, Stack, Tooltip } from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/AddRounded";
import EditIcon from "@mui/icons-material/EditOutlined";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import { electoralPeriodApi } from "@/api/electoralApi";
import { PageHeader } from "@/components/ui/PageHeader";
import { Callout } from "@/components/ui/Callout";
import { DataTable } from "@/components/ui/DataTable";
import { getApiErrorMessage } from "@/utils/apiError";
import { ConfirmacionAccion } from "@/components/ConfirmacionAccion";
import { useToast } from "@/hooks/useToast";
import { ToastSnackbar } from "@/components/ToastSnackbar";
import type { ElectoralPeriodDto } from "@/types/electoral";
import { PeriodoElectoralFormDialog } from "./PeriodoElectoralFormDialog";

type DialogState = { type: "closed" } | { type: "create" } | { type: "edit"; item: ElectoralPeriodDto };

export function PeriodosElectoralesPage() {
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<DialogState>({ type: "closed" });
  const [periodoToActivate, setPeriodoToActivate] = useState<ElectoralPeriodDto | null>(null);
  const { toast, showToast, closeToast } = useToast();

  const periodosQuery = useQuery({
    queryKey: ["periodos-electorales"],
    queryFn: electoralPeriodApi.getPeriodos,
  });

  const activarMutation = useMutation({
    mutationFn: (id: number) => electoralPeriodApi.activarPeriodo(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["periodos-electorales"] });
      showToast("success", `"${data.name}" es ahora el período activo.`);
    },
    onError: (error) => showToast("error", getApiErrorMessage(error, "No se pudo activar el período.")),
  });

  const columns: GridColDef<ElectoralPeriodDto>[] = useMemo(
    () => [
      { field: "code", headerName: "Código", cellClassName: "cell-code", width: 120 },
      { field: "name", headerName: "Nombre", cellClassName: "cell-strong", flex: 1, minWidth: 220 },
      { field: "startDate", headerName: "Inicio", width: 120 },
      { field: "endDate", headerName: "Fin", width: 120 },
      {
        field: "active",
        headerName: "Estado",
        width: 140,
        renderCell: (params) => (
          <Chip
            size="small"
            label={params.row.active ? "Activo" : "Inactivo"}
            color={params.row.active ? "success" : "default"}
            variant={params.row.active ? "filled" : "outlined"}
          />
        ),
      },
      {
        field: "actions",
        headerName: "Acciones",
        width: 140,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <Stack direction="row" spacing={0.5}>
            <Tooltip title="Editar">
              <IconButton size="small" onClick={() => setDialog({ type: "edit", item: params.row })}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {!params.row.active && (
              <Tooltip title="Activar (desactiva cualquier otro período activo)">
                <IconButton
                  size="small"
                  color="success"
                  disabled={activarMutation.isPending}
                  onClick={() => setPeriodoToActivate(params.row)}
                >
                  <CheckCircleOutlineRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        ),
      },
    ],
    [activarMutation.isPending]
  );

  return (
    <Stack spacing={{ xs: 2, md: 2.5 }} sx={{ flexShrink: 0, pb: 2 }}>
      <PageHeader
        title="Períodos electorales"
        subtitle="Ancla temporal del módulo de fiscalización electoral. Solo puede haber un período activo a la vez — los delegados temporales y centros de servicio se dan de alta contra él."
        actions={
          <>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialog({ type: "create" })}>
              Nuevo período
            </Button>
          </>
        }
      />

      <Collapse in={periodosQuery.isError}>
        <Callout tone="error" title="No se pudo cargar el listado de períodos">
          {getApiErrorMessage(periodosQuery.error, "Revisa tu conexión e inténtalo de nuevo.")}
        </Callout>
      </Collapse>

      {!periodosQuery.isError && (periodosQuery.data ?? []).every((p) => !p.active) && !periodosQuery.isLoading && (
        <Callout tone="warning">
          No hay ningún período electoral activo. Activa uno para poder dar de alta delegados
          temporales y centros de servicio.
        </Callout>
      )}

      <DataTable
          rows={periodosQuery.data ?? []}
          columns={columns}
          loading={periodosQuery.isLoading}
          initialState={{
            pagination: { paginationModel: { pageSize: 10 } },
            sorting: { sortModel: [{ field: "startDate", sort: "desc" }] },
          }}
          pageSizeOptions={[10, 25, 50]}
          empty={{ title: "Aún no hay períodos electorales" }}
        />

      <PeriodoElectoralFormDialog
        open={dialog.type === "create" || dialog.type === "edit"}
        periodo={dialog.type === "edit" ? dialog.item : null}
        onClose={() => setDialog({ type: "closed" })}
      />

      <ConfirmacionAccion
        open={!!periodoToActivate}
        titulo="Activar período electoral"
        descripcion={
          periodoToActivate
            ? `"${periodoToActivate.name}" pasará a ser el período activo. Si había otro período activo, se desactivará automáticamente.`
            : undefined
        }
        confirmLabel="Activar"
        loading={activarMutation.isPending}
        onConfirm={() => {
          if (periodoToActivate) activarMutation.mutate(periodoToActivate.id);
          setPeriodoToActivate(null);
        }}
        onCancel={() => setPeriodoToActivate(null)}
      />

      <ToastSnackbar toast={toast} onClose={closeToast} />
    </Stack>
  );
}
