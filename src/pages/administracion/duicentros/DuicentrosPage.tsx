import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Chip, Collapse, IconButton, MenuItem, Stack, TextField, Tooltip } from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/AddRounded";
import EditIcon from "@mui/icons-material/EditOutlined";
import ToggleOnIcon from "@mui/icons-material/ToggleOnOutlined";
import ToggleOffIcon from "@mui/icons-material/ToggleOffOutlined";
import UploadFileIcon from "@mui/icons-material/UploadFileOutlined";
import { catalogApi } from "@/api/catalogApi";
import { PageHeader } from "@/components/ui/PageHeader";
import { Callout } from "@/components/ui/Callout";
import { DataTable } from "@/components/ui/DataTable";
import { FloatingToolbar, toolbarFieldSx } from "@/components/ui/FloatingToolbar";
import { getApiErrorMessage } from "@/utils/apiError";
import { BulkImportDialog } from "@/components/BulkImportDialog";
import type { DuicentroDto } from "@/types/catalog";
import { DuicentroFormDialog } from "./DuicentroFormDialog";
import { useToast } from "@/hooks/useToast";
import { ToastSnackbar } from "@/components/ToastSnackbar";

type DialogState = { type: "closed" } | { type: "create" } | { type: "edit"; item: DuicentroDto };

export function DuicentrosPage() {
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<DialogState>({ type: "closed" });
  const [departmentFilter, setDepartmentFilter] = useState<number | "">("");
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const { toast, showToast, closeToast } = useToast();

  const departamentosQuery = useQuery({
    queryKey: ["departamentos", "activos"],
    queryFn: catalogApi.getDepartamentos,
  });

  const duicentrosQuery = useQuery({
    queryKey: ["duicentros", departmentFilter || null],
    queryFn: () => catalogApi.getDuicentros(departmentFilter ? Number(departmentFilter) : undefined),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (target: DuicentroDto) =>
      catalogApi.updateDuicentro(target.id, {
        code: target.code,
        name: target.name,
        departmentId: target.departmentId,
        address: target.address ?? undefined,
        active: !target.active,
      }),
    onSuccess: (_data, target) => {
      queryClient.invalidateQueries({ queryKey: ["duicentros"] });
      showToast("success", target.active ? `"${target.name}" desactivado.` : `"${target.name}" activado.`);
    },
    onError: (error) => showToast("error", getApiErrorMessage(error, "No se pudo cambiar el estado.")),
  });

  const columns: GridColDef<DuicentroDto>[] = useMemo(
    () => [
      { field: "code", headerName: "Código", cellClassName: "cell-code", width: 110 },
      { field: "name", headerName: "Nombre", cellClassName: "cell-strong", flex: 1, minWidth: 200 },
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
        title="Duicentros"
        subtitle="Sedes donde se emiten DUI, asociadas a un departamento."
        actions={
          <>
            <Button variant="outlined" startIcon={<UploadFileIcon />} onClick={() => setBulkImportOpen(true)}>
              Carga masiva
            </Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialog({ type: "create" })}>
              Nuevo duicentro
            </Button>
          </>
        }
      />

      <FloatingToolbar>
        <TextField
          select
          size="small"
          aria-label="Filtrar por departamento"
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value === "" ? "" : Number(e.target.value))}
          SelectProps={{ displayEmpty: true }}
          sx={{ minWidth: 240, ...toolbarFieldSx }}
        >
          <MenuItem value="">Todos los departamentos</MenuItem>
          {(departamentosQuery.data ?? []).map((dep) => (
            <MenuItem key={dep.id} value={dep.id}>
              {dep.name}
            </MenuItem>
          ))}
        </TextField>
      </FloatingToolbar>

      <Collapse in={duicentrosQuery.isError}>
        <Callout tone="error" title="No se pudo cargar el catálogo">
          {getApiErrorMessage(duicentrosQuery.error, "Revisa tu conexión e inténtalo de nuevo.")}
        </Callout>
      </Collapse>

      <DataTable
          rows={duicentrosQuery.data ?? []}
          columns={columns}
          loading={duicentrosQuery.isLoading}
          initialState={{
            pagination: { paginationModel: { pageSize: 10 } },
            sorting: { sortModel: [{ field: "name", sort: "asc" }] },
          }}
          pageSizeOptions={[10, 25, 50]}
          empty={{ title: "Ningún duicentro", hint: "Usa el botón de arriba para agregar el primero." }}
        />

      <DuicentroFormDialog
        open={dialog.type === "create" || dialog.type === "edit"}
        duicentro={dialog.type === "edit" ? dialog.item : null}
        onClose={() => setDialog({ type: "closed" })}
      />

      <BulkImportDialog
        open={bulkImportOpen}
        title="Carga masiva de duicentros"
        helperText='La columna "departamento_codigo" referencia el departamento por código, no por id. Si el código no existe, esa fila queda en error.'
        templateFilename="plantilla-duicentros.xlsx"
        onDownloadTemplate={catalogApi.descargarPlantillaDuicentros}
        onUpload={catalogApi.cargaMasivaDuicentros}
        onClose={() => setBulkImportOpen(false)}
        onImported={() => queryClient.invalidateQueries({ queryKey: ["duicentros"] })}
      />

      <ToastSnackbar toast={toast} onClose={closeToast} />
    </Stack>
  );
}
