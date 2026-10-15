import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Chip, Collapse, IconButton, Stack, Tooltip } from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/AddRounded";
import EditIcon from "@mui/icons-material/EditOutlined";
import ToggleOnIcon from "@mui/icons-material/ToggleOnOutlined";
import ToggleOffIcon from "@mui/icons-material/ToggleOffOutlined";
import { catalogApi } from "@/api/catalogApi";
import { PageHeader } from "@/components/ui/PageHeader";
import { Callout } from "@/components/ui/Callout";
import { DataTable } from "@/components/ui/DataTable";
import { getApiErrorMessage } from "@/utils/apiError";
import type { ProductionCategoryDto } from "@/types/catalog";
import { CategoriaFormDialog } from "./CategoriaFormDialog";
import { useToast } from "@/hooks/useToast";
import { ToastSnackbar } from "@/components/ToastSnackbar";

type DialogState = { type: "closed" } | { type: "create" } | { type: "edit"; item: ProductionCategoryDto };

export function CategoriasPage() {
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<DialogState>({ type: "closed" });
  const { toast, showToast, closeToast } = useToast();

  const query = useQuery({
    queryKey: ["categorias"],
    queryFn: catalogApi.getCategorias,
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (target: ProductionCategoryDto) =>
      catalogApi.updateCategoria(target.id, {
        code: target.code,
        name: target.name,
        description: target.description ?? undefined,
        displayOrder: target.displayOrder,
        active: !target.active,
      }),
    onSuccess: (_data, target) => {
      queryClient.invalidateQueries({ queryKey: ["categorias"] });
      showToast("success", target.active ? `"${target.name}" desactivada.` : `"${target.name}" activada.`);
    },
    onError: (error) => showToast("error", getApiErrorMessage(error, "No se pudo cambiar el estado.")),
  });

  const columns: GridColDef<ProductionCategoryDto>[] = useMemo(
    () => [
      { field: "displayOrder", headerName: "Orden", width: 90 },
      { field: "code", headerName: "Código", cellClassName: "cell-code", width: 160 },
      { field: "name", headerName: "Nombre", cellClassName: "cell-strong", flex: 1, minWidth: 180 },
      {
        field: "description",
        headerName: "Descripción",
        flex: 1,
        minWidth: 200,
        valueGetter: (_v, row) => row.description ?? "—",
      },
      {
        field: "active",
        headerName: "Estado",
        width: 130,
        renderCell: (params) => (
          <Chip
            size="small"
            label={params.row.active ? "Activa" : "Inactiva"}
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
        title="Categorías de producción"
        subtitle="Catálogo configurable usado al registrar producciones dentro de un acta (Primera vez, Renovaciones, PVNUI, etc.). Desactivar no borra el histórico."
        actions={
          <>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialog({ type: "create" })}>
              Nueva categoría
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
            sorting: { sortModel: [{ field: "displayOrder", sort: "asc" }] },
          }}
          pageSizeOptions={[10, 25, 50]}
          empty={{ title: "Aún no hay categorías", hint: "Usa el botón de arriba para agregar el primero." }}
        />

      <CategoriaFormDialog
        open={dialog.type === "create" || dialog.type === "edit"}
        categoria={dialog.type === "edit" ? dialog.item : null}
        onClose={() => setDialog({ type: "closed" })}
      />

      <ToastSnackbar toast={toast} onClose={closeToast} />
    </Stack>
  );
}
