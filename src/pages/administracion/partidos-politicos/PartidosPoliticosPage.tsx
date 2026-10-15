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
import type { PoliticalPartyDto } from "@/types/catalog";
import { PartidoPoliticoFormDialog } from "./PartidoPoliticoFormDialog";
import { useToast } from "@/hooks/useToast";
import { ToastSnackbar } from "@/components/ToastSnackbar";

type DialogState = { type: "closed" } | { type: "create" } | { type: "edit"; item: PoliticalPartyDto };

export function PartidosPoliticosPage() {
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<DialogState>({ type: "closed" });
  const { toast, showToast, closeToast } = useToast();

  const query = useQuery({
    queryKey: ["partidos-politicos"],
    queryFn: catalogApi.getPartidosPoliticosTodos,
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (target: PoliticalPartyDto) =>
      catalogApi.updatePartidoPolitico(target.id, {
        code: target.code,
        name: target.name,
        active: !target.active,
      }),
    onSuccess: (_data, target) => {
      queryClient.invalidateQueries({ queryKey: ["partidos-politicos"] });
      showToast("success", target.active ? `"${target.name}" desactivado.` : `"${target.name}" activado.`);
    },
    onError: (error) => showToast("error", getApiErrorMessage(error, "No se pudo cambiar el estado.")),
  });

  const columns: GridColDef<PoliticalPartyDto>[] = useMemo(
    () => [
      { field: "code", headerName: "Código", cellClassName: "cell-code", width: 140 },
      { field: "name", headerName: "Nombre", cellClassName: "cell-strong", flex: 1, minWidth: 220 },
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
        title="Partidos políticos"
        subtitle="Catálogo de partidos políticos. Lo usan los delegados JVE, los delegados temporales y los usuarios digitadores para identificar a nombre de qué partido fiscalizan. Desactivar no borra el histórico ya registrado con ese partido."
        actions={
          <>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialog({ type: "create" })}>
              Nuevo partido
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
          empty={{ title: "Aún no hay partidos políticos", hint: "Usa el botón de arriba para agregar el primero." }}
        />

      <PartidoPoliticoFormDialog
        open={dialog.type === "create" || dialog.type === "edit"}
        partido={dialog.type === "edit" ? dialog.item : null}
        onClose={() => setDialog({ type: "closed" })}
      />

      <ToastSnackbar toast={toast} onClose={closeToast} />
    </Stack>
  );
}
