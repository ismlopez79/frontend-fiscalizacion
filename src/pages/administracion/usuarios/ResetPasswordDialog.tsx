import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import ContentCopyIcon from "@mui/icons-material/ContentCopyOutlined";
import { userApi } from "@/api/userApi";
import { getApiErrorMessage } from "@/utils/apiError";
import type { UserDto } from "@/types/user";

const schema = z.object({
  newPassword: z.union([z.literal(""), z.string().min(8, "Mínimo 8 caracteres").max(72, "Máximo 72 caracteres")]),
});

type FormValues = z.infer<typeof schema>;

interface ResetPasswordDialogProps {
  open: boolean;
  user: UserDto | null;
  onClose: () => void;
}

/**
 * Flujo de admin: POST /usuarios/{id}/restablecer-password. No pide la
 * contraseña anterior (a diferencia de un "cambiar mi contraseña" de
 * usuario final, que este endpoint no es). newPassword es opcional: si se
 * deja vacío, el backend genera una automáticamente. Esta acción reactiva
 * primerIngreso y desbloquea la cuenta del lado del backend.
 *
 * El backend responde con { temporaryPassword } — es la única vez que esa
 * contraseña sale en texto plano. Se muestra una sola vez en este diálogo y
 * se descarta al cerrarlo: nunca se persiste en localStorage, cache de
 * react-query, ni se loguea a consola.
 */
export function ResetPasswordDialog({ open, user, onClose }: ResetPasswordDialogProps) {
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { newPassword: "" },
  });

  useEffect(() => {
    if (open) {
      reset({ newPassword: "" });
      setSubmitError(null);
      setTemporaryPassword(null);
      setShowPassword(false);
      setCopied(false);
    }
  }, [open, reset]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      if (!user) throw new Error("Usuario no definido");
      return userApi.resetPassword(user.id, {
        newPassword: values.newPassword ? values.newPassword : undefined,
      });
    },
    onSuccess: (data) => {
      setTemporaryPassword(data.temporaryPassword);
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
    },
    onError: (error) =>
      setSubmitError(getApiErrorMessage(error, "No se pudo restablecer la contraseña.")),
  });

  const onSubmit = handleSubmit((values) => {
    setSubmitError(null);
    mutation.mutate(values);
  });

  const copyPassword = async () => {
    if (!temporaryPassword) return;
    try {
      await navigator.clipboard.writeText(temporaryPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard no disponible (permiso denegado, http no seguro, etc.) — no es critico.
    }
  };

  const handleClose = () => {
    // Nunca dejar la contraseña generada en memoria mas de lo necesario.
    setTemporaryPassword(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>Restablecer contraseña</DialogTitle>
      {temporaryPassword ? (
        <>
          <DialogContent>
            <Stack spacing={2}>
              <Alert severity="warning">
                Cópiala y comunícasela ahora: esta es la única vez que se muestra, no queda
                guardada en ningún otro lugar del sistema.
              </Alert>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 1,
                  pl: 2,
                  pr: 1,
                  py: 1.5,
                  borderRadius: "14px",
                  bgcolor: "rgba(15, 23, 42, 0.04)",
                }}
              >
                <Typography
                  sx={{
                    fontFamily: '"SF Mono", ui-monospace, "Cascadia Mono", Menlo, Consolas, monospace',
                    fontSize: "1.25rem",
                    fontWeight: 600,
                    letterSpacing: "0.04em",
                    color: "text.primary",
                    wordBreak: "break-all",
                    userSelect: "all",
                  }}
                >
                  {temporaryPassword}
                </Typography>
                <Tooltip title={copied ? "¡Copiada!" : "Copiar contraseña"}>
                  <IconButton
                    onClick={copyPassword}
                    aria-label="Copiar contraseña"
                    sx={{ color: copied ? "success.main" : "text.secondary", transition: "color 150ms ease" }}
                  >
                    {copied ? <CheckRoundedIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
                  </IconButton>
                </Tooltip>
              </Box>
              <Typography variant="body2" color="text.secondary">
                <strong>{user?.username}</strong> deberá usarla en su próximo inicio de sesión y
                cambiarla de inmediato.
              </Typography>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button variant="contained" onClick={handleClose}>
              Cerrar
            </Button>
          </DialogActions>
        </>
      ) : (
        <Box component="form" onSubmit={onSubmit} noValidate>
          <DialogContent>
            <DialogContentText sx={{ mb: 2 }}>
              Se establecerá una nueva contraseña para <strong>{user?.username}</strong>. Déjala
              vacía para que el sistema genere una automáticamente.
            </DialogContentText>

            {submitError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {submitError}
              </Alert>
            )}

            <Controller
              name="newPassword"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  autoFocus
                  label="Nueva contraseña (opcional)"
                  type={showPassword ? "text" : "password"}
                  fullWidth
                  error={!!errors.newPassword}
                  helperText={
                    errors.newPassword?.message ??
                    "Mínimo 8 caracteres, o vacío para generar una automáticamente."
                  }
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
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose} color="inherit">
              Cancelar
            </Button>
            <Button type="submit" variant="contained" disabled={mutation.isPending}>
              Restablecer
            </Button>
          </DialogActions>
        </Box>
      )}
    </Dialog>
  );
}
