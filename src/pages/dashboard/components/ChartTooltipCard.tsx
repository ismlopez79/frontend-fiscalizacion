import { Box } from "@mui/material";
import type { ReactNode } from "react";

interface ChartTooltipCardProps {
  children: ReactNode;
}

/**
 * Tooltip de las graficas en material de vidrio: flota sobre la grafica sin
 * taparla del todo. Texto a peso 600 y color pleno (vibrancy) para que se
 * lea sobre lo que pase por detras.
 */
export function ChartTooltipCard({ children }: ChartTooltipCardProps) {
  return (
    <Box
      sx={{
        px: 1.5,
        py: 1.25,
        borderRadius: "12px",
        bgcolor: "rgba(255, 255, 255, 0.72)",
        backdropFilter: "blur(16px) saturate(180%)",
        WebkitBackdropFilter: "blur(16px) saturate(180%)",
        border: "1px solid rgba(255, 255, 255, 0.85)",
        boxShadow: "0 0 0 1px rgba(15, 23, 42, 0.06), 0 10px 28px -10px rgba(15, 23, 42, 0.28)",
        fontVariantNumeric: "tabular-nums",
        "@media (prefers-reduced-transparency: reduce)": {
          bgcolor: "#FFFFFF",
          backdropFilter: "none",
          WebkitBackdropFilter: "none",
        },
      }}
    >
      {children}
    </Box>
  );
}
