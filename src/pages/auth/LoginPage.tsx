import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Alert, Box, Collapse, Stack } from "@mui/material";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import { AuthLayout } from "@/layouts/AuthLayout";
import { useAuth } from "@/hooks/useAuth";
import { LoginCard } from "@/components/login/LoginCard";
import { JveLogo } from "@/components/login/JveLogo";
import { FormInput } from "@/components/login/FormInput";
import { PasswordInput } from "@/components/login/PasswordInput";
import { ForgotPasswordHint } from "@/components/login/ForgotPasswordHint";
import { LoginButton } from "@/components/login/LoginButton";
import { LoginFooter } from "@/components/login/LoginFooter";
import { StaggerItem } from "@/components/login/StaggerItem";
import { getApiErrorCode, getApiErrorMessage } from "@/utils/apiError";

const loginSchema = z.object({
  username: z.string().min(1, "El usuario es obligatorio"),
  password: z.string().min(1, "La contraseña es obligatoria"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loginError, setLoginError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginFormValues) => {
    setLoginError(null);
    try {
      const response = await login(values);
      if (response.primerIngreso) {
        navigate("/cambiar-password", { replace: true });
        return;
      }
      const redirectTo = searchParams.get("redirectTo");
      navigate(redirectTo ?? "/dashboard", { replace: true });
    } catch (error) {
      // Se muestra el message del backend tal cual. A proposito el login ya no
      // distingue usuario inexistente, contraseña mala, cuenta bloqueada o
      // inactiva, ni delegado temporal con Elecciones apagado (todo es 401
      // INVALID_CREDENTIALS con el mismo mensaje); 429 TOO_MANY_ATTEMPTS trae
      // el tiempo de espera.
      const fallback =
        getApiErrorCode(error) === "TOO_MANY_ATTEMPTS"
          ? "Demasiados intentos fallidos. Espera unos minutos antes de volver a intentar."
          : "Usuario o contraseña incorrectos.";
      setLoginError(getApiErrorMessage(error, fallback, { preferFallbackOn401: true }));
    }
  };

  return (
    <AuthLayout>
      <LoginCard>
        <StaggerItem delay={0}>
          <JveLogo />
        </StaggerItem>

        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate sx={{ mt: 3 }}>
          <Stack spacing={2.25}>
            <Collapse in={!!loginError}>
              <Alert
                severity="error"
                role="alert"
                sx={{ borderRadius: "14px", fontSize: 14 }}
              >
                {loginError}
              </Alert>
            </Collapse>

            <StaggerItem delay={100}>
              <FormInput
                icon={<PersonOutlineRoundedIcon fontSize="small" />}
                placeholder="Usuario"
                aria-label="Usuario"
                autoFocus
                autoComplete="username"
                {...register("username")}
                error={!!errors.username}
                helperText={errors.username?.message}
              />
            </StaggerItem>

            <StaggerItem delay={160}>
              <PasswordInput
                placeholder="Contraseña"
                aria-label="Contraseña"
                autoComplete="current-password"
                {...register("password")}
                error={!!errors.password}
                helperText={errors.password?.message}
              />
            </StaggerItem>

            <StaggerItem delay={220}>
              <ForgotPasswordHint />
            </StaggerItem>

            <StaggerItem delay={290}>
              <LoginButton loading={isLoading} />
            </StaggerItem>
          </Stack>
        </Box>

        <StaggerItem delay={320}>
          <LoginFooter />
        </StaggerItem>
      </LoginCard>
    </AuthLayout>
  );
}
