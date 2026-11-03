import { Box } from "@mui/material";
import { ACTA_STATUS_TOKENS, type ActaStatus } from "@/theme/statusTokens";
import { designTokens } from "@/theme/theme";

interface EstadoActaChipProps {
  /**
   * Codigo del estado. Acepta cualquier texto: si no es uno conocido, la
   * pastilla sale gris neutra con el label (sin romperse).
   */
  estado: ActaStatus | string;
  size?: "small" | "medium";
  /** Texto que manda el backend (p. ej. reportStatusLabel); si falta, el del token. */
  label?: string;
}

/**
 * Pastilla de estado de acta. Unico punto de la app que renderiza el color +
 * icono + texto de un estado — nunca duplicar esta logica en otra pantalla.
 * Fondo tintado sin borde: el estado se lee por icono y texto, el color
 * solo refuerza.
 */
export function EstadoActaChip({ estado, size = "small", label }: EstadoActaChipProps) {
  const token = estado in ACTA_STATUS_TOKENS ? ACTA_STATUS_TOKENS[estado as ActaStatus] : null;
  const Icon = token?.icon;
  const medium = size === "medium";

  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.625,
        height: medium ? 30 : 24,
        px: medium ? 1.25 : 1,
        borderRadius: 999,
        bgcolor: token?.backgroundColor ?? designTokens.status.neutral.bg,
        color: token?.color ?? designTokens.status.neutral.fg,
        fontSize: medium ? "0.8125rem" : "0.75rem",
        fontWeight: 700,
        lineHeight: 1,
        whiteSpace: "nowrap",
        textDecoration: token?.strikethrough ? "line-through" : "none",
        verticalAlign: "middle",
      }}
    >
      {Icon && <Icon sx={{ fontSize: medium ? 16 : 14 }} />}
      {label ?? token?.label ?? estado}
    </Box>
  );
}
