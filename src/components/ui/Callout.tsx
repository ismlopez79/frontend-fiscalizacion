import type { ReactNode } from "react";
import { Box, Stack, Typography } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import { designTokens } from "@/theme/theme";

type Tone = "info" | "warning" | "error" | "success";

const TONES: Record<Tone, { bg: string; fg: string; icon: typeof InfoOutlinedIcon }> = {
  info: { bg: designTokens.accentSoft, fg: "#1D4ED8", icon: InfoOutlinedIcon },
  warning: { bg: designTokens.status.warning.bg, fg: designTokens.status.warning.fg, icon: WarningAmberRoundedIcon },
  error: { bg: designTokens.status.error.bg, fg: designTokens.status.error.fg, icon: ErrorOutlineRoundedIcon },
  success: { bg: designTokens.status.success.bg, fg: designTokens.status.success.fg, icon: CheckCircleOutlineRoundedIcon },
};

interface CalloutProps {
  tone: Tone;
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
}

/**
 * Aviso en linea: fondo tintado del tono, icono y texto — sin borde lateral
 * de color ni sombra. Para avisos que acompañan contenido (discrepancias,
 * requisitos pendientes), no para errores de red a pantalla completa.
 */
export function Callout({ tone, title, children, action }: CalloutProps) {
  const t = TONES[tone];
  const Icon = t.icon;
  return (
    <Stack
      direction="row"
      gap={1.25}
      alignItems="flex-start"
      role={tone === "error" ? "alert" : "status"}
      sx={{ bgcolor: t.bg, borderRadius: "14px", px: 2, py: 1.5 }}
    >
      <Icon sx={{ fontSize: 20, color: t.fg, mt: "1px", flexShrink: 0 }} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {title && (
          <Typography variant="body2" sx={{ fontWeight: 700, color: t.fg }}>
            {title}
          </Typography>
        )}
        {children && (
          <Typography variant="body2" component="div" sx={{ color: "text.primary", mt: title ? 0.25 : 0 }}>
            {children}
          </Typography>
        )}
      </Box>
      {action}
    </Stack>
  );
}
