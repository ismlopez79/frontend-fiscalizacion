import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import { userApi } from "@/api/userApi";
import { catalogApi } from "@/api/catalogApi";
import { getApiErrorMessage } from "@/utils/apiError";
import { DUI_HELPER_TEXT, DUI_REGEX, formatDuiInput } from "@/utils/dui";
import { PHONE_HELPER_TEXT, PHONE_REGEX, formatPhoneInput } from "@/utils/phone";
import { ADMIN_ROLE_NAME, DIGITADOR_ROLE_NAME } from "@/types/user";
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
    .min(3, "El usuario debe tener al menos 3 caracteres")
    .max(50, "Máximo 50 caracteres")
    .regex(/^[a-zA-Z0-9._-]+$/, "Solo letras sin tilde, números, punto, guion y guion bajo"),
  password: z.string().optional(),
  fullName: z.string().min(1, "El nombre completo es obligatorio").max(150, "Máximo 150 caracteres"),
  email: z.union([z.literal(""), z.string().email("Correo inválido").max(150, "Máximo 150 caracteres")]).optional(),
  dui: z
    .string()
    .min(1, "El DUI es obligatorio")
    .regex(DUI_REGEX, "Formato inválido, debe ser 12345678-9"),
  phone: z.union([z.literal(""), z.string().regex(PHONE_REGEX, "Formato inválido, debe ser 1234-5678")]),
  roleIds: z.array(z.number()).min(1, "Selecciona al menos un rol"),
  active: z.boolean(),
  delegateInternalCode: z.string().max(50, "Máximo 50 caracteres").optional(),
  delegatePoliticalPartyId: z.number().nullable(),
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
      phone: "",
      roleIds: [],
      active: true,
      delegateInternalCode: "",
      delegatePoliticalPartyId: null,
    },
  });

  const selectedRoleIds = useWatch({ control, name: "roleIds" }) ?? [];
  const digitadorRole = roles.find((r) => r.name === DIGITADOR_ROLE_NAME);
  const isDigitadorSelected = !!digitadorRole && selectedRoleIds.includes(digitadorRole.id);
  // Un administrador no se puede desactivar (el backend responde 409). Cuenta
  // tanto el rol guardado como el marcado ahora: quitar el rol y desactivar
  // son dos ediciones separadas.
  const adminRole = roles.find((r) => r.name === ADMIN_ROLE_NAME);
  const isAdmin =
    (!!adminRole && selectedRoleIds.includes(adminRole.id)) || (isEdit && !!user?.roles.includes(ADMIN_ROLE_NAME));

  const partidosQuery = useQuery({
    queryKey: ["partidos-politicos"],
    queryFn: catalogApi.getPartidosPoliticos,
    enabled: open,
  });

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
        phone: user.phone ?? "",
        roleIds: user.roleIds,
        active: user.active,
        // El backend no devuelve el codigo actual del delegado vinculado
        // (solo id/nombre), asi que siempre arranca vacio. Se deja vacio a
        // proposito para no sobrescribirlo por accidente al guardar.
        delegateInternalCode: "",
        delegatePoliticalPartyId: user.linkedDelegatePoliticalPartyId ?? null,
      });
    } else {
      reset({
        username: "",
        password: "",
        fullName: "",
        email: "",
        dui: "",
        phone: "",
        roleIds: [],
        active: true,
        delegateInternalCode: "",
        delegatePoliticalPartyId: null,
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
        phone: values.phone || undefined,
        roleIds: values.roleIds,
        active: values.active,
        delegateInternalCode: values.delegateInternalCode || undefined,
        delegatePoliticalPartyId: values.delegatePoliticalPartyId ?? undefined,
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
        phone: values.phone || undefined,
        roleIds: values.roleIds,
        active: values.active,
        // Omitido por completo si esta vacio: el backend sincroniza el
        // codigo del delegado vinculado con lo que reciba en esta clave,
        // incluso si es "" — mandarla vacia lo borraria sin querer.
        delegateInternalCode: values.delegateInternalCode || undefined,
        delegatePoliticalPartyId: values.delegatePoliticalPartyId ?? undefined,
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
              name="phone"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Teléfono (opcional)"
                  fullWidth
                  placeholder="7123-4567"
                  inputProps={{ inputMode: "numeric", autoComplete: "tel" }}
                  onChange={(e) => field.onChange(formatPhoneInput(e.target.value))}
                  error={!!errors.phone}
                  helperText={errors.phone?.message ?? PHONE_HELPER_TEXT}
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

                {isEdit && user && !user.linkedDelegatePoliticalPartyId && (
                  <Alert severity="warning">
                    Este usuario no tenía partido político capturado para su delegado JVE. Es
                    obligatorio a partir de ahora para guardarlo.
                  </Alert>
                )}

                <Controller
                  name="delegatePoliticalPartyId"
                  control={control}
                  rules={{
                    validate: (value) => (isEdit && !value ? "Selecciona un partido político" : true),
                  }}
                  render={({ field, fieldState }) => (
                    <TextField
                      select
                      label={isEdit ? "Partido político del delegado JVE" : "Partido político del delegado JVE (opcional)"}
                      fullWidth
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                    >
                      <MenuItem value="">{isEdit ? "Selecciona un partido" : "Sin asignar"}</MenuItem>
                      {(partidosQuery.data ?? []).map((p) => (
                        <MenuItem key={p.id} value={p.id}>
                          {p.code} · {p.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </>
            )}

            <Controller
              name="active"
              control={control}
              render={({ field }) => (
                <Box>
                  <FormControlLabel
                    disabled={isAdmin && field.value}
                    control={<Switch checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />}
                    label={
                      <Typography variant="body2">
                        {field.value ? "Usuario activo" : "Usuario inactivo"}
                      </Typography>
                    }
                  />
                  {isAdmin && field.value && (
                    <Typography variant="caption" component="p" sx={{ mt: 0.25 }}>
                      Un administrador no se puede desactivar. Para darlo de baja, primero quítale el rol
                      ADMINISTRADOR y guarda; después desactívalo.
                    </Typography>
                  )}
                </Box>
              )}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
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
