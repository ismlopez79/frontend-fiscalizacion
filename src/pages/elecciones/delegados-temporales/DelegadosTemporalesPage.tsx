import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Box, Button, Chip, Collapse, IconButton, MenuItem, Paper, Stack, TextField, Tooltip, Typography } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import type { GridColDef } from "@mui/x-data-grid";
import dayjs from "dayjs";
import AddIcon from "@mui/icons-material/AddRounded";
import EditIcon from "@mui/icons-material/EditOutlined";
import KeyIcon from "@mui/icons-material/VpnKeyOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import ToggleOnIcon from "@mui/icons-material/ToggleOnOutlined";
import ToggleOffIcon from "@mui/icons-material/ToggleOffOutlined";
import UploadFileIcon from "@mui/icons-material/UploadFileOutlined";
import CloseIcon from "@mui/icons-material/CloseRounded";
import { temporaryDelegateApi } from "@/api/electoralApi";
import { getApiErrorMessage } from "@/utils/apiError";
import { useActiveElectoralPeriod } from "@/hooks/useActiveElectoralPeriod";
import { BulkImportDialog } from "@/components/BulkImportDialog";
import { UserAvatar } from "@/components/UserAvatar";
import { useToast } from "@/hooks/useToast";
import { ToastSnackbar } from "@/components/ToastSnackbar";
import type { TemporaryDelegateDto } from "@/types/electoral";
import { DelegadoTemporalFormDialog } from "./DelegadoTemporalFormDialog";
import { ResetTemporaryDelegatePasswordDialog } from "./ResetTemporaryDelegatePasswordDialog";

type DialogState =
  | { type: "closed" }
  | { type: "create" }
  | { type: "edit"; delegado: TemporaryDelegateDto }
  | { type: "reset-password"; delegado: TemporaryDelegateDto };

/** Sin acentos y en minusculas, para que "Perez" encuentre "Pérez" y viceversa. */
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function DelegadosTemporalesPage() {
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<DialogState>({ type: "closed" });
  const [periodFilter, setPeriodFilter] = useState<number | "">("");
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const { toast, showToast, closeToast } = useToast();

  const { data: periodos, activePeriod } = useActiveElectoralPeriod();

  // Apenas se conoce el periodo activo, se usa como filtro por defecto (una sola vez).
  useEffect(() => {
    if (periodFilter === "" && activePeriod) setPeriodFilter(activePeriod.id);
  }, [activePeriod, periodFilter]);

  // Busqueda con debounce: evita filtrar en cada tecla. El backend no expone
  // busqueda por texto en /delegados-temporales (solo electoralPeriodId), asi
  // que esto filtra en el cliente sobre la lista ya cargada del periodo.
  useEffect(() => {
    const timeout = setTimeout(() => setSearchFilter(searchInput.trim()), 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const delegadosQuery = useQuery({
    queryKey: ["delegados-temporales", periodFilter || null],
    queryFn: () => temporaryDelegateApi.getDelegadosTemporales(periodFilter ? Number(periodFilter) : undefined),
  });

  const filteredDelegados = useMemo(() => {
    const rows = delegadosQuery.data ?? [];
    if (!searchFilter) return rows;
    const needle = normalize(searchFilter);
    return rows.filter(
      (d) =>
        normalize(d.username).includes(needle) ||
        normalize(d.fullName).includes(needle) ||
        normalize(d.dui).includes(needle) ||
        (d.email ? normalize(d.email).includes(needle) : false)
    );
  }, [delegadosQuery.data, searchFilter]);

  const toggleActiveMutation = useMutation({
    mutationFn: (target: TemporaryDelegateDto) =>
      temporaryDelegateApi.updateDelegadoTemporal(target.id, {
        fullName: target.fullName,
        dui: target.dui,
        email: target.email ?? undefined,
        electoralPeriodId: target.electoralPeriodId,
        active: !target.active,
      }),
    onSuccess: (_data, target) => {
      queryClient.invalidateQueries({ queryKey: ["delegados-temporales"] });
      showToast("success", target.active ? `"${target.fullName}" desactivado.` : `"${target.fullName}" activado.`);
    },
    onError: (error) => showToast("error", getApiErrorMessage(error, "No se pudo cambiar el estado.")),
  });

  const columns: GridColDef<TemporaryDelegateDto>[] = useMemo(
    () => [
      {
        field: "profilePhotoUrl",
        headerName: "",
        width: 56,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <UserAvatar
            userId={params.row.id}
            hasPhoto={!!params.row.profilePhotoUrl}
            fallbackText={params.row.fullName.charAt(0).toUpperCase()}
            fetchPhoto={temporaryDelegateApi.getFotoPerfil}
            cacheNamespace="foto-perfil-delegado-temporal"
          />
        ),
      },
      { field: "username", headerName: "Usuario", flex: 1, minWidth: 130 },
      { field: "fullName", headerName: "Nombre completo", flex: 1.4, minWidth: 180 },
      { field: "dui", headerName: "DUI", width: 130 },
      {
        field: "email",
        headerName: "Correo",
        flex: 1.2,
        minWidth: 180,
        valueGetter: (_v, row) => row.email ?? "—",
      },
      { field: "electoralPeriodName", headerName: "Período", flex: 1, minWidth: 180 },
      {
        field: "estadoCuenta",
        headerName: "Estado de acceso",
        flex: 1,
        minWidth: 200,
        sortable: false,
        filterable: false,
        renderCell: (params) => {
          const target = params.row;
          if (!target.locked && !target.primerIngreso) return <span>—</span>;
          return (
            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ py: 1, flexWrap: "wrap", rowGap: 0.5 }}>
              {target.locked && (
                <>
                  <Chip size="small" label="Bloqueada" color="error" icon={<LockOutlinedIcon />} />
                  <Tooltip title="Restablecer contraseña para desbloquear">
                    <IconButton size="small" onClick={() => setDialog({ type: "reset-password", delegado: target })}>
                      <KeyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </>
              )}
              {target.primerIngreso && (
                <Chip size="small" label="Pendiente primer ingreso" color="warning" variant="outlined" />
              )}
            </Stack>
          );
        },
      },
      {
        field: "active",
        headerName: "Estado",
        width: 120,
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
        field: "updatedAt",
        headerName: "Actualizado",
        width: 160,
        valueGetter: (_v, row) => dayjs(row.updatedAt).format("DD/MM/YYYY HH:mm"),
      },
      {
        field: "actions",
        headerName: "Acciones",
        width: 130,
        sortable: false,
        filterable: false,
        renderCell: (params) => {
          const target = params.row;
          return (
            <Stack direction="row" spacing={0.5}>
              <Tooltip title="Editar">
                <IconButton size="small" onClick={() => setDialog({ type: "edit", delegado: target })}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Restablecer contraseña">
                <IconButton size="small" onClick={() => setDialog({ type: "reset-password", delegado: target })}>
                  <KeyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title={target.active ? "Desactivar" : "Activar"}>
                <IconButton
                  size="small"
                  disabled={toggleActiveMutation.isPending}
                  onClick={() => toggleActiveMutation.mutate(target)}
                >
                  {target.active ? (
                    <ToggleOnIcon fontSize="small" color="success" />
                  ) : (
                    <ToggleOffIcon fontSize="small" />
                  )}
                </IconButton>
              </Tooltip>
            </Stack>
          );
        },
      },
    ],
    [toggleActiveMutation]
  );

  const canBulkImport = !!periodFilter;

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" rowGap={1}>
        <Box>
          <Typography variant="h3">Delegados temporales</Typography>
          <Typography variant="body2" color="text.secondary">
            Personas contratadas para un período electoral. No existe borrado: para dar de baja a
            un delegado, desactívalo.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Tooltip title={canBulkImport ? "" : "Selecciona un período electoral para la carga masiva"}>
            <span>
              <Button
                variant="outlined"
                startIcon={<UploadFileIcon />}
                disabled={!canBulkImport}
                onClick={() => setBulkImportOpen(true)}
              >
                Carga masiva
              </Button>
            </span>
          </Tooltip>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialog({ type: "create" })}>
            Nuevo delegado
          </Button>
        </Stack>
      </Stack>

      <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" rowGap={1}>
        <TextField
          select
          label="Período electoral"
          size="small"
          sx={{ minWidth: 260 }}
          value={periodFilter}
          onChange={(e) => setPeriodFilter(e.target.value === "" ? "" : Number(e.target.value))}
        >
          <MenuItem value="">Todos los períodos</MenuItem>
          {(periodos ?? []).map((p) => (
            <MenuItem key={p.id} value={p.id}>
              {p.name} {p.active ? "· activo" : ""}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Buscar"
          size="small"
          placeholder="DUI, correo, usuario o nombre"
          sx={{ minWidth: 260 }}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          InputProps={{
            endAdornment: searchInput ? (
              <IconButton size="small" onClick={() => setSearchInput("")} edge="end">
                <CloseIcon fontSize="small" />
              </IconButton>
            ) : undefined,
          }}
        />
      </Stack>

      <Collapse in={delegadosQuery.isError}>
        <Alert severity="error">
          {getApiErrorMessage(delegadosQuery.error, "No se pudo cargar el listado de delegados.")}
        </Alert>
      </Collapse>

      <Paper variant="outlined" sx={{ height: 560 }}>
        <DataGrid
          rows={filteredDelegados}
          columns={columns}
          loading={delegadosQuery.isLoading}
          disableRowSelectionOnClick
          density="comfortable"
          initialState={{
            pagination: { paginationModel: { pageSize: 10 } },
            sorting: { sortModel: [{ field: "fullName", sort: "asc" }] },
          }}
          pageSizeOptions={[10, 25, 50]}
          sx={{ border: "none" }}
        />
      </Paper>

      <DelegadoTemporalFormDialog
        open={dialog.type === "create" || dialog.type === "edit"}
        delegado={dialog.type === "edit" ? dialog.delegado : null}
        periodos={periodos ?? []}
        defaultElectoralPeriodId={periodFilter || activePeriod?.id}
        onClose={() => setDialog({ type: "closed" })}
        onCreated={(delegado) => setDialog({ type: "reset-password", delegado })}
      />

      <ResetTemporaryDelegatePasswordDialog
        open={dialog.type === "reset-password"}
        delegado={dialog.type === "reset-password" ? dialog.delegado : null}
        onClose={() => setDialog({ type: "closed" })}
      />

      {canBulkImport && (
        <BulkImportDialog
          open={bulkImportOpen}
          title="Carga masiva de delegados temporales"
          helperText='Todas las filas del archivo entran al período electoral seleccionado en el filtro de arriba. Si dejas la columna de usuario vacía, se deriva del DUI; la contraseña siempre se genera y aparece en el reporte — cópiala ahí mismo, no se vuelve a mostrar.'
          templateFilename="plantilla-delegados-temporales.xlsx"
          onDownloadTemplate={temporaryDelegateApi.descargarPlantilla}
          onUpload={(file) => temporaryDelegateApi.cargaMasiva(file, Number(periodFilter))}
          onClose={() => setBulkImportOpen(false)}
          onImported={() => queryClient.invalidateQueries({ queryKey: ["delegados-temporales"] })}
        />
      )}

      <ToastSnackbar toast={toast} onClose={closeToast} />
    </Stack>
  );
}
