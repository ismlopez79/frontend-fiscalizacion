import { Box, Stack, Tooltip, Typography, useTheme } from "@mui/material";
import { ACTA_STATUS_TOKENS } from "@/theme/statusTokens";
import { ACTA_STATUS_ORDER, getStatusColor } from "@/theme/dashboardColors";
import type { ChartMode } from "@/theme/dashboardColors";
import { ChartCard } from "./ChartCard";
import type { DashboardResumen } from "@/types/dashboard";

const numberFormatter = new Intl.NumberFormat("es-SV");

interface ActasPorEstadoCardProps {
  resumen: DashboardResumen | undefined;
  loading: boolean;
}

/**
 * actasPorEstado son 7 ESTADOS de un mismo proceso, no categorias libres:
 * barra horizontal apilada (proporcion de un vistazo) + pills con
 * icono+etiqueta+conteo debajo (para el valor exacto de cada uno). El color
 * nunca es el unico medio para distinguir un estado — siempre va con icono
 * y texto.
 */
export function ActasPorEstadoCard({ resumen, loading }: ActasPorEstadoCardProps) {
  const theme = useTheme();
  const mode: ChartMode = theme.palette.mode === "dark" ? "dark" : "light";

  const total = resumen ? Object.values(resumen.actasPorEstado).reduce((a, b) => a + b, 0) : 0;

  return (
    <ChartCard
      title="Actas por estado"
      subtitle="Distribución del total de actas del sistema."
      loading={loading}
      empty={!loading && total === 0}
      minHeight={140}
    >
      <Stack spacing={2.5}>
        <Stack
          direction="row"
          sx={{
            height: 34,
            borderRadius: 999,
            overflow: "hidden",
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          {ACTA_STATUS_ORDER.filter((status) => (resumen?.actasPorEstado[status] ?? 0) > 0).map((status) => {
            const count = resumen?.actasPorEstado[status] ?? 0;
            const pct = total > 0 ? (count / total) * 100 : 0;
            return (
              <Tooltip key={status} title={`${ACTA_STATUS_TOKENS[status].label}: ${numberFormatter.format(count)}`}>
                <Box
                  sx={{
                    width: `${pct}%`,
                    backgroundColor: getStatusColor(status, mode),
                    transition: "width 200ms ease-out",
                  }}
                />
              </Tooltip>
            );
          })}
        </Stack>

        <Stack direction="row" flexWrap="wrap" columnGap={2.5} rowGap={1}>
          {ACTA_STATUS_ORDER.map((status) => {
            const token = ACTA_STATUS_TOKENS[status];
            const count = resumen?.actasPorEstado[status] ?? 0;
            return (
              <Stack key={status} direction="row" alignItems="center" spacing={0.75}>
                <Box
                  sx={{
                    width: 9,
                    height: 9,
                    borderRadius: "50%",
                    backgroundColor: getStatusColor(status, mode),
                    flexShrink: 0,
                  }}
                />
                <Typography variant="body2" color="text.secondary">
                  {token.label}
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {numberFormatter.format(count)}
                </Typography>
              </Stack>
            );
          })}
        </Stack>
      </Stack>
    </ChartCard>
  );
}
