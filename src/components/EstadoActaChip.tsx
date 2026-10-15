import { Box } from "@mui/material";
import { ACTA_STATUS_TOKENS, type ActaStatus } from "@/theme/statusTokens";

interface EstadoActaChipProps {
  estado: ActaStatus;
  size?: "small" | "medium";
}

/**
 * Pastilla de estado de acta. Unico punto de la app que renderiza el color +
 * icono + texto de un estado — nunca duplicar esta logica en otra pantalla.
 * Fondo tintado sin borde: el estado se lee por icono y texto, el color
 * solo refuerza.
 */
export function EstadoActaChip({ estado, size = "small" }: EstadoActaChipProps) {
  const token = ACTA_STATUS_TOKENS[estado];
  const Icon = token.icon;
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
        bgcolor: token.backgroundColor,
        color: token.color,
        fontSize: medium ? "0.8125rem" : "0.75rem",
        fontWeight: 700,
        lineHeight: 1,
        whiteSpace: "nowrap",
        textDecoration: token.strikethrough ? "line-through" : "none",
        verticalAlign: "middle",
      }}
    >
      <Icon sx={{ fontSize: medium ? 16 : 14 }} />
      {token.label}
    </Box>
  );
}
