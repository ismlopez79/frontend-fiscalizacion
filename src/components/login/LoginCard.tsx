import { Paper } from "@mui/material";
import type { ReactNode } from "react";
import { designTokens } from "@/theme/theme";

/**
 * Tarjeta del login en vidrio: translucida sobre el color ambiental del
 * fondo, con borde de luz (arriba mas brillante, como luz que atrapa el
 * material) y una sombra amplia. Los campos dentro son blancos y opacos:
 * el vidrio es el marco, no el fondo del texto.
 *
 * Entra "materializandose": opacidad + escala leve + desplazamiento corto,
 * solo transform/opacity (el backdrop-filter no se anima: seria caro).
 */
export function LoginCard({ children }: { children: ReactNode }) {
  return (
    <Paper
      elevation={0}
      sx={{
        width: "100%",
        maxWidth: 440,
        borderRadius: "28px",
        p: { xs: 3.5, sm: 5 },
        bgcolor: "rgba(255, 255, 255, 0.52)",
        backdropFilter: "blur(28px) saturate(170%)",
        WebkitBackdropFilter: "blur(28px) saturate(170%)",
        border: "1px solid rgba(255, 255, 255, 0.75)",
        boxShadow: [
          "inset 0 1px 0 rgba(255, 255, 255, 0.9)",
          "0 0 0 1px rgba(13, 27, 42, 0.04)",
          "0 30px 80px -24px rgba(13, 27, 42, 0.28)",
        ].join(", "),
        "@media (prefers-reduced-transparency: reduce)": {
          bgcolor: "#FFFFFF",
          backdropFilter: "none",
          WebkitBackdropFilter: "none",
        },
        "@keyframes cardIn": {
          from: { opacity: 0, transform: "translateY(12px) scale(0.98)" },
          to: { opacity: 1, transform: "translateY(0) scale(1)" },
        },
        "@keyframes cardInReduced": {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
        animation: `cardIn 500ms ${designTokens.easeOut} both`,
        "@media (prefers-reduced-motion: reduce)": {
          animation: `cardInReduced 300ms ${designTokens.easeOut} both`,
        },
      }}
    >
      {children}
    </Paper>
  );
}
