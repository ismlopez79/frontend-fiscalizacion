import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Box, Button, Chip, Collapse, IconButton, MenuItem, Paper, Stack, TextField, Tooltip, Typography } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import type { GridColDef } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/AddRounded";
import EditIcon from "@mui/icons-material/EditOutlined";
import ToggleOnIcon from "@mui/icons-material/ToggleOnOutlined";
import ToggleOffIcon from "@mui/icons-material/ToggleOffOutlined";
import UploadFileIcon from "@mui/icons-material/UploadFileOutlined";
import { serviceCenterApi } from "@/api/electoralApi";
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
      { field: "code", headerName: "Código", width: 110 },
      { field: "name", headerName: "Nombre", flex: 1, minWidth: 220 },
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
    <Stack spacing={2.5}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" rowGap={1}>
        <Box>
          <Typography variant="h3">Centros de servicio</Typography>
          <Typography variant="body2" color="text.secondary">
            Centros tipo JRV habilitados durante un período electoral, donde fiscalizan los
            delegados temporales.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
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
        </Stack>
      </Stack>

      <TextField
        select
        label="Período electoral"
        size="small"
        sx={{ maxWidth: 320 }}
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

      {!periodFilter && (
        <Alert severity="info">Selecciona un período electoral para ver o crear sus centros de servicio.</Alert>
      )}

      <Collapse in={centrosQuery.isError}>
        <Alert severity="error">{getApiErrorMessage(centrosQuery.error, "No se pudo cargar el catálogo.")}</Alert>
      </Collapse>

      <Paper variant="outlined" sx={{ height: 520 }}>
        <DataGrid
          rows={centrosQuery.data ?? []}
          columns={columns}
          loading={centrosQuery.isLoading}
          disableRowSelectionOnClick
          density="comfortable"
          initialState={{
            pagination: { paginationModel: { pageSize: 10 } },
            sorting: { sortModel: [{ field: "name", sort: "asc" }] },
          }}
          pageSizeOptions={[10, 25, 50]}
          sx={{ border: "none" }}
        />
      </Paper>

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
