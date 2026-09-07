import { Chip } from "@mui/material";
import { ACTA_STATUS_TOKENS, type ActaStatus } from "@/theme/statusTokens";

interface EstadoActaChipProps {
  estado: ActaStatus;
  size?: "small" | "medium";
}

/**
 * Chip de estado de acta. Unico punto de la app que renderiza el color +
 * icono + texto de un estado — nunca duplicar esta logica en otra pantalla.
 */
export function EstadoActaChip({ estado, size = "small" }: EstadoActaChipProps) {
  const token = ACTA_STATUS_TOKENS[estado];
  const Icon = token.icon;

  return (
    <Chip
      size={size}
      icon={<Icon style={{ color: token.color }} fontSize="small" />}
      label={token.label}
      sx={{
        color: token.color,
        backgroundColor: token.backgroundColor,
        border: "1px solid",
        borderColor: token.borderColor,
        textDecoration: token.strikethrough ? "line-through" : "none",
        "& .MuiChip-icon": { color: token.color },
      }}
    />
  );
}
