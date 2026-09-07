import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Alert, Box, Collapse, Link, Stack, Typography } from "@mui/material";
import { AuthLayout } from "@/layouts/AuthLayout";
import { useAuth } from "@/hooks/useAuth";
import { authApi } from "@/api/authApi";
import { getApiErrorCode, getApiErrorMessage } from "@/utils/apiError";
import { LoginCard } from "@/components/login/LoginCard";
import { JveLogo } from "@/components/login/JveLogo";
import { PasswordInput } from "@/components/login/PasswordInput";
import { LoginButton } from "@/components/login/LoginButton";
import { StaggerItem } from "@/components/login/StaggerItem";
import type { ChangePasswordRequest } from "@/types/auth";

const baseSchema = {
  newPassword: z.string().min(8, "Mínimo 8 caracteres"),
  confirmPassword: z.string().min(1, "Confirma la nueva contraseña"),
};

const forcedSchema = z
  .object(baseSchema)
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

const voluntarySchema = z
  .object({
    currentPassword: z.string().min(1, "La contraseña actual es obligatoria"),
    ...baseSchema,
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

type ForcedFormValues = z.infer<typeof forcedSchema>;
type VoluntaryFormValues = z.infer<typeof voluntarySchema>;
type FormValues = ForcedFormValues & Partial<VoluntaryFormValues>;

/**
 * Una sola pantalla para dos casos (ver POST /auth/change-password):
 * - Caso A (forzado): scope PASSWORD_CHANGE_ONLY, viene de un login con
 *   primerIngreso=true o de un reset de admin. Sin campo de contraseña
 *   actual, y sin forma de salir salvo cerrar sesión.
 * - Caso B (voluntario): scope FULL, el usuario ya tiene sesión normal y
 *   entró desde el menú de usuario. Pide y envía currentPassword.
 */
export function ChangePasswordPage() {
  const { user, applyAuthResponse, logout } = useAuth();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isForced = user?.scope === "PASSWORD_CHANGE_ONLY";

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(isForced ? forcedSchema : voluntarySchema),
  });

  const onSubmit = async (values: FormValues) => {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const body: ChangePasswordRequest = isForced
        ? { newPassword: values.newPassword }
        : { currentPassword: values.currentPassword, newPassword: values.newPassword };
      const response = await authApi.changePassword(body);
      applyAuthResponse(response);
      navigate("/dashboard", { replace: true });
    } catch (error) {
      if (!isForced && getApiErrorCode(error) === "INVALID_CREDENTIALS") {
        setError("currentPassword", { message: "La contraseña actual no coincide." });
      } else {
        setSubmitError(getApiErrorMessage(error, "No se pudo cambiar la contraseña."));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <AuthLayout>
      <LoginCard>
        <StaggerItem delay={0}>
          <JveLogo />
        </StaggerItem>

        <StaggerItem delay={80}>
          <Stack spacing={0.75} alignItems="center" sx={{ textAlign: "center", mb: 3.5, width: "100%" }}>
            <Typography sx={{ fontSize: 28, fontWeight: 700, color: "#0D1B2A", lineHeight: 1.2 }}>
              {isForced ? "Actualiza tu contraseña" : "Cambia tu contraseña"}
            </Typography>
            <Typography sx={{ fontSize: 15.5, color: "#6B7280", lineHeight: 1.5, maxWidth: 380 }}>
              {isForced
                ? "Por seguridad, debes definir una nueva contraseña antes de continuar."
                : "Ingresa tu contraseña actual y elige una nueva."}
            </Typography>
          </Stack>
        </StaggerItem>

        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Stack spacing={2.25}>
            <Collapse in={!!submitError}>
              <Alert severity="error" role="alert" sx={{ borderRadius: "10px", fontSize: 14 }}>
                {submitError}
              </Alert>
            </Collapse>

            {!isForced && (
              <StaggerItem delay={140}>
                <PasswordInput
                  placeholder="Contraseña actual"
                  aria-label="Contraseña actual"
                  autoComplete="current-password"
                  {...register("currentPassword")}
                  error={!!errors.currentPassword}
                  helperText={errors.currentPassword?.message}
                />
              </StaggerItem>
            )}

            <StaggerItem delay={190}>
              <PasswordInput
                placeholder="Nueva contraseña"
                aria-label="Nueva contraseña"
                autoComplete="new-password"
                {...register("newPassword")}
                error={!!errors.newPassword}
                helperText={errors.newPassword?.message ?? "Mínimo 8 caracteres."}
              />
            </StaggerItem>

            <StaggerItem delay={240}>
              <PasswordInput
                placeholder="Confirmar nueva contraseña"
                aria-label="Confirmar nueva contraseña"
                autoComplete="new-password"
                {...register("confirmPassword")}
                error={!!errors.confirmPassword}
                helperText={errors.confirmPassword?.message}
              />
            </StaggerItem>

            <StaggerItem delay={290}>
              <LoginButton loading={isSubmitting} label="Guardar contraseña" loadingLabel="Guardando..." />
            </StaggerItem>

            {isForced && (
              <StaggerItem delay={340}>
                <Typography sx={{ textAlign: "center", fontSize: 13.5, color: "#6B7280" }}>
                  <Link component="button" type="button" onClick={handleLogout} underline="hover">
                    Cerrar sesión
                  </Link>
                </Typography>
              </StaggerItem>
            )}
          </Stack>
        </Box>
      </LoginCard>
    </AuthLayout>
  );
}
