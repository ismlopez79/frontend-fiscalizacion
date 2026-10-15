import { Stack, Typography } from "@mui/material";
import CloudDoneOutlinedIcon from "@mui/icons-material/CloudDoneOutlined";
import CloudSyncOutlinedIcon from "@mui/icons-material/CloudSyncOutlined";
import CloudOffOutlinedIcon from "@mui/icons-material/CloudOffOutlined";
import { designTokens } from "@/theme/theme";

/**
 * Indicador sutil de estado del autoguardado (feedback de status, no de
 * accion — no debe competir visualmente con el titulo). No se muestra nada
 * hasta que exista un borrador real: antes de elegir departamento+duicentro
 * +fecha no hay nada que autoguardar todavia.
 */
export function AutosaveIndicator({ state, hasDraft }: { state: "idle" | "saving" | "saved" | "error"; hasDraft: boolean }) {
  if (!hasDraft && state === "idle") return null;

  const config = {
    idle: null,
    saving: { icon: CloudSyncOutlinedIcon, label: "Guardando…", fg: designTokens.textSecondary, bg: "rgba(15, 23, 42, 0.05)" },
    saved: { icon: CloudDoneOutlinedIcon, label: "Borrador guardado", fg: designTokens.status.success.fg, bg: designTokens.status.success.bg },
    error: {
      icon: CloudOffOutlinedIcon,
      label: "Sin conexión, reintentando",
      fg: designTokens.status.warning.fg,
      bg: designTokens.status.warning.bg,
    },
  }[state];

  if (!config) return null;
  const Icon = config.icon;

  return (
    <Stack
      direction="row"
      gap={0.625}
      alignItems="center"
      role="status"
      sx={{
        height: 26,
        px: 1.125,
        borderRadius: 999,
        bgcolor: config.bg,
        color: config.fg,
        transition: "background-color 200ms ease, color 200ms ease",
      }}
    >
      <Icon sx={{ fontSize: 15 }} />
      <Typography variant="caption" sx={{ color: "inherit", fontWeight: 700 }}>
        {config.label}
      </Typography>
    </Stack>
  );
}
