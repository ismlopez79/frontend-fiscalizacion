import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TooltipProps } from "recharts";
import { MenuItem, TextField, Typography, useTheme } from "@mui/material";
import { ACCENT_COLOR, CHART_GRID_COLOR, CHART_TEXT_COLOR } from "@/theme/dashboardColors";
import type { ChartMode } from "@/theme/dashboardColors";
import { dashboardNumberFormatter as fmt } from "../dashboardFormat";
import { ChartCard } from "./ChartCard";
import { ChartTooltipCard } from "./ChartTooltipCard";
import type { DashboardGroupBy, ProduccionPorFechaDto } from "@/types/dashboard";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const GROUP_BY_OPTIONS: { value: DashboardGroupBy; label: string }[] = [
  { value: "day", label: "Día" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mes" },
];

interface ProduccionPorFechaCardProps {
  data: ProduccionPorFechaDto[] | undefined;
  loading: boolean;
  groupBy: DashboardGroupBy;
  onGroupByChange: (groupBy: DashboardGroupBy) => void;
}

function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <ChartTooltipCard>
      <Typography variant="body2" fontWeight={600}>
        {label}
      </Typography>
      <Typography variant="body2">Producción: {fmt.format(payload[0].value as number)}</Typography>
    </ChartTooltipCard>
  );
}

/**
 * Cambio en el tiempo: area/linea con un solo eje Y (nunca dual-axis),
 * relleno sutil, y el ultimo punto destacado (para que se note de un
 * vistazo "donde vamos ahorita"). El color acento se reserva para esto y
 * el ranking de duicentros — nada mas en el dashboard lo usa.
 */
export function ProduccionPorFechaCard({ data, loading, groupBy, onGroupByChange }: ProduccionPorFechaCardProps) {
  const theme = useTheme();
  const mode: ChartMode = theme.palette.mode === "dark" ? "dark" : "light";
  const reducedMotion = useReducedMotion();
  const rows = data ?? [];
  const accent = ACCENT_COLOR[mode];

  const renderDot = (props: { cx?: number; cy?: number; index?: number }) => {
    const { cx, cy, index } = props;
    if (cx === undefined || cy === undefined) return <g />;
    const isLast = index === rows.length - 1;
    if (!isLast) return <circle cx={cx} cy={cy} r={0} fill="none" />;
    return <circle cx={cx} cy={cy} r={5} fill={accent} stroke={theme.palette.background.paper} strokeWidth={2} />;
  };

  return (
    <ChartCard
      title="Tendencia de producción"
      subtitle="Suma de cantidades declaradas a lo largo del tiempo."
      loading={loading}
      empty={!loading && rows.length === 0}
      actions={
        <TextField
          select
          size="small"
          label="Agrupar por"
          value={groupBy}
          onChange={(e) => onGroupByChange(e.target.value as DashboardGroupBy)}
          sx={{ minWidth: 140 }}
        >
          {GROUP_BY_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </TextField>
      }
    >
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={rows} margin={{ top: 16, right: 16, bottom: 8, left: 8 }}>
          <defs>
            <linearGradient id="produccionFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accent} stopOpacity={0.35} />
              <stop offset="100%" stopColor={accent} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR[mode]} vertical={false} />
          <XAxis dataKey="period" tick={{ fill: CHART_TEXT_COLOR[mode], fontSize: 12 }} />
          <YAxis tick={{ fill: CHART_TEXT_COLOR[mode], fontSize: 12 }} tickFormatter={(v) => fmt.format(v)} />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="total"
            stroke={accent}
            strokeWidth={2}
            fill="url(#produccionFill)"
            dot={renderDot}
            activeDot={{ r: 5, fill: accent }}
            isAnimationActive={!reducedMotion}
            animationDuration={300}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
