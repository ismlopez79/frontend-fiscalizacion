import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import { userApi } from "@/api/userApi";
import { getApiErrorMessage } from "@/utils/apiError";
import { DUI_HELPER_TEXT, DUI_REGEX, formatDuiInput } from "@/utils/dui";
import { DIGITADOR_ROLE_NAME } from "@/types/user";
import type { RoleDto, UserDto } from "@/types/user";

/**
 * Un solo schema para crear y editar: "password" siempre existe en el
 * formulario, pero solo es obligatoria (min 8) en modo creación. En modo
 * edición el campo ni siquiera se renderiza, así que su valor nunca importa.
 * Evita el lio de tipos de tener dos schemas/dos tipos de formulario.
 */
const formSchema = z.object({
  username: z
    .string()
    .min(1, "El usuario es obligatorio")
    .regex(/^[a-zA-Z0-9._-]+$/, "Solo letras, números, puntos, guiones y guion bajo"),
  password: z.string().optional(),
  fullName: z.string().min(1, "El nombre completo es obligatorio"),
  email: z.union([z.literal(""), z.string().email("Correo inválido")]).optional(),
  dui: z
    .string()
    .min(1, "El DUI es obligatorio")
    .regex(DUI_REGEX, "Formato inválido, debe ser 12345678-9"),
  roleIds: z.array(z.number()).min(1, "Selecciona al menos un rol"),
  active: z.boolean(),
  delegateInternalCode: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface UserFormDialogProps {
  open: boolean;
  mode: "create" | "edit";
  user: UserDto | null;
  roles: RoleDto[];
  onClose: () => void;
}

export function UserFormDialog({ open, mode, user, roles, onClose }: UserFormDialogProps) {
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isEdit = mode === "edit";

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
      fullName: "",
      email: "",
      dui: "",
      roleIds: [],
      active: true,
      delegateInternalCode: "",
    },
  });

  const selectedRoleIds = useWatch({ control, name: "roleIds" }) ?? [];
  const digitadorRole = roles.find((r) => r.name === DIGITADOR_ROLE_NAME);
  const isDigitadorSelected = !!digitadorRole && selectedRoleIds.includes(digitadorRole.id);

  useEffect(() => {
    if (!open) return;
    setSubmitError(null);
    setShowPassword(false);
    if (isEdit && user) {
      reset({
        username: user.username,
        password: "",
        fullName: user.fullName,
        email: user.email ?? "",
        dui: user.dui ?? "",
        roleIds: user.roleIds,
        active: user.active,
        // El backend no devuelve el codigo actual del delegado vinculado
        // (solo id/nombre), asi que siempre arranca vacio. Se deja vacio a
        // proposito para no sobrescribirlo por accidente al guardar.
        delegateInternalCode: "",
      });
    } else {
      reset({
        username: "",
        password: "",
        fullName: "",
        email: "",
        dui: "",
        roleIds: [],
        active: true,
        delegateInternalCode: "",
      });
    }
  }, [open, isEdit, user, reset]);

  const createMutation = useMutation({
    mutationFn: (values: FormValues) =>
      userApi.createUsuario({
        username: values.username,
        password: values.password ?? "",
        fullName: values.fullName,
        email: values.email || undefined,
        dui: values.dui,
        roleIds: values.roleIds,
        active: values.active,
        delegateInternalCode: values.delegateInternalCode || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      onClose();
    },
    onError: (error) => setSubmitError(getApiErrorMessage(error, "No se pudo crear el usuario.")),
  });

  const updateMutation = useMutation({
    mutationFn: (values: FormValues) => {
      if (!user) throw new Error("Usuario no definido");
      return userApi.updateUsuario(user.id, {
        fullName: values.fullName,
        email: values.email || undefined,
        dui: values.dui,
        roleIds: values.roleIds,
        active: values.active,
        // Omitido por completo si esta vacio: el backend sincroniza el
        // codigo del delegado vinculado con lo que reciba en esta clave,
        // incluso si es "" — mandarla vacia lo borraria sin querer.
        delegateInternalCode: values.delegateInternalCode || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      onClose();
    },
    onError: (error) => setSubmitError(getApiErrorMessage(error, "No se pudo actualizar el usuario.")),
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const onSubmit = handleSubmit((values) => {
    setSubmitError(null);

    if (!isEdit && (!values.password || values.password.length < 8)) {
      return;
    }

    if (isEdit) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  });

  const roleOptions = useMemo(() => roles, [roles]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? "Editar usuario" : "Nuevo usuario"}</DialogTitle>
      <Box component="form" onSubmit={onSubmit} noValidate>
        <DialogContent>
          <Stack spacing={2.25}>
            {submitError && <Alert severity="error">{submitError}</Alert>}

            <TextField
              label="Usuario"
              fullWidth
              disabled={isEdit}
              helperText={
                isEdit
                  ? "El nombre de usuario no se puede cambiar una vez creado."
                  : errors.username?.message
              }
              error={!isEdit && !!errors.username}
              {...register("username")}
            />

            {!isEdit && (
              <Controller
                name="password"
                control={control}
                rules={{
                  validate: (value) =>
                    !value || value.length < 8 ? "Mínimo 8 caracteres" : true,
                }}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="Contraseña"
                    type={showPassword ? "text" : "password"}
                    fullWidth
                    autoComplete="new-password"
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message ?? "Mínimo 8 caracteres."}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                            onClick={() => setShowPassword((v) => !v)}
                            edge="end"
                            size="small"
                          >
                            {showPassword ? (
                              <VisibilityOffOutlinedIcon fontSize="small" />
                            ) : (
                              <VisibilityOutlinedIcon fontSize="small" />
                            )}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
              />
            )}

            <TextField
              label="Nombre completo"
              fullWidth
              error={!!errors.fullName}
              helperText={errors.fullName?.message}
              {...register("fullName")}
            />

            <TextField
              label="Correo electrónico (opcional)"
              fullWidth
              error={!!errors.email}
              helperText={errors.email?.message}
              {...register("email")}
            />

            {isEdit && user && !user.dui && (
              <Alert severity="warning">
                Este usuario no tenía DUI capturado. Es obligatorio a partir de ahora para
                guardarlo.
              </Alert>
            )}

            <Controller
              name="dui"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="DUI"
                  fullWidth
                  placeholder="12345678-9"
                  onChange={(e) => field.onChange(formatDuiInput(e.target.value))}
                  error={!!errors.dui}
                  helperText={errors.dui?.message ?? DUI_HELPER_TEXT}
                />
              )}
            />

            <Controller
              name="roleIds"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  multiple
                  options={roleOptions}
                  getOptionLabel={(role) => role.name}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  value={roleOptions.filter((r) => field.value?.includes(r.id))}
                  onChange={(_, selected) => field.onChange(selected.map((r) => r.id))}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Roles"
                      error={!!errors.roleIds}
                      helperText={errors.roleIds?.message as string | undefined}
                    />
                  )}
                />
              )}
            />

            {isDigitadorSelected && (
              <>
                {isEdit && user && (
                  <Alert severity={user.linkedDelegateId ? "info" : "warning"}>
                    {user.linkedDelegateId
                      ? `Vinculado al delegado JVE "${user.linkedDelegateName}". El nombre y el código de ese delegado se sincronizan automáticamente desde este usuario — no los edites desde Delegados.`
                      : "Este usuario aún no tiene delegado JVE vinculado. Se creará automáticamente al guardar."}
                  </Alert>
                )}

                <TextField
                  label="Código interno del delegado JVE (opcional)"
                  fullWidth
                  placeholder="JVE-04"
                  helperText="Se aplica al Delegado JVE vinculado a este usuario. Déjalo vacío para no modificar el código actual."
                  {...register("delegateInternalCode")}
                />
              </>
            )}

            <Controller
              name="active"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Switch checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />}
                  label={
                    <Typography variant="body2">
                      {field.value ? "Usuario activo" : "Usuario inactivo"}
                    </Typography>
                  }
                />
              )}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} color="inherit" disabled={isSaving}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={isSaving}>
            {isEdit ? "Guardar cambios" : "Crear usuario"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
