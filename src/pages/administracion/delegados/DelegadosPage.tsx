import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import type { GridColDef } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/AddRounded";
import EditIcon from "@mui/icons-material/EditOutlined";
import ToggleOnIcon from "@mui/icons-material/ToggleOnOutlined";
import ToggleOffIcon from "@mui/icons-material/ToggleOffOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { catalogApi } from "@/api/catalogApi";
import { getApiErrorMessage } from "@/utils/apiError";
import { DELEGATE_TYPES, DELEGATE_TYPE_LABELS } from "@/types/catalog";
import type { DelegateDto, DelegateType } from "@/types/catalog";
import { DelegadoFormDialog } from "./DelegadoFormDialog";
import { useToast } from "@/hooks/useToast";
import { ToastSnackbar } from "@/components/ToastSnackbar";

type DialogState = { type: "closed" } | { type: "create" } | { type: "edit"; item: DelegateDto };

export function DelegadosPage() {
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<DialogState>({ type: "closed" });
  const [typeFilter, setTypeFilter] = useState<DelegateType | "">("");
  const { toast, showToast, closeToast } = useToast();

  const delegadosQuery = useQuery({
    queryKey: ["delegados", typeFilter || null],
    queryFn: () => catalogApi.getDelegados(typeFilter || undefined),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (target: DelegateDto) =>
      catalogApi.updateDelegado(target.id, {
        firstName: target.firstName,
        lastName: target.lastName,
        internalCode: target.internalCode ?? undefined,
        // dui es requerido desde la migracion V15. El toggle solo se
        // habilita en la UI cuando target.dui ya existe (ver columna
        // "actions"): si es un registro legado sin DUI, hay que editarlo
        // completo primero para capturarlo.
        dui: target.dui ?? "",
        type: target.type,
        active: !target.active,
      }),
    onSuccess: (_data, target) => {
      queryClient.invalidateQueries({ queryKey: ["delegados"] });
      showToast(
        "success",
        target.active
          ? `"${target.firstName} ${target.lastName}" desactivado.`
          : `"${target.firstName} ${target.lastName}" activado.`
      );
    },
    onError: (error) => showToast("error", getApiErrorMessage(error, "No se pudo cambiar el estado.")),
  });

  const columns: GridColDef<DelegateDto>[] = useMemo(
    () => [
      { field: "firstName", headerName: "Nombre", flex: 1, minWidth: 140 },
      { field: "lastName", headerName: "Apellido", flex: 1, minWidth: 140 },
      {
        field: "internalCode",
        headerName: "Código interno",
        width: 140,
        valueGetter: (_v, row) => row.internalCode ?? "—",
      },
      {
        field: "dui",
        headerName: "DUI",
        width: 130,
        valueGetter: (_v, row) => row.dui ?? "—",
      },
      {
        field: "type",
        headerName: "Tipo",
        width: 170,
        valueGetter: (_v, row) => DELEGATE_TYPE_LABELS[row.type] ?? row.type,
      },
      {
        field: "linkedUsername",
        headerName: "Vínculo",
        width: 150,
        sortable: false,
        renderCell: (params) =>
          params.row.linkedUsername ? (
            <Tooltip
              title={`Vinculado al usuario "${params.row.linkedUsername}". Se sincroniza automáticamente desde Usuarios — edítalo ahí, no aquí.`}
            >
              <Chip
                size="small"
                icon={<LockOutlinedIcon fontSize="small" />}
                label={params.row.linkedUsername}
                variant="outlined"
                color="info"
              />
            </Tooltip>
          ) : (
            <span>—</span>
          ),
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
        renderCell: (params) => {
          const isLinked = !!params.row.linkedUsername;
          const missingDui = !params.row.dui;
          return (
            <Stack direction="row" spacing={0.5}>
              <Tooltip
                title={
                  isLinked
                    ? "Vinculado a un usuario: edítalo desde Usuarios, no aquí."
                    : "Editar"
                }
              >
                <span>
                  <IconButton
                    size="small"
                    disabled={isLinked}
                    onClick={() => setDialog({ type: "edit", item: params.row })}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip
                title={
                  isLinked
                    ? "Vinculado a un usuario: su estado se sincroniza desde Usuarios."
                    : missingDui
                      ? "Este delegado no tiene DUI capturado. Edítalo primero para poder cambiar su estado."
                      : params.row.active
                        ? "Desactivar"
                        : "Activar"
                }
              >
                <span>
                  <IconButton
                    size="small"
                    disabled={isLinked || missingDui || toggleActiveMutation.isPending}
                    onClick={() => toggleActiveMutation.mutate(params.row)}
                  >
                    {params.row.active ? (
                      <ToggleOnIcon fontSize="small" color="success" />
                    ) : (
                      <ToggleOffIcon fontSize="small" />
                    )}
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          );
        },
      },
    ],
    [toggleActiveMutation]
  );

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" rowGap={1}>
        <Box>
          <Typography variant="h3">Delegados</Typography>
          <Typography variant="body2" color="text.secondary">
            Personas que firman el acta: delegado JVE, delegado RNPN o jefe de duicentro.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialog({ type: "create" })}>
          Nuevo delegado
        </Button>
      </Stack>

      <TextField
        select
        label="Filtrar por tipo"
        size="small"
        sx={{ maxWidth: 260 }}
        value={typeFilter}
        onChange={(e) => setTypeFilter(e.target.value as DelegateType | "")}
      >
        <MenuItem value="">Todos los tipos</MenuItem>
        {DELEGATE_TYPES.map((type) => (
          <MenuItem key={type} value={type}>
            {DELEGATE_TYPE_LABELS[type]}
          </MenuItem>
        ))}
      </TextField>

      <Collapse in={delegadosQuery.isError}>
        <Alert severity="error">{getApiErrorMessage(delegadosQuery.error, "No se pudo cargar el catálogo.")}</Alert>
      </Collapse>

      <Paper variant="outlined" sx={{ height: 520 }}>
        <DataGrid
          rows={delegadosQuery.data ?? []}
          columns={columns}
          loading={delegadosQuery.isLoading}
          disableRowSelectionOnClick
          density="comfortable"
          initialState={{
            pagination: { paginationModel: { pageSize: 10 } },
            sorting: { sortModel: [{ field: "lastName", sort: "asc" }] },
          }}
          pageSizeOptions={[10, 25, 50]}
          sx={{ border: "none" }}
        />
      </Paper>

      <DelegadoFormDialog
        open={dialog.type === "create" || dialog.type === "edit"}
        delegado={dialog.type === "edit" ? dialog.item : null}
        onClose={() => setDialog({ type: "closed" })}
      />

      <ToastSnackbar toast={toast} onClose={closeToast} />
    </Stack>
  );
}
