import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TooltipProps } from "recharts";
import { Typography, useTheme } from "@mui/material";
import { catalogApi } from "@/api/catalogApi";
import {
  CHART_GRID_COLOR,
  CHART_TEXT_COLOR,
  CHART_TOOLTIP_BG,
  OTHERS_CATEGORY_COLOR,
  getCategoryColor,
} from "@/theme/dashboardColors";
import type { ChartMode } from "@/theme/dashboardColors";
import { dashboardNumberFormatter as fmt } from "../dashboardFormat";
import { ChartCard } from "./ChartCard";
import { ChartTooltipCard } from "./ChartTooltipCard";
import type { IncidentePorTipoDto } from "@/types/dashboard";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const MAX_INDIVIDUAL_TYPES = 7;

interface ChartRow {
  typeName: string;
  total: number;
  color: string;
}

function CustomTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload as ChartRow;
  return (
    <ChartTooltipCard>
      <Typography variant="body2" fontWeight={600}>
        {row.typeName}
      </Typography>
      <Typography variant="body2">Total: {fmt.format(row.total)}</Typography>
    </ChartTooltipCard>
  );
}

interface IncidentesPorTipoCardProps {
  data: IncidentePorTipoDto[] | undefined;
  loading: boolean;
}

/**
 * Mismo tratamiento que ProduccionPorCategoriaCard: un color por tipo,
 * asignado por la posicion FIJA de ese tipo en el catalogo tipos-incidente
 * (displayOrder), no por su posicion en este array. Mas de 7 tipos se
 * agrupan en "Otras".
 */
export function IncidentesPorTipoCard({ data, loading }: IncidentesPorTipoCardProps) {
  const theme = useTheme();
  const mode: ChartMode = theme.palette.mode === "dark" ? "dark" : "light";
  const reducedMotion = useReducedMotion();

  const tiposQuery = useQuery({
    queryKey: ["tipos-incidente"],
    queryFn: catalogApi.getTiposIncidente,
  });

  const catalogIndex = useMemo(() => {
    const map = new Map<string, number>();
    (tiposQuery.data ?? [])
      .slice()
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .forEach((tipo, index) => map.set(tipo.name, index));
    return map;
  }, [tiposQuery.data]);

  const rows = useMemo<ChartRow[]>(() => {
    const source = data ?? [];
    const colorFor = (name: string) => {
      const idx = catalogIndex.get(name);
      return getCategoryColor(idx ?? 0, mode);
    };

    if (source.length <= MAX_INDIVIDUAL_TYPES) {
      return source.map((row) => ({ typeName: row.typeName, total: row.total, color: colorFor(row.typeName) }));
    }

    const top = source.slice(0, MAX_INDIVIDUAL_TYPES);
    const rest = source.slice(MAX_INDIVIDUAL_TYPES);
    const otrosTotal = rest.reduce((sum, r) => sum + r.total, 0);

    return [
      ...top.map((row) => ({ typeName: row.typeName, total: row.total, color: colorFor(row.typeName) })),
      { typeName: "Otras", total: otrosTotal, color: OTHERS_CATEGORY_COLOR[mode] },
    ];
  }, [data, catalogIndex, mode]);

  return (
    <ChartCard
      title="Incidentes por tipo"
      subtitle="Cantidad de incidentes registrados por tipo en el rango seleccionado."
      loading={loading || tiposQuery.isLoading}
      empty={!loading && rows.length === 0}
    >
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={rows} margin={{ top: 8, right: 16, bottom: 24, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR[mode]} vertical={false} />
          <XAxis
            dataKey="typeName"
            tick={{ fill: CHART_TEXT_COLOR[mode], fontSize: 12 }}
            interval={0}
            angle={-20}
            textAnchor="end"
            height={60}
          />
          <YAxis tick={{ fill: CHART_TEXT_COLOR[mode], fontSize: 12 }} tickFormatter={(v) => fmt.format(v)} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: CHART_TOOLTIP_BG[mode], opacity: 0.4 }} />
          <Bar
            dataKey="total"
            radius={[4, 4, 0, 0]}
            maxBarSize={56}
            isAnimationActive={!reducedMotion}
            animationDuration={300}
            animationEasing="ease-out"
          >
            {rows.map((row) => (
              <Cell key={row.typeName} fill={row.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
