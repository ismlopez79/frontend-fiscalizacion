import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Chip, Collapse, IconButton, Stack, Tooltip } from "@mui/material";
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
import { getApiErrorMessage } from "@/utils/apiError";
import { BulkImportDialog } from "@/components/BulkImportDialog";
import type { DepartmentDto } from "@/types/catalog";
import { DepartamentoFormDialog } from "./DepartamentoFormDialog";
import { useToast } from "@/hooks/useToast";
import { ToastSnackbar } from "@/components/ToastSnackbar";

type DialogState = { type: "closed" } | { type: "create" } | { type: "edit"; item: DepartmentDto };

export function DepartamentosPage() {
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<DialogState>({ type: "closed" });
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const { toast, showToast, closeToast } = useToast();

  const query = useQuery({
    queryKey: ["departamentos"],
    queryFn: catalogApi.getDepartamentosTodos,
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (target: DepartmentDto) =>
      catalogApi.updateDepartamento(target.id, {
        code: target.code,
        name: target.name,
        active: !target.active,
      }),
    onSuccess: (_data, target) => {
      queryClient.invalidateQueries({ queryKey: ["departamentos"] });
      showToast("success", target.active ? `"${target.name}" desactivado.` : `"${target.name}" activado.`);
    },
    onError: (error) => showToast("error", getApiErrorMessage(error, "No se pudo cambiar el estado.")),
  });

  const columns: GridColDef<DepartmentDto>[] = useMemo(
    () => [
      { field: "code", headerName: "Código", cellClassName: "cell-code", width: 120 },
      { field: "name", headerName: "Nombre", cellClassName: "cell-strong", flex: 1, minWidth: 200 },
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
        title="Departamentos"
        subtitle="Catálogo de departamentos del país. Desactivar no borra el histórico de actas ya registradas con ese departamento."
        actions={
          <>
            <Button variant="outlined" startIcon={<UploadFileIcon />} onClick={() => setBulkImportOpen(true)}>
              Carga masiva
            </Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialog({ type: "create" })}>
              Nuevo departamento
            </Button>
          </>
        }
      />

      <Collapse in={query.isError}>
        <Callout tone="error" title="No se pudo cargar el catálogo">
          {getApiErrorMessage(query.error, "Revisa tu conexión e inténtalo de nuevo.")}
        </Callout>
      </Collapse>

      <DataTable
          rows={query.data ?? []}
          columns={columns}
          loading={query.isLoading}
          initialState={{
            pagination: { paginationModel: { pageSize: 10 } },
            sorting: { sortModel: [{ field: "name", sort: "asc" }] },
          }}
          pageSizeOptions={[10, 25, 50]}
          empty={{ title: "Aún no hay departamentos", hint: "Usa el botón de arriba para agregar el primero." }}
        />

      <DepartamentoFormDialog
        open={dialog.type === "create" || dialog.type === "edit"}
        departamento={dialog.type === "edit" ? dialog.item : null}
        onClose={() => setDialog({ type: "closed" })}
      />

      <BulkImportDialog
        open={bulkImportOpen}
        title="Carga masiva de departamentos"
        helperText="Cada fila corre de forma independiente: un error o duplicado en una no detiene al resto del archivo."
        templateFilename="plantilla-departamentos.xlsx"
        onDownloadTemplate={catalogApi.descargarPlantillaDepartamentos}
        onUpload={catalogApi.cargaMasivaDepartamentos}
        onClose={() => setBulkImportOpen(false)}
        onImported={() => queryClient.invalidateQueries({ queryKey: ["departamentos"] })}
      />

      <ToastSnackbar toast={toast} onClose={closeToast} />
    </Stack>
  );
}
