import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Chip, Collapse, IconButton, InputAdornment, Link, MenuItem, Stack, TextField, Tooltip } from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import dayjs from "dayjs";
import AddIcon from "@mui/icons-material/AddRounded";
import EditIcon from "@mui/icons-material/EditOutlined";
import KeyIcon from "@mui/icons-material/VpnKeyOutlined";
import PersonIcon from "@mui/icons-material/PersonOutlineRounded";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import ToggleOnIcon from "@mui/icons-material/ToggleOnOutlined";
import ToggleOffIcon from "@mui/icons-material/ToggleOffOutlined";
import UploadFileIcon from "@mui/icons-material/UploadFileOutlined";
import CloseIcon from "@mui/icons-material/CloseRounded";
import SearchIcon from "@mui/icons-material/SearchRounded";
import WarningAmberIcon from "@mui/icons-material/WarningAmberOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import { temporaryDelegateApi } from "@/api/electoralApi";
import { reportesApi } from "@/api/reportesApi";
import { PageHeader } from "@/components/ui/PageHeader";
import { Callout } from "@/components/ui/Callout";
import { DataTable } from "@/components/ui/DataTable";
import { FloatingToolbar } from "@/components/ui/FloatingToolbar";
import { getApiErrorMessage, getBlobApiErrorMessage } from "@/utils/apiError";
import { downloadBlob } from "@/utils/downloadBlob";
import { useActiveElectoralPeriod } from "@/hooks/useActiveElectoralPeriod";
import { useModulos } from "@/hooks/useModulos";
import { BulkImportDialog } from "@/components/BulkImportDialog";
import { UserAvatar } from "@/components/UserAvatar";
import { useToast } from "@/hooks/useToast";
import { ToastSnackbar } from "@/components/ToastSnackbar";
import type { TemporaryDelegateDto } from "@/types/electoral";
import { DelegadoTemporalFormDialog } from "./DelegadoTemporalFormDialog";
import { ResetTemporaryDelegatePasswordDialog } from "./ResetTemporaryDelegatePasswordDialog";
import { DelegadoTemporalPerfilDrawer } from "./DelegadoTemporalPerfilDrawer";

type DialogState =
  | { type: "closed" }
  | { type: "create" }
  | { type: "edit"; delegado: TemporaryDelegateDto }
  | { type: "profile"; delegado: TemporaryDelegateDto }
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
  const { isElectionsEnabled } = useModulos();

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
        (d.email ? normalize(d.email).includes(needle) : false) ||
        (d.phone ? d.phone.includes(needle) : false)
    );
  }, [delegadosQuery.data, searchFilter]);

  const toggleActiveMutation = useMutation({
    mutationFn: (target: TemporaryDelegateDto) =>
      temporaryDelegateApi.updateDelegadoTemporal(target.id, {
        fullName: target.fullName,
        dui: target.dui,
        email: target.email ?? undefined,
        // Se reenvia tal cual: el PUT reemplaza el registro completo y omitirlo lo borraria.
        phone: target.phone ?? undefined,
        electoralPeriodId: target.electoralPeriodId,
        active: !target.active,
        politicalPartyId: target.politicalPartyId ?? undefined,
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
            name={params.row.fullName}
            fetchPhoto={temporaryDelegateApi.getFotoPerfil}
            cacheNamespace="foto-perfil-delegado-temporal"
          />
        ),
      },
      { field: "username", headerName: "Usuario", flex: 1, minWidth: 130 },
      {
        field: "fullName",
        headerName: "Nombre completo",
        flex: 1.4,
        minWidth: 180,
        renderCell: (params) => (
          <Link
            component="button"
            type="button"
            underline="hover"
            color="text.primary"
            onClick={() => setDialog({ type: "profile", delegado: params.row })}
            sx={{ fontWeight: 500, textAlign: "left", textUnderlineOffset: "3px" }}
          >
            {params.row.fullName}
          </Link>
        ),
      },
      { field: "dui", headerName: "DUI", width: 130 },
      {
        field: "phone",
        headerName: "Teléfono",
        width: 120,
        valueGetter: (_v, row) => row.phone ?? "—",
        cellClassName: "tabular-nums",
      },
      {
        field: "email",
        headerName: "Correo",
        flex: 1.2,
        minWidth: 180,
        valueGetter: (_v, row) => row.email ?? "—",
      },
      { field: "electoralPeriodName", headerName: "Período", flex: 1, minWidth: 180 },
      {
        field: "politicalPartyName",
        headerName: "Partido político",
        width: 200,
        sortable: false,
        renderCell: (params) => {
          if (params.row.politicalPartyId) return <span>{params.row.politicalPartyName}</span>;
          return (
            <Tooltip title="Delegado temporal sin partido político asignado. Edítalo para completarlo.">
              <Chip
                size="small"
                label="Falta partido"
                color="warning"
                variant="outlined"
                icon={<WarningAmberIcon fontSize="small" />}
              />
            </Tooltip>
          );
        },
      },
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
        width: 165,
        sortable: false,
        filterable: false,
        renderCell: (params) => {
          const target = params.row;
          const missingParty = !target.politicalPartyId;
          return (
            <Stack direction="row" spacing={0.5}>
              <Tooltip title="Ver perfil">
                <IconButton size="small" onClick={() => setDialog({ type: "profile", delegado: target })}>
                  <PersonIcon fontSize="small" />
                </IconButton>
              </Tooltip>
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
              <Tooltip
                title={
                  missingParty
                    ? "Este delegado no tiene partido político asignado. Edítalo primero para poder cambiar su estado."
                    : target.active
                      ? "Desactivar"
                      : "Activar"
                }
              >
                <span>
                  <IconButton
                    size="small"
                    disabled={missingParty || toggleActiveMutation.isPending}
                    onClick={() => toggleActiveMutation.mutate(target)}
                  >
                    {target.active ? (
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

  // Reporte de fiscalizacion de duicentros por delegado temporal (historico,
  // sin rango de fechas: para acotar por fechas esta la pantalla de Reportes).
  // El backend lo niega con 403 MODULE_DISABLED si Elecciones esta apagado,
  // por eso el boton se oculta en ese caso.
  const reporteMutation = useMutation({
    mutationFn: async () => {
      try {
        const { blob, filename } = await reportesApi.getReporteDelegadosTemporales(
          {},
          periodFilter ? Number(periodFilter) : undefined
        );
        downloadBlob(blob, filename);
      } catch (error) {
        throw new Error(await getBlobApiErrorMessage(error, "No se pudo generar el reporte de delegados temporales."));
      }
    },
    onSuccess: () => showToast("success", "Reporte descargado."),
    onError: (error) =>
      showToast("error", error instanceof Error ? error.message : "No se pudo generar el reporte."),
  });

  const canBulkImport = !!periodFilter;

  return (
    <Stack spacing={{ xs: 2, md: 2.5 }} sx={{ flexShrink: 0, pb: 2 }}>
      <PageHeader
        title="Delegados temporales"
        subtitle="Personas contratadas para un período electoral. No existe borrado: para dar de baja a un delegado, desactívalo."
        actions={
          <>
            {isElectionsEnabled && (
              <Tooltip title="Actas fiscalizadas y producción por delegado temporal, del período elegido en el filtro">
                <span>
                  <Button
                    variant="outlined"
                    startIcon={<PictureAsPdfOutlinedIcon />}
                    disabled={reporteMutation.isPending}
                    onClick={() => reporteMutation.mutate()}
                  >
                    {reporteMutation.isPending ? "Generando…" : "Reporte PDF"}
                  </Button>
                </span>
              </Tooltip>
            )}
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
            placeholder="DUI, teléfono, correo, usuario o nombre"
            sx={{ minWidth: 260 }}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18 }} />
                </InputAdornment>
              ),
              endAdornment: searchInput ? (
                <IconButton size="small" onClick={() => setSearchInput("")} edge="end">
                  <CloseIcon fontSize="small" />
                </IconButton>
              ) : undefined,
            }}
          />
        </Stack>
      </FloatingToolbar>

      <Collapse in={delegadosQuery.isError}>
        <Callout tone="error" title="No se pudo cargar el listado de delegados">
          {getApiErrorMessage(delegadosQuery.error, "Revisa tu conexión e inténtalo de nuevo.")}
        </Callout>
      </Collapse>

      <DataTable
          rows={filteredDelegados}
          columns={columns}
          loading={delegadosQuery.isLoading}
          initialState={{
            pagination: { paginationModel: { pageSize: 10 } },
            sorting: { sortModel: [{ field: "fullName", sort: "asc" }] },
          }}
          pageSizeOptions={[10, 25, 50]}
          empty={
            searchFilter
              ? { title: "Ningún delegado coincide", hint: "Prueba con otra parte del nombre, el DUI o el teléfono." }
              : { title: "Ningún delegado temporal", hint: "Usa «Nuevo delegado» o la carga masiva para agregar el primero." }
          }
          sx={{ "& .tabular-nums": { fontVariantNumeric: "tabular-nums" } }}
        />

      <DelegadoTemporalPerfilDrawer
        delegado={dialog.type === "profile" ? dialog.delegado : null}
        onClose={() => setDialog({ type: "closed" })}
        onEdit={(delegado) => setDialog({ type: "edit", delegado })}
      />

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
          helperText='Todas las filas del archivo entran al período electoral seleccionado en el filtro de arriba. Si dejas la columna de usuario vacía, se deriva del DUI; la contraseña siempre se genera y aparece en el reporte — cópiala ahí mismo, no se vuelve a mostrar. La columna de teléfono (al final) es opcional, formato 1234-5678.'
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
