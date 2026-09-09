import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Box, Button, Chip, Collapse, IconButton, Paper, Stack, Tooltip, Typography } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import type { GridColDef } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/AddRounded";
import EditIcon from "@mui/icons-material/EditOutlined";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import { electoralPeriodApi } from "@/api/electoralApi";
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
      { field: "code", headerName: "Código", width: 120 },
      { field: "name", headerName: "Nombre", flex: 1, minWidth: 220 },
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
    <Stack spacing={2.5}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" rowGap={1}>
        <Box>
          <Typography variant="h3">Períodos electorales</Typography>
          <Typography variant="body2" color="text.secondary">
            Ancla temporal del módulo de fiscalización electoral. Solo puede haber un período activo
            a la vez — los delegados temporales y centros de servicio se dan de alta contra él.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialog({ type: "create" })}>
          Nuevo período
        </Button>
      </Stack>

      <Collapse in={periodosQuery.isError}>
        <Alert severity="error">
          {getApiErrorMessage(periodosQuery.error, "No se pudo cargar el listado de períodos.")}
        </Alert>
      </Collapse>

      {!periodosQuery.isError && (periodosQuery.data ?? []).every((p) => !p.active) && !periodosQuery.isLoading && (
        <Alert severity="warning">
          No hay ningún período electoral activo. Activa uno para poder dar de alta delegados
          temporales y centros de servicio.
        </Alert>
      )}

      <Paper variant="outlined" sx={{ height: 480 }}>
        <DataGrid
          rows={periodosQuery.data ?? []}
          columns={columns}
          loading={periodosQuery.isLoading}
          disableRowSelectionOnClick
          density="comfortable"
          initialState={{
            pagination: { paginationModel: { pageSize: 10 } },
            sorting: { sortModel: [{ field: "startDate", sort: "desc" }] },
          }}
          pageSizeOptions={[10, 25, 50]}
          sx={{ border: "none" }}
        />
      </Paper>

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
