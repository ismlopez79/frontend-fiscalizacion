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
import type { CategoriaProduccionDto } from "@/types/dashboard";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const MAX_INDIVIDUAL_CATEGORIES = 7;

interface ChartRow {
  categoryName: string;
  total: number;
  color: string;
}

function CustomTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload as ChartRow;
  return (
    <ChartTooltipCard>
      <Typography variant="body2" fontWeight={600}>
        {row.categoryName}
      </Typography>
      <Typography variant="body2">Total: {fmt.format(row.total)}</Typography>
    </ChartTooltipCard>
  );
}

interface ProduccionPorCategoriaCardProps {
  data: CategoriaProduccionDto[] | undefined;
  loading: boolean;
}

/**
 * Pocas categorias (normalmente <10): un color por categoria, asignado por
 * la posicion FIJA de esa categoria en el catalogo (displayOrder) — no por
 * su posicion en este array, que cambia de orden segun el total de cada
 * filtro. Si hay mas de 8, las mas chicas se agrupan en "Otras" en vez de
 * inventar un noveno color.
 */
export function ProduccionPorCategoriaCard({ data, loading }: ProduccionPorCategoriaCardProps) {
  const theme = useTheme();
  const mode: ChartMode = theme.palette.mode === "dark" ? "dark" : "light";
  const reducedMotion = useReducedMotion();

  const categoriasQuery = useQuery({
    queryKey: ["categorias"],
    queryFn: catalogApi.getCategorias,
  });

  const catalogIndex = useMemo(() => {
    const map = new Map<string, number>();
    (categoriasQuery.data ?? [])
      .slice()
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .forEach((cat, index) => map.set(cat.name, index));
    return map;
  }, [categoriasQuery.data]);

  const rows = useMemo<ChartRow[]>(() => {
    const source = data ?? [];
    const colorFor = (name: string) => {
      const idx = catalogIndex.get(name);
      return getCategoryColor(idx ?? 0, mode);
    };

    if (source.length <= MAX_INDIVIDUAL_CATEGORIES) {
      return source.map((row) => ({ categoryName: row.categoryName, total: row.total, color: colorFor(row.categoryName) }));
    }

    const top = source.slice(0, MAX_INDIVIDUAL_CATEGORIES);
    const rest = source.slice(MAX_INDIVIDUAL_CATEGORIES);
    const otrosTotal = rest.reduce((sum, r) => sum + r.total, 0);

    return [
      ...top.map((row) => ({ categoryName: row.categoryName, total: row.total, color: colorFor(row.categoryName) })),
      { categoryName: "Otras", total: otrosTotal, color: OTHERS_CATEGORY_COLOR[mode] },
    ];
  }, [data, catalogIndex, mode]);

  return (
    <ChartCard
      title="Producción por categoría"
      subtitle="Suma de cantidades declaradas por categoría en el rango seleccionado."
      loading={loading || categoriasQuery.isLoading}
      empty={!loading && rows.length === 0}
    >
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={rows} margin={{ top: 8, right: 16, bottom: 24, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR[mode]} vertical={false} />
          <XAxis
            dataKey="categoryName"
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
              <Cell key={row.categoryName} fill={row.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
