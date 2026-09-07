import { Paper } from "@mui/material";
import type { ReactNode } from "react";
import { designTokens } from "@/theme/theme";

/**
 * Tarjeta blanca "flotante" del login: sombra amplia y difusa (no un borde
 * duro) para dar sensacion de elevacion sin exagerar. Entra con un fade +
 * desplazamiento vertical corto, como pide el motion spec.
 */
export function LoginCard({ children }: { children: ReactNode }) {
  return (
    <Paper
      elevation={0}
      sx={{
        width: "100%",
        maxWidth: 540,
        borderRadius: "22px",
        p: { xs: 3.5, sm: 5 },
        backgroundColor: "#FFFFFF",
        boxShadow: "0 25px 60px rgba(13, 27, 42, 0.12)",
        "@keyframes cardIn": {
          from: { opacity: 0, transform: "translateY(15px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
        "@keyframes cardInReduced": {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
        animation: `cardIn 550ms ${designTokens.easeOut} both`,
        "@media (prefers-reduced-motion: reduce)": {
          animation: `cardInReduced 550ms ${designTokens.easeOut} both`,
        },
      }}
    >
      {children}
    </Paper>
  );
}
