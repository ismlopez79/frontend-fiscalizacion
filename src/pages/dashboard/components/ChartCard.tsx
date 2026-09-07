import type { ReactNode } from "react";
import { Box, Paper, Skeleton, Stack, Typography } from "@mui/material";
import InsertChartOutlinedIcon from "@mui/icons-material/InsertChartOutlined";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  loading: boolean;
  empty: boolean;
  emptyMessage?: string;
  minHeight?: number;
  children: ReactNode;
}

/**
 * Envoltorio comun para toda tarjeta de grafica del dashboard: mismo
 * encabezado, mismo estado de carga (skeleton del tamaño real de la
 * grafica, no un spinner tapando todo) y mismo estado vacio explicito.
 * Ningun contenedor de grafica provoca scroll horizontal de la pagina —
 * si su contenido es mas ancho que la tarjeta, el scroll queda contenido
 * aqui adentro via overflowX.
 */
export function ChartCard({
  title,
  subtitle,
  actions,
  loading,
  empty,
  emptyMessage = "Sin datos en este rango.",
  minHeight = 320,
  children,
}: ChartCardProps) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, height: "100%" }}>
      <Stack spacing={2} sx={{ height: "100%" }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" rowGap={1}>
          <Box>
            <Typography variant="h4">{title}</Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          {actions}
        </Stack>

        {loading ? (
          <Skeleton variant="rounded" height={minHeight} />
        ) : empty ? (
          <Stack
            alignItems="center"
            justifyContent="center"
            spacing={1}
            sx={{ minHeight, color: "text.secondary" }}
          >
            <InsertChartOutlinedIcon fontSize="large" color="disabled" />
            <Typography variant="body2">{emptyMessage}</Typography>
          </Stack>
        ) : (
          <Box sx={{ overflowX: "auto" }}>{children}</Box>
        )}
      </Stack>
    </Paper>
  );
}
