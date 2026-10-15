import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Chip, Collapse, IconButton, InputAdornment, Link, Stack, TextField, Tooltip } from "@mui/material";
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
import WarningAmberIcon from "@mui/icons-material/WarningAmberOutlined";
import { userApi, roleApi } from "@/api/userApi";
import { PageHeader } from "@/components/ui/PageHeader";
import { FloatingToolbar, toolbarFieldSx } from "@/components/ui/FloatingToolbar";
import { Callout } from "@/components/ui/Callout";
import { DataTable } from "@/components/ui/DataTable";
import SearchIcon from "@mui/icons-material/SearchRounded";
import CloseIcon from "@mui/icons-material/CloseRounded";
import { getApiErrorMessage } from "@/utils/apiError";
import { useAuth } from "@/hooks/useAuth";
import { BulkImportDialog } from "@/components/BulkImportDialog";
import { UserAvatar } from "@/components/UserAvatar";
import { ADMIN_ROLE_NAME, DIGITADOR_ROLE_NAME } from "@/types/user";
import type { UserDto } from "@/types/user";
import { UserFormDialog } from "./UserFormDialog";
import { ResetPasswordDialog } from "./ResetPasswordDialog";
import { UsuarioPerfilDrawer } from "./UsuarioPerfilDrawer";
import { useToast } from "@/hooks/useToast";
import { ToastSnackbar } from "@/components/ToastSnackbar";

type DialogState =
  | { type: "closed" }
  | { type: "create" }
  | { type: "edit"; user: UserDto }
  | { type: "profile"; user: UserDto }
  | { type: "reset-password"; user: UserDto };

export function UsuariosPage() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<DialogState>({ type: "closed" });
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const { toast, showToast, closeToast } = useToast();

  const usersQuery = useQuery({
    queryKey: ["usuarios"],
    queryFn: userApi.getUsuarios,
  });

  // Busqueda en el cliente (el listado de usuarios llega completo) con debounce, sin acentos.
  const [searchInput, setSearchInput] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  useEffect(() => {
    const timeout = setTimeout(() => setSearchFilter(searchInput.trim()), 250);
    return () => clearTimeout(timeout);
  }, [searchInput]);
  const filteredUsers = useMemo(() => {
    const rows = usersQuery.data ?? [];
    if (!searchFilter) return rows;
    const normalize = (v: string) => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const needle = normalize(searchFilter);
    return rows.filter((u) =>
      [u.username, u.fullName, u.dui, u.email, u.phone].some((v) => !!v && normalize(v).includes(needle))
    );
  }, [usersQuery.data, searchFilter]);

  const rolesQuery = useQuery({
    queryKey: ["roles"],
    queryFn: roleApi.getRoles,
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (target: UserDto) =>
      userApi.updateUsuario(target.id, {
        fullName: target.fullName,
        email: target.email ?? undefined,
        // dui es requerido por el backend desde la migracion V15. Este
        // toggle solo se habilita en la UI cuando target.dui ya existe
        // (ver columna "actions" mas abajo) — si es un registro legado sin
        // DUI, hay que editarlo completo primero para capturarlo.
        dui: target.dui ?? "",
        // Se reenvia tal cual: el PUT reemplaza el registro completo y omitirlo lo borraria.
        phone: target.phone ?? undefined,
        roleIds: target.roleIds,
        active: !target.active,
        delegatePoliticalPartyId: target.linkedDelegatePoliticalPartyId ?? undefined,
      }),
    onSuccess: (_data, target) => {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      showToast(
        "success",
        target.active ? `Usuario "${target.username}" desactivado.` : `Usuario "${target.username}" activado.`
      );
    },
    onError: (error) => showToast("error", getApiErrorMessage(error, "No se pudo cambiar el estado del usuario.")),
  });

  const columns: GridColDef<UserDto>[] = useMemo(
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
            onClick={() => setDialog({ type: "profile", user: params.row })}
            sx={{ fontWeight: 500, textAlign: "left", textUnderlineOffset: "3px" }}
          >
            {params.row.fullName}
          </Link>
        ),
      },
      {
        field: "dui",
        headerName: "DUI",
        width: 130,
        valueGetter: (_value, row) => row.dui ?? "—",
      },
      {
        field: "phone",
        headerName: "Teléfono",
        width: 120,
        valueGetter: (_value, row) => row.phone ?? "—",
        cellClassName: "tabular-nums",
      },
      {
        field: "email",
        headerName: "Correo",
        flex: 1.2,
        minWidth: 180,
        valueGetter: (_value, row) => row.email ?? "—",
      },
      {
        field: "roles",
        headerName: "Roles",
        flex: 1.2,
        minWidth: 180,
        sortable: false,
        renderCell: (params) => (
          <Stack direction="row" spacing={0.5} sx={{ py: 1, flexWrap: "wrap", rowGap: 0.5 }}>
            {params.row.roles.map((role) => (
              <Chip key={role} label={role} size="small" variant="outlined" />
            ))}
          </Stack>
        ),
      },
      {
        field: "linkedDelegateName",
        headerName: "Delegado JVE",
        flex: 1,
        minWidth: 170,
        sortable: false,
        renderCell: (params) => {
          const isDigitador = params.row.roles.includes(DIGITADOR_ROLE_NAME);
          if (!isDigitador) return <span>—</span>;
          if (params.row.linkedDelegateId) {
            return <span>{params.row.linkedDelegateName}</span>;
          }
          return (
            <Tooltip title="Guarda el usuario de nuevo (editar y confirmar) para crear el vínculo automáticamente.">
              <Chip size="small" label="Sin vincular" color="warning" variant="outlined" />
            </Tooltip>
          );
        },
      },
      {
        field: "linkedDelegatePoliticalPartyName",
        headerName: "Partido político",
        flex: 1,
        minWidth: 190,
        sortable: false,
        renderCell: (params) => {
          const isDigitador = params.row.roles.includes(DIGITADOR_ROLE_NAME);
          if (!isDigitador) return <span>—</span>;
          if (params.row.linkedDelegatePoliticalPartyId) {
            return <span>{params.row.linkedDelegatePoliticalPartyName}</span>;
          }
          return (
            <Tooltip title="Delegado JVE vinculado sin partido político asignado. Edítalo para completarlo.">
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
          if (!target.locked && !target.primerIngreso) {
            return <span>—</span>;
          }
          return (
            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ py: 1, flexWrap: "wrap", rowGap: 0.5 }}>
              {target.locked && (
                <>
                  <Chip size="small" label="Bloqueada" color="error" icon={<LockOutlinedIcon />} />
                  <Tooltip title="Restablecer contraseña para desbloquear">
                    <IconButton
                      size="small"
                      onClick={() => setDialog({ type: "reset-password", user: target })}
                    >
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
        valueGetter: (_value, row) => dayjs(row.updatedAt).format("DD/MM/YYYY HH:mm"),
      },
      {
        field: "actions",
        headerName: "Acciones",
        width: 190,
        sortable: false,
        filterable: false,
        renderCell: (params) => {
          const target = params.row;
          const isSelf = target.username === currentUser?.username;
          // El backend rechaza (409) desactivar a un administrador; activarlo si esta permitido.
          const isActiveAdmin = target.active && target.roles.includes(ADMIN_ROLE_NAME);
          const missingDui = !target.dui;
          const missingParty = target.roles.includes(DIGITADOR_ROLE_NAME) && !target.linkedDelegatePoliticalPartyId;
          return (
            <Stack direction="row" spacing={0.5}>
              <Tooltip title="Ver perfil">
                <IconButton size="small" onClick={() => setDialog({ type: "profile", user: target })}>
                  <PersonIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Editar usuario">
                <IconButton size="small" onClick={() => setDialog({ type: "edit", user: target })}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Restablecer contraseña">
                <IconButton
                  size="small"
                  onClick={() => setDialog({ type: "reset-password", user: target })}
                >
                  <KeyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip
                title={
                  isSelf
                    ? "No puedes desactivar tu propia cuenta"
                    : isActiveAdmin
                      ? "Un administrador no se puede desactivar. Primero quítale el rol ADMINISTRADOR."
                      : missingDui
                      ? "Este usuario no tiene DUI capturado. Edítalo primero para poder cambiar su estado."
                      : missingParty
                        ? "Este usuario no tiene partido político asignado a su delegado JVE. Edítalo primero para poder cambiar su estado."
                        : target.active
                          ? "Desactivar usuario"
                          : "Activar usuario"
                }
              >
                <span>
                  <IconButton
                    size="small"
                    disabled={isSelf || isActiveAdmin || missingDui || missingParty || toggleActiveMutation.isPending}
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
    [currentUser?.username, toggleActiveMutation]
  );

  return (
    <Stack spacing={{ xs: 2, md: 2.5 }} sx={{ flexShrink: 0, pb: 2 }}>
      <PageHeader
        title="Usuarios"
        subtitle="Alta, edición y asignación de roles. No existe borrado: para dar de baja a un usuario, desactívalo."
        actions={
          <>
            <Button variant="outlined" startIcon={<UploadFileIcon />} onClick={() => setBulkImportOpen(true)}>
              Carga masiva
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setDialog({ type: "create" })}
            >
              Nuevo usuario
            </Button>
          </>
        }
      />

      <FloatingToolbar>
        <TextField
          size="small"
          placeholder="Buscar por usuario, nombre, DUI, correo o teléfono"
          aria-label="Buscar usuarios"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          sx={{ width: { xs: "100%", sm: 380 }, ...toolbarFieldSx }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 18 }} />
              </InputAdornment>
            ),
            endAdornment: searchInput ? (
              <IconButton size="small" aria-label="Limpiar búsqueda" onClick={() => setSearchInput("")} edge="end">
                <CloseIcon sx={{ fontSize: 16 }} />
              </IconButton>
            ) : undefined,
          }}
        />
      </FloatingToolbar>

      <Collapse in={usersQuery.isError}>
        <Callout tone="error" title="No se pudo cargar el listado de usuarios">
          {getApiErrorMessage(usersQuery.error, "Revisa tu conexión e inténtalo de nuevo.")}
        </Callout>
      </Collapse>

      <DataTable
        rows={filteredUsers}
        columns={columns}
        loading={usersQuery.isLoading}
        initialState={{
          pagination: { paginationModel: { pageSize: 10 } },
          sorting: { sortModel: [{ field: "username", sort: "asc" }] },
        }}
        pageSizeOptions={[10, 25, 50]}
        empty={
          searchFilter
            ? { title: "Ningún usuario coincide", hint: "Prueba con otra parte del nombre, el DUI o el correo." }
            : { title: "Aún no hay usuarios", hint: "Usa «Nuevo usuario» o la carga masiva para agregar el primero." }
        }
      />

      <UsuarioPerfilDrawer
        user={dialog.type === "profile" ? dialog.user : null}
        onClose={() => setDialog({ type: "closed" })}
        onEdit={(user) => setDialog({ type: "edit", user })}
      />

      <UserFormDialog
        open={dialog.type === "create" || dialog.type === "edit"}
        mode={dialog.type === "edit" ? "edit" : "create"}
        user={dialog.type === "edit" ? dialog.user : null}
        roles={rolesQuery.data ?? []}
        onClose={() => setDialog({ type: "closed" })}
      />

      <ResetPasswordDialog
        open={dialog.type === "reset-password"}
        user={dialog.type === "reset-password" ? dialog.user : null}
        onClose={() => setDialog({ type: "closed" })}
      />

      <BulkImportDialog
        open={bulkImportOpen}
        title="Carga masiva de usuarios"
        helperText='Referencia el rol por nombre (DIGITADOR/SUPERVISOR/ADMINISTRADOR). Si dejas la columna de contraseña vacía, se genera una automáticamente y aparece en el reporte — cópiala ahí mismo, no se vuelve a mostrar. La columna de teléfono (al final) es opcional, formato 1234-5678.'
        templateFilename="plantilla-usuarios.xlsx"
        onDownloadTemplate={userApi.descargarPlantilla}
        onUpload={userApi.cargaMasiva}
        onClose={() => setBulkImportOpen(false)}
        onImported={() => queryClient.invalidateQueries({ queryKey: ["usuarios"] })}
      />

      <ToastSnackbar toast={toast} onClose={closeToast} />
    </Stack>
  );
}
