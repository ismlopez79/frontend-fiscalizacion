import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Box, Button, Chip, Collapse, IconButton, Paper, Stack, Tooltip, Typography } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import type { GridColDef } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/AddRounded";
import EditIcon from "@mui/icons-material/EditOutlined";
import ToggleOnIcon from "@mui/icons-material/ToggleOnOutlined";
import ToggleOffIcon from "@mui/icons-material/ToggleOffOutlined";
import { catalogApi } from "@/api/catalogApi";
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
      { field: "code", headerName: "Código", width: 160 },
      { field: "name", headerName: "Nombre", flex: 1, minWidth: 180 },
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
    <Stack spacing={2.5}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" rowGap={1}>
        <Box>
          <Typography variant="h3">Categorías de producción</Typography>
          <Typography variant="body2" color="text.secondary">
            Catálogo configurable usado al registrar producciones dentro de un acta (Primera vez,
            Renovaciones, PVNUI, etc.). Desactivar no borra el histórico.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialog({ type: "create" })}>
          Nueva categoría
        </Button>
      </Stack>

      <Collapse in={query.isError}>
        <Alert severity="error">{getApiErrorMessage(query.error, "No se pudo cargar el catálogo.")}</Alert>
      </Collapse>

      <Paper variant="outlined" sx={{ height: 520 }}>
        <DataGrid
          rows={query.data ?? []}
          columns={columns}
          loading={query.isLoading}
          disableRowSelectionOnClick
          density="comfortable"
          initialState={{
            pagination: { paginationModel: { pageSize: 10 } },
            sorting: { sortModel: [{ field: "displayOrder", sort: "asc" }] },
          }}
          pageSizeOptions={[10, 25, 50]}
          sx={{ border: "none" }}
        />
      </Paper>

      <CategoriaFormDialog
        open={dialog.type === "create" || dialog.type === "edit"}
        categoria={dialog.type === "edit" ? dialog.item : null}
        onClose={() => setDialog({ type: "closed" })}
      />

      <ToastSnackbar toast={toast} onClose={closeToast} />
    </Stack>
  );
}
