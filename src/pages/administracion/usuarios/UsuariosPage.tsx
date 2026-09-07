import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Box, Button, Chip, Collapse, IconButton, Paper, Stack, Tooltip, Typography } from "@mui/material";
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
import { userApi, roleApi } from "@/api/userApi";
import { getApiErrorMessage } from "@/utils/apiError";
import { useAuth } from "@/hooks/useAuth";
import { BulkImportDialog } from "@/components/BulkImportDialog";
import { UserAvatar } from "@/components/UserAvatar";
import { DIGITADOR_ROLE_NAME } from "@/types/user";
import type { UserDto } from "@/types/user";
import { UserFormDialog } from "./UserFormDialog";
import { ResetPasswordDialog } from "./ResetPasswordDialog";
import { useToast } from "@/hooks/useToast";
import { ToastSnackbar } from "@/components/ToastSnackbar";

type DialogState =
  | { type: "closed" }
  | { type: "create" }
  | { type: "edit"; user: UserDto }
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
        roleIds: target.roleIds,
        active: !target.active,
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
          />
        ),
      },
      { field: "username", headerName: "Usuario", flex: 1, minWidth: 130 },
      { field: "fullName", headerName: "Nombre completo", flex: 1.4, minWidth: 180 },
      {
        field: "dui",
        headerName: "DUI",
        width: 130,
        valueGetter: (_value, row) => row.dui ?? "—",
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
        width: 160,
        sortable: false,
        filterable: false,
        renderCell: (params) => {
          const target = params.row;
          const isSelf = target.username === currentUser?.username;
          const missingDui = !target.dui;
          return (
            <Stack direction="row" spacing={0.5}>
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
                    : missingDui
                      ? "Este usuario no tiene DUI capturado. Edítalo primero para poder cambiar su estado."
                      : target.active
                        ? "Desactivar usuario"
                        : "Activar usuario"
                }
              >
                <span>
                  <IconButton
                    size="small"
                    disabled={isSelf || missingDui || toggleActiveMutation.isPending}
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
    <Stack spacing={2.5}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" rowGap={1}>
        <Box>
          <Typography variant="h3">Usuarios</Typography>
          <Typography variant="body2" color="text.secondary">
            Alta, edición y asignación de roles. No existe borrado: para dar de baja a un usuario,
            desactívalo.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
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
        </Stack>
      </Stack>

      <Collapse in={usersQuery.isError}>
        <Alert severity="error">
          {getApiErrorMessage(usersQuery.error, "No se pudo cargar el listado de usuarios.")}
        </Alert>
      </Collapse>

      <Paper variant="outlined" sx={{ height: 560 }}>
        <DataGrid
          rows={usersQuery.data ?? []}
          columns={columns}
          loading={usersQuery.isLoading}
          disableRowSelectionOnClick
          density="comfortable"
          initialState={{
            pagination: { paginationModel: { pageSize: 10 } },
            sorting: { sortModel: [{ field: "username", sort: "asc" }] },
          }}
          pageSizeOptions={[10, 25, 50]}
          sx={{ border: "none" }}
        />
      </Paper>

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
        helperText='Referencia el rol por nombre (DIGITADOR/SUPERVISOR/ADMINISTRADOR). Si dejas la columna de contraseña vacía, se genera una automáticamente y aparece en el reporte — cópiala ahí mismo, no se vuelve a mostrar.'
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
