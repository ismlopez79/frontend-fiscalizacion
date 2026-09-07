import { Paper } from "@mui/material";
import type { ReactNode } from "react";
import { CHART_TOOLTIP_BG } from "@/theme/dashboardColors";
import type { ChartMode } from "@/theme/dashboardColors";

interface ChartTooltipCardProps {
  /** Si se pasa, tiñe el fondo segun el modo del tema (solo lo usaba DuicentrosTopCard hasta ahora). */
  mode?: ChartMode;
  children: ReactNode;
}

/**
 * Wrapper Paper compartido por los tooltips custom de recharts en el
 * dashboard (antes reimplementado identico en 4 archivos). El contenido
 * interno sigue siendo propio de cada card — solo se comparte el shell.
 */
export function ChartTooltipCard({ mode, children }: ChartTooltipCardProps) {
  return (
    <Paper
      elevation={3}
      sx={{
        p: 1.5,
        border: "1px solid",
        borderColor: "divider",
        ...(mode ? { backgroundColor: CHART_TOOLTIP_BG[mode] } : {}),
      }}
    >
      {children}
    </Paper>
  );
}
