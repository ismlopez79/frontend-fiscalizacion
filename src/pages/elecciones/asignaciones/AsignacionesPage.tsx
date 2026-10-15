import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Chip, Collapse, IconButton, MenuItem, Stack, TextField, Tooltip } from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import dayjs from "dayjs";
import AddIcon from "@mui/icons-material/AddRounded";
import EditIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import { assignmentApi, serviceCenterApi, temporaryDelegateApi } from "@/api/electoralApi";
import { PageHeader } from "@/components/ui/PageHeader";
import { Callout } from "@/components/ui/Callout";
import { DataTable } from "@/components/ui/DataTable";
import { FloatingToolbar } from "@/components/ui/FloatingToolbar";
import { getApiErrorMessage } from "@/utils/apiError";
import { useActiveElectoralPeriod } from "@/hooks/useActiveElectoralPeriod";
import { ConfirmacionAccion } from "@/components/ConfirmacionAccion";
import { useToast } from "@/hooks/useToast";
import { ToastSnackbar } from "@/components/ToastSnackbar";
import type { AssignmentDto } from "@/types/electoral";
import { AsignacionFormDialog } from "./AsignacionFormDialog";
import { AsignacionEditDialog } from "./AsignacionEditDialog";

export function AsignacionesPage() {
  const queryClient = useQueryClient();
  const { toast, showToast, closeToast } = useToast();
  const { data: periodos, activePeriod } = useActiveElectoralPeriod();

  const [periodFilter, setPeriodFilter] = useState<number | "">("");
  const [dateFilter, setDateFilter] = useState(dayjs().format("YYYY-MM-DD"));
  const [createOpen, setCreateOpen] = useState(false);
  const [assignmentToEdit, setAssignmentToEdit] = useState<AssignmentDto | null>(null);
  const [assignmentToDelete, setAssignmentToDelete] = useState<AssignmentDto | null>(null);

  useEffect(() => {
    if (periodFilter === "" && activePeriod) setPeriodFilter(activePeriod.id);
  }, [activePeriod, periodFilter]);

  const centrosQuery = useQuery({
    queryKey: ["centros-servicio", periodFilter || null],
    queryFn: () => serviceCenterApi.getCentros(Number(periodFilter), true),
    enabled: !!periodFilter,
  });

  const delegadosQuery = useQuery({
    queryKey: ["delegados-temporales", periodFilter || null],
    queryFn: () => temporaryDelegateApi.getDelegadosTemporales(Number(periodFilter)),
    enabled: !!periodFilter,
  });

  const asignacionesQuery = useQuery({
    queryKey: ["asignaciones", dateFilter || null],
    queryFn: () => assignmentApi.getAsignaciones({ fecha: dateFilter || undefined }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => assignmentApi.eliminarAsignacion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asignaciones"] });
      showToast("success", "Asignación eliminada. Ya puedes crear la nueva.");
    },
    onError: (error) => showToast("error", getApiErrorMessage(error, "No se pudo eliminar la asignación.")),
  });

  const columns: GridColDef<AssignmentDto>[] = useMemo(
    () => [
      { field: "assignmentDate", headerName: "Fecha", width: 130 },
      { field: "serviceCenterName", headerName: "Centro de servicio", flex: 1.2, minWidth: 220 },
      { field: "delegateName", headerName: "Delegado", flex: 1, minWidth: 180 },
      {
        field: "delegateType",
        headerName: "Tipo",
        width: 130,
        renderCell: (params) => (
          <Chip
            size="small"
            label={params.row.delegateType === "PERMANENT" ? "Permanente" : "Temporal"}
            color={params.row.delegateType === "PERMANENT" ? "info" : "default"}
            variant="outlined"
          />
        ),
      },
      {
        field: "actions",
        headerName: "Acciones",
        width: 130,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <Stack direction="row" spacing={0.5}>
            <Tooltip title="Editar centro/fecha">
              <IconButton size="small" onClick={() => setAssignmentToEdit(params.row)}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Eliminar (para reasignar a otro delegado, crea la nueva después)">
              <IconButton
                size="small"
                color="error"
                disabled={deleteMutation.isPending}
                onClick={() => setAssignmentToDelete(params.row)}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        ),
      },
    ],
    [deleteMutation.isPending]
  );

  return (
    <Stack spacing={{ xs: 2, md: 2.5 }} sx={{ flexShrink: 0, pb: 2 }}>
      <PageHeader
        title="Asignaciones"
        subtitle="Cuadro de rotación: qué delegado (temporal o permanente/DIGITADOR) cubre qué centro de servicio, por fecha. «Editar» corrige el centro o la fecha de la misma fila; para cambiar de delegado, elimina la asignación y crea una nueva."
        actions={
          <>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              disabled={!periodFilter}
              onClick={() => setCreateOpen(true)}
            >
              Nueva asignación
            </Button>
          </>
        }
      />

      <FloatingToolbar>
        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" rowGap={1.25}>
          <TextField
            select
            label="Período electoral"
            size="small"
            sx={{ minWidth: 260 }}
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value === "" ? "" : Number(e.target.value))}
          >
            <MenuItem value="" disabled>
              Selecciona un período
            </MenuItem>
            {(periodos ?? []).map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.name} {p.active ? "· activo" : ""}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Fecha"
            type="date"
            size="small"
            sx={{ minWidth: 170 }}
            InputLabelProps={{ shrink: true }}
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
        </Stack>
      </FloatingToolbar>

      {!periodFilter && (
        <Callout tone="info">
          Selecciona un período electoral para poder crear asignaciones (necesita sus centros y
          delegados). El listado de abajo no depende del período, solo de la fecha.
        </Callout>
      )}

      <Collapse in={asignacionesQuery.isError}>
        <Callout tone="error" title="No se pudo cargar el cuadro de asignaciones">
          {getApiErrorMessage(asignacionesQuery.error, "Revisa tu conexión e inténtalo de nuevo.")}
        </Callout>
      </Collapse>

      <DataTable
          rows={asignacionesQuery.data ?? []}
          columns={columns}
          loading={asignacionesQuery.isLoading}
          initialState={{
            pagination: { paginationModel: { pageSize: 10 } },
            sorting: { sortModel: [{ field: "serviceCenterName", sort: "asc" }] },
          }}
          pageSizeOptions={[10, 25, 50]}
          empty={{ title: "Sin asignaciones para esta fecha" }}
        />

      <AsignacionFormDialog
        open={createOpen}
        centros={centrosQuery.data ?? []}
        delegados={delegadosQuery.data ?? []}
        defaultDate={dateFilter}
        onClose={() => setCreateOpen(false)}
      />

      <AsignacionEditDialog
        open={!!assignmentToEdit}
        asignacion={assignmentToEdit}
        centros={centrosQuery.data ?? []}
        onClose={() => setAssignmentToEdit(null)}
      />

      <ConfirmacionAccion
        open={!!assignmentToDelete}
        titulo="Eliminar asignación"
        descripcion={
          assignmentToDelete
            ? `"${assignmentToDelete.delegateName}" dejará de estar asignado a "${assignmentToDelete.serviceCenterName}" el ${assignmentToDelete.assignmentDate}.`
            : undefined
        }
        variant="destructive"
        confirmLabel="Eliminar"
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (assignmentToDelete) deleteMutation.mutate(assignmentToDelete.id);
          setAssignmentToDelete(null);
        }}
        onCancel={() => setAssignmentToDelete(null)}
      />

      <ToastSnackbar toast={toast} onClose={closeToast} />
    </Stack>
  );
}
