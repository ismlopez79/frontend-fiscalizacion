import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Box, Button, Stack, Typography } from "@mui/material";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import RadioButtonUncheckedRoundedIcon from "@mui/icons-material/RadioButtonUncheckedRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import { Callout } from "@/components/ui/Callout";
import { useAuth } from "@/hooks/useAuth";
import { designTokens } from "@/theme/theme";
import type { MyAccountView } from "@/hooks/useMyAccount";

const EXEMPT_ROLE = "ADMINISTRADOR";

/**
 * Aviso de "perfil obligatorio" en Mi cuenta. El backend bloquea el resto
 * del sistema (403 PROFILE_INCOMPLETE_REQUIRED) mientras falte correo,
 * telefono o foto; RequireCompleteProfile trae a la persona aqui. Muestra
 * que falta con una lista que se va marcando, y al completarse levanta el
 * bloqueo local y ofrece volver a donde iba.
 */
export function ProfileCompletionNotice({ account }: { account: MyAccountView | undefined }) {
  const { user, markProfileComplete } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Se fija al entrar: tras completar, profileComplete pasa a true pero el
  // aviso debe quedarse (en verde) para ofrecer el boton de continuar.
  const [wasBlocked] = useState(() => !!user && !user.profileComplete && !user.roles.includes(EXEMPT_ROLE));
  const marked = useRef(false);

  const items = account
    ? [
        { key: "foto", label: "Foto de perfil", done: account.hasPhoto },
        { key: "correo", label: "Correo electrónico", done: !!account.email },
        { key: "telefono", label: "Teléfono", done: !!account.phone },
      ]
    : [];
  const complete = items.length > 0 && items.every((i) => i.done);

  useEffect(() => {
    if (wasBlocked && complete && !marked.current) {
      marked.current = true;
      markProfileComplete();
    }
  }, [wasBlocked, complete, markProfileComplete]);

  if (!wasBlocked || !account) return null;

  const redirectTo = searchParams.get("redirectTo");
  // Solo rutas internas: nunca redirigir a un dominio que venga en la URL.
  const target = redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//") ? redirectTo : "/dashboard";
  const destination = target.startsWith("/perfil") ? "/dashboard" : target;

  if (complete) {
    return (
      <Callout
        tone="success"
        title="Tu perfil está completo"
        action={
          <Button
            size="small"
            variant="contained"
            color="success"
            endIcon={<ArrowForwardRoundedIcon />}
            onClick={() => navigate(destination, { replace: true })}
            sx={{ flexShrink: 0, alignSelf: "center" }}
          >
            Continuar
          </Button>
        }
      >
        Ya puedes usar el sistema con normalidad.
      </Callout>
    );
  }

  return (
    <Callout tone="warning" title="Completa tu perfil para continuar">
      Para usar el sistema necesitas tener foto de perfil, correo y teléfono. Mientras falte alguno, solo puedes
      acceder a esta pantalla.
      <Stack component="ul" direction={{ xs: "column", sm: "row" }} gap={{ xs: 0.75, sm: 2 }} sx={{ listStyle: "none", m: 0, p: 0, mt: 1.25 }}>
        {items.map((item) => (
          <Stack component="li" key={item.key} direction="row" alignItems="center" gap={0.75}>
            <Box
              aria-hidden
              sx={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: item.done ? designTokens.status.success.fg : "transparent",
                color: item.done ? "#FFFFFF" : designTokens.status.warning.fg,
                transition: `background-color 200ms ${designTokens.easeOut}`,
              }}
            >
              {item.done ? <CheckRoundedIcon sx={{ fontSize: 14 }} /> : <RadioButtonUncheckedRoundedIcon sx={{ fontSize: 20 }} />}
            </Box>
            <Typography
              variant="body2"
              sx={{ fontWeight: 600, color: item.done ? designTokens.status.success.fg : "text.primary" }}
            >
              {item.label}
              <Box component="span" sx={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
                {item.done ? " (listo)" : " (pendiente)"}
              </Box>
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Callout>
  );
}
