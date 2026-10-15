import type { ReactNode } from "react";
import { ButtonBase } from "@mui/material";
import AddIcon from "@mui/icons-material/AddRounded";
import { designTokens } from "@/theme/theme";

interface AddRowButtonProps {
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
}

/**
 * "Agregar otro" al final de una lista repetible (producciones, incidentes):
 * ancho completo y con borde punteado, justo donde aparecera la fila nueva
 * — al alcance del pulgar en movil, sin tener que subir al encabezado.
 */
export function AddRowButton({ onClick, children, disabled }: AddRowButtonProps) {
  return (
    <ButtonBase
      onClick={onClick}
      disabled={disabled}
      sx={{
        width: "100%",
        minHeight: 48,
        gap: 1,
        borderRadius: "14px",
        border: "1.5px dashed rgba(15, 23, 42, 0.16)",
        color: designTokens.accent,
        fontWeight: 700,
        fontSize: "0.875rem",
        transition: `background-color 150ms ease, border-color 150ms ease, transform 160ms ${designTokens.easeOut}`,
        "&:active": { transform: "scale(0.985)" },
        "&.Mui-focusVisible": { boxShadow: designTokens.focusRing },
        "&.Mui-disabled": { color: designTokens.textDisabled },
        "@media (hover: hover) and (pointer: fine)": {
          "&:hover": { bgcolor: designTokens.accentSoft, borderColor: designTokens.accent },
        },
      }}
    >
      <AddIcon fontSize="small" />
      {children}
    </ButtonBase>
  );
}
