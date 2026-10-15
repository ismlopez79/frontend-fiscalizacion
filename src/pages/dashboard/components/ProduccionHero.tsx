import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TooltipProps } from "recharts";
import { Box, Skeleton, Stack, Typography } from "@mui/material";
import { ACCENT_COLOR, CHART_GRID_COLOR, CHART_TEXT_COLOR } from "@/theme/dashboardColors";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { designTokens } from "@/theme/theme";
import type { DashboardGroupBy, DashboardResumen, ProduccionPorFechaDto } from "@/types/dashboard";
import { dashboardNumberFormatter as fmt, formatMonthLabel, formatRangeLabel } from "../dashboardFormat";
import { ChartTooltipCard } from "./ChartTooltipCard";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Surface } from "@/components/ui/Surface";

const GROUP_BY_OPTIONS: { value: DashboardGroupBy; label: string }[] = [
  { value: "day", label: "Día" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mes" },
];

const CHART_HEIGHT = 240;

interface ProduccionHeroProps {
  resumen: DashboardResumen | undefined;
  resumenLoading: boolean;
  serie: ProduccionPorFechaDto[] | undefined;
  serieLoading: boolean;
  from: string;
  to: string;
  groupBy: DashboardGroupBy;
  onGroupByChange: (groupBy: DashboardGroupBy) => void;
}

function TrendTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <ChartTooltipCard>
      <Typography variant="caption" display="block">
        {label}
      </Typography>
      <Typography sx={{ fontSize: "0.9375rem", fontWeight: 700, color: "text.primary" }}>
        {fmt.format(payload[0].value as number)}
      </Typography>
    </ChartTooltipCard>
  );
}

/**
 * La pieza principal del panel: la produccion. La cifra grande y la curva
 * cuentan lo mismo — con un rango activo, la cifra es la suma de la curva
 * (no el total historico), para que nunca se contradigan.
 */
export function ProduccionHero({
  resumen,
  resumenLoading,
  serie,
  serieLoading,
  from,
  to,
  groupBy,
  onGroupByChange,
}: ProduccionHeroProps) {
  const reducedMotion = useReducedMotion();
  const rows = serie ?? [];
  const accent = ACCENT_COLOR.light;
  const rangeActive = !!from || !!to;

  const rangeTotal = rows.reduce((sum, r) => sum + r.total, 0);
  const headline = rangeActive ? rangeTotal : resumen?.produccionTotal;
  // Con datos previos en pantalla no se vuelve a skeleton: la cifra se atenua mientras llega la nueva.
  const headlineLoading = rangeActive ? serieLoading && rows.length === 0 : resumenLoading;
  const mesLabel = resumen?.mesActual ? formatMonthLabel(resumen.mesActual) : "este mes";

  const renderLastDot = (props: { cx?: number; cy?: number; index?: number }) => {
    const { cx, cy, index } = props;
    if (cx === undefined || cy === undefined || index !== rows.length - 1) return <g key={index} />;
    return (
      <g key={index}>
        <circle cx={cx} cy={cy} r={9} fill={accent} opacity={0.14} />
        <circle cx={cx} cy={cy} r={4.5} fill={accent} stroke="#FFFFFF" strokeWidth={2} />
      </g>
    );
  };

  return (
    <Surface sx={{ p: { xs: 2.5, md: 3.5 } }}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "flex-end" }} gap={2}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {rangeActive ? `Producción · ${formatRangeLabel(from, to)}` : "Producción total"}
          </Typography>
          <Typography
            component="p"
            sx={{
              mt: 0.5,
              fontSize: { xs: "2.5rem", md: "3.5rem" },
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: "-0.035em",
              fontVariantNumeric: "tabular-nums",
              color: "text.primary",
            }}
          >
            {headlineLoading || headline === undefined ? <Skeleton width={220} /> : fmt.format(headline)}
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.75, fontVariantNumeric: "tabular-nums" }}>
            {resumenLoading || !resumen ? (
              <Skeleton width={180} />
            ) : rangeActive ? (
              <>
                Total histórico <Box component="strong" sx={{ color: "text.primary" }}>{fmt.format(resumen.produccionTotal)}</Box>
              </>
            ) : (
              <>
                <Box component="strong" sx={{ color: designTokens.accent }}>+{fmt.format(resumen.produccionMesActual)}</Box>{" "}
                en {mesLabel}
              </>
            )}
          </Typography>
        </Box>
        <SegmentedControl<DashboardGroupBy>
          ariaLabel="Agrupar la tendencia por"
          options={GROUP_BY_OPTIONS}
          value={groupBy}
          onChange={onGroupByChange}
        />
      </Stack>

      <Box sx={{ mt: 3, mx: { xs: -1, md: -1.5 }, opacity: serieLoading && rows.length > 0 ? 0.55 : 1, transition: "opacity 150ms ease" }}>
        {serieLoading && rows.length === 0 ? (
          <Skeleton variant="rounded" height={CHART_HEIGHT} sx={{ borderRadius: "14px" }} />
        ) : rows.length === 0 ? (
          <Stack alignItems="center" justifyContent="center" sx={{ height: CHART_HEIGHT, textAlign: "center" }}>
            <Typography sx={{ fontWeight: 600, color: "text.primary" }}>Sin producción en este rango</Typography>
            <Typography variant="body2">Prueba con “Todo” o amplía las fechas del acta.</Typography>
          </Stack>
        ) : (
          <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <AreaChart data={rows} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="heroFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={accent} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={CHART_GRID_COLOR.light} strokeOpacity={0.7} vertical={false} />
              <XAxis
                dataKey="period"
                tick={{ fill: CHART_TEXT_COLOR.light, fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                minTickGap={24}
              />
              <YAxis
                tick={{ fill: CHART_TEXT_COLOR.light, fontSize: 12 }}
                tickFormatter={(v) => fmt.format(v)}
                tickLine={false}
                axisLine={false}
                width={56}
              />
              <Tooltip
                content={<TrendTooltip />}
                cursor={{ stroke: accent, strokeOpacity: 0.25, strokeWidth: 1 }}
                wrapperStyle={{ outline: "none" }}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke={accent}
                strokeWidth={2.25}
                fill="url(#heroFill)"
                dot={renderLastDot}
                activeDot={{ r: 4.5, fill: accent, stroke: "#FFFFFF", strokeWidth: 2 }}
                isAnimationActive={!reducedMotion}
                animationDuration={420}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Box>
    </Surface>
  );
}
