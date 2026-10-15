import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Chip, Collapse, IconButton, MenuItem, Stack, TextField, Tooltip } from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/AddRounded";
import EditIcon from "@mui/icons-material/EditOutlined";
import ToggleOnIcon from "@mui/icons-material/ToggleOnOutlined";
import ToggleOffIcon from "@mui/icons-material/ToggleOffOutlined";
import UploadFileIcon from "@mui/icons-material/UploadFileOutlined";
import { serviceCenterApi } from "@/api/electoralApi";
import { PageHeader } from "@/components/ui/PageHeader";
import { Callout } from "@/components/ui/Callout";
import { DataTable } from "@/components/ui/DataTable";
import { FloatingToolbar } from "@/components/ui/FloatingToolbar";
import { getApiErrorMessage } from "@/utils/apiError";
import { useActiveElectoralPeriod } from "@/hooks/useActiveElectoralPeriod";
import { BulkImportDialog } from "@/components/BulkImportDialog";
import type { ServiceCenterDto } from "@/types/electoral";
import { CentroServicioFormDialog } from "./CentroServicioFormDialog";
import { useToast } from "@/hooks/useToast";
import { ToastSnackbar } from "@/components/ToastSnackbar";

type DialogState = { type: "closed" } | { type: "create" } | { type: "edit"; item: ServiceCenterDto };

export function CentrosServicioPage() {
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<DialogState>({ type: "closed" });
  const [periodFilter, setPeriodFilter] = useState<number | "">("");
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const { toast, showToast, closeToast } = useToast();

  const { data: periodos, activePeriod } = useActiveElectoralPeriod();

  useEffect(() => {
    if (periodFilter === "" && activePeriod) setPeriodFilter(activePeriod.id);
  }, [activePeriod, periodFilter]);

  const centrosQuery = useQuery({
    queryKey: ["centros-servicio", periodFilter || null],
    queryFn: () => serviceCenterApi.getCentros(Number(periodFilter), false),
    enabled: !!periodFilter,
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (target: ServiceCenterDto) =>
      serviceCenterApi.updateCentro(target.id, {
        code: target.code,
        name: target.name,
        departmentId: target.departmentId,
        address: target.address ?? undefined,
        electoralPeriodId: target.electoralPeriodId,
        active: !target.active,
      }),
    onSuccess: (_data, target) => {
      queryClient.invalidateQueries({ queryKey: ["centros-servicio"] });
      showToast("success", target.active ? `"${target.name}" desactivado.` : `"${target.name}" activado.`);
    },
    onError: (error) => showToast("error", getApiErrorMessage(error, "No se pudo cambiar el estado.")),
  });

  const columns: GridColDef<ServiceCenterDto>[] = useMemo(
    () => [
      { field: "code", headerName: "Código", cellClassName: "cell-code", width: 110 },
      { field: "name", headerName: "Nombre", cellClassName: "cell-strong", flex: 1, minWidth: 220 },
      { field: "departmentName", headerName: "Departamento", width: 160 },
      {
        field: "address",
        headerName: "Dirección",
        flex: 1,
        minWidth: 180,
        valueGetter: (_v, row) => row.address ?? "—",
      },
      {
        field: "active",
        headerName: "Estado",
        width: 130,
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
        width: 110,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <Stack direction="row" spacing={0.5}>
            <Tooltip title="Editar">
              <IconButton size="small" onClick={() => setDialog({ type: "edit", item: params.row })}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={params.row.active ? "Desactivar" : "Activar"}>
              <IconButton
                size="small"
                disabled={toggleActiveMutation.isPending}
                onClick={() => toggleActiveMutation.mutate(params.row)}
              >
                {params.row.active ? (
                  <ToggleOnIcon fontSize="small" color="success" />
                ) : (
                  <ToggleOffIcon fontSize="small" />
                )}
              </IconButton>
            </Tooltip>
          </Stack>
        ),
      },
    ],
    [toggleActiveMutation]
  );

  return (
    <Stack spacing={{ xs: 2, md: 2.5 }} sx={{ flexShrink: 0, pb: 2 }}>
      <PageHeader
        title="Centros de servicio"
        subtitle="Centros tipo JRV habilitados durante un período electoral, donde fiscalizan los delegados temporales."
        actions={
          <>
            <Tooltip title={periodFilter ? "" : "Selecciona un período electoral para la carga masiva"}>
              <span>
                <Button
                  variant="outlined"
                  startIcon={<UploadFileIcon />}
                  disabled={!periodFilter}
                  onClick={() => setBulkImportOpen(true)}
                >
                  Carga masiva
                </Button>
              </span>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              disabled={!periodFilter}
              onClick={() => setDialog({ type: "create" })}
            >
              Nuevo centro
            </Button>
          </>
        }
      />

      <FloatingToolbar>
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
      </FloatingToolbar>

      {!periodFilter && (
        <Callout tone="info">Selecciona un período electoral para ver o crear sus centros de servicio.</Callout>
      )}

      <Collapse in={centrosQuery.isError}>
        <Callout tone="error" title="No se pudo cargar el catálogo">
          {getApiErrorMessage(centrosQuery.error, "Revisa tu conexión e inténtalo de nuevo.")}
        </Callout>
      </Collapse>

      <DataTable
          rows={centrosQuery.data ?? []}
          columns={columns}
          loading={centrosQuery.isLoading}
          initialState={{
            pagination: { paginationModel: { pageSize: 10 } },
            sorting: { sortModel: [{ field: "name", sort: "asc" }] },
          }}
          pageSizeOptions={[10, 25, 50]}
          empty={{ title: "Aún no hay centros en este período" }}
        />

      <CentroServicioFormDialog
        open={dialog.type === "create" || dialog.type === "edit"}
        centro={dialog.type === "edit" ? dialog.item : null}
        periodos={periodos ?? []}
        defaultElectoralPeriodId={periodFilter || undefined}
        onClose={() => setDialog({ type: "closed" })}
      />

      {periodFilter && (
        <BulkImportDialog
          open={bulkImportOpen}
          title="Carga masiva de centros de servicio"
          helperText='Todas las filas del archivo entran al período electoral seleccionado en el filtro de arriba. La columna "departamento_codigo" referencia el departamento por código, no por id.'
          templateFilename="plantilla-centros-servicio.xlsx"
          onDownloadTemplate={serviceCenterApi.descargarPlantilla}
          onUpload={(file) => serviceCenterApi.cargaMasiva(file, Number(periodFilter))}
          onClose={() => setBulkImportOpen(false)}
          onImported={() => queryClient.invalidateQueries({ queryKey: ["centros-servicio"] })}
        />
      )}

      <ToastSnackbar toast={toast} onClose={closeToast} />
    </Stack>
  );
}
