import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TooltipProps } from "recharts";
import { MenuItem, TextField, Typography, useTheme } from "@mui/material";
import { ACCENT_COLOR, CHART_GRID_COLOR, CHART_TEXT_COLOR } from "@/theme/dashboardColors";
import type { ChartMode } from "@/theme/dashboardColors";
import { dashboardNumberFormatter as fmt } from "../dashboardFormat";
import { ChartCard } from "./ChartCard";
import { ChartTooltipCard } from "./ChartTooltipCard";
import type { DuicentroTopDto } from "@/types/dashboard";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const LIMIT_OPTIONS = [5, 10, 20];

interface DuicentrosTopCardProps {
  data: DuicentroTopDto[] | undefined;
  loading: boolean;
  limit: number;
  onLimitChange: (limit: number) => void;
}

function CustomTooltip({ active, payload, mode }: TooltipProps<number, string> & { mode: ChartMode }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload as DuicentroTopDto;
  return (
    <ChartTooltipCard mode={mode}>
      <Typography variant="body2" fontWeight={600}>
        {row.duicentroName}
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block">
        {row.departmentName}
      </Typography>
      <Typography variant="body2" sx={{ mt: 0.5 }}>
        Producción: <strong>{fmt.format(row.totalProduccion)}</strong>
      </Typography>
      <Typography variant="body2">
        Actas: <strong>{fmt.format(row.totalActas)}</strong>
      </Typography>
    </ChartTooltipCard>
  );
}

/**
 * Ranking por magnitud con nombres largos: barra HORIZONTAL (los nombres no
 * se cortan ni rotan). Una sola serie ordenada -> un solo color de marca
 * (el acento), nada de paleta categorica aqui.
 */
export function DuicentrosTopCard({ data, loading, limit, onLimitChange }: DuicentrosTopCardProps) {
  const theme = useTheme();
  const mode: ChartMode = theme.palette.mode === "dark" ? "dark" : "light";
  const reducedMotion = useReducedMotion();
  const rows = data ?? [];
  const chartHeight = Math.max(rows.length, 1) * 40 + 40;

  return (
    <ChartCard
      title="Ranking de duicentros"
      subtitle="Producción total en el rango seleccionado."
      loading={loading}
      empty={!loading && rows.length === 0}
      minHeight={chartHeight}
      actions={
        <TextField
          select
          size="small"
          label="Mostrar"
          value={limit}
          onChange={(e) => onLimitChange(Number(e.target.value))}
          sx={{ minWidth: 130 }}
        >
          {LIMIT_OPTIONS.map((opt) => (
            <MenuItem key={opt} value={opt}>
              Top {opt}
            </MenuItem>
          ))}
        </TextField>
      }
    >
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart data={rows} layout="vertical" margin={{ top: 8, right: 24, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR[mode]} horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: CHART_TEXT_COLOR[mode], fontSize: 12 }}
            tickFormatter={(v) => fmt.format(v)}
          />
          <YAxis
            type="category"
            dataKey="duicentroName"
            width={170}
            tick={{ fill: CHART_TEXT_COLOR[mode], fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip mode={mode} />} cursor={{ fill: "transparent" }} />
          <Bar
            dataKey="totalProduccion"
            fill={ACCENT_COLOR[mode]}
            radius={[0, 4, 4, 0]}
            maxBarSize={22}
            isAnimationActive={!reducedMotion}
            animationDuration={300}
            animationEasing="ease-out"
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
