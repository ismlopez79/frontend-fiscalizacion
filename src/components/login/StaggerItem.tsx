import { Box } from "@mui/material";
import type { ReactNode } from "react";
import { designTokens } from "@/theme/theme";

/**
 * Envoltorio para animar cada seccion del formulario con un pequeño
 * retraso incremental (stagger), como pide el spec de motion: logo -> titulo
 * -> inputs -> boton, cada uno apareciendo un poco despues del anterior.
 */
export function StaggerItem({ delay, children }: { delay: number; children: ReactNode }) {
  return (
    <Box
      sx={{
        "@keyframes staggerIn": {
          from: { opacity: 0, transform: "translateY(10px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
        "@keyframes staggerInReduced": {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
        opacity: 0,
        animation: `staggerIn 450ms ${designTokens.easeOut} ${delay}ms both`,
        "@media (prefers-reduced-motion: reduce)": {
          animation: `staggerInReduced 450ms ${designTokens.easeOut} ${delay}ms both`,
        },
      }}
    >
      {children}
    </Box>
  );
}
