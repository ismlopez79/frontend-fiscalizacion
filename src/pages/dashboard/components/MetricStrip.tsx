import { Box, Skeleton, Stack, Typography } from "@mui/material";
import type { SvgIconComponent } from "@mui/icons-material";
import MapOutlinedIcon from "@mui/icons-material/MapOutlined";
import StoreOutlinedIcon from "@mui/icons-material/StoreOutlined";
import GroupOutlinedIcon from "@mui/icons-material/GroupOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import BarChartOutlinedIcon from "@mui/icons-material/BarChartOutlined";
import TrendingUpOutlinedIcon from "@mui/icons-material/TrendingUpOutlined";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import { designTokens } from "@/theme/theme";
import type { DashboardResumen } from "@/types/dashboard";
import { dashboardNumberFormatter as fmt, formatMonthLabel } from "../dashboardFormat";
import { surfaceSx } from "@/components/ui/Surface";

/** Cifras del periodo elegido en la barra de filtros (un mes pasado, un rango...). */
export interface MetricPeriod {
  /** "de septiembre 2026" o "del periodo": completa "Actas ..." y "Producción ...". */
  label: string;
  actas: number | undefined;
  produccion: number | undefined;
  /** Llegando cifras nuevas con las anteriores aun en pantalla: se atenuan. */
  fetching: boolean;
}

interface MetricStripProps {
  resumen: DashboardResumen | undefined;
  loading: boolean;
  /** Sin periodo elegido se muestran las cifras del mes en curso que trae el resumen. */
  periodo?: MetricPeriod;
}

type Tone = "neutral" | "warning" | "error";

interface Metric {
  label: string;
  value: number | undefined;
  icon: SvgIconComponent;
  /** Solo se tiñe si value > 0: un cero en "duplicados" es una buena noticia, no una alerta. */
  tone: Tone;
  hint?: string;
  /** Cifra anterior en pantalla mientras llega la nueva. */
  fetching?: boolean;
}

const TONE_COLOR: Record<Exclude<Tone, "neutral">, string> = {
  warning: designTokens.status.warning.fg,
  error: designTokens.status.error.fg,
};

/**
 * Todos los indicadores del resumen en tres franjas (catalogos activos,
 * actividad, por revisar) separadas por lineas finas en vez de una tarjeta
 * por numero. Los que piden atencion (discrepancias, duplicados, incidentes)
 * solo se colorean cuando hay algo que revisar.
 */
export function MetricStrip({ resumen, loading, periodo }: MetricStripProps) {
  const mesLabel = resumen?.mesActual ? formatMonthLabel(resumen.mesActual) : "este mes";
  const periodoLabel = periodo?.label ?? `de ${mesLabel}`;

  const catalogo: Metric[] = [
    { label: "Departamentos activos", value: resumen?.departamentosActivos, icon: MapOutlinedIcon, tone: "neutral" },
    { label: "Duicentros activos", value: resumen?.duicentrosActivos, icon: StoreOutlinedIcon, tone: "neutral" },
    { label: "Usuarios activos", value: resumen?.usuariosActivos, icon: GroupOutlinedIcon, tone: "neutral" },
  ];

  const actividad: Metric[] = [
    { label: "Actas totales", value: resumen?.actasTotal, icon: DescriptionOutlinedIcon, tone: "neutral" },
    {
      label: `Actas ${periodoLabel}`,
      value: periodo ? periodo.actas : resumen?.actasMesActual,
      icon: CalendarMonthOutlinedIcon,
      tone: "neutral",
      fetching: periodo?.fetching,
    },
    { label: "Producción total", value: resumen?.produccionTotal, icon: BarChartOutlinedIcon, tone: "neutral" },
    {
      label: `Producción ${periodoLabel}`,
      value: periodo ? periodo.produccion : resumen?.produccionMesActual,
      icon: TrendingUpOutlinedIcon,
      tone: "neutral",
      fetching: periodo?.fetching,
    },
  ];

  const porRevisar: Metric[] = [
    {
      label: "Actas con discrepancia",
      value: resumen?.actasConDiscrepancia,
      icon: ReportProblemOutlinedIcon,
      tone: "warning",
      hint: "Por revisar",
    },
    {
      label: "Posibles duplicados",
      value: resumen?.actasPosibleDuplicado,
      icon: ContentCopyOutlinedIcon,
      tone: "error",
      hint: "Por revisar",
    },
    { label: "Incidentes totales", value: resumen?.incidentesTotal, icon: WarningAmberOutlinedIcon, tone: "warning" },
  ];

  return (
    <Stack gap={{ xs: 2, md: 2.5 }}>
      <Strip ariaLabel="Catálogos activos" metrics={catalogo} loading={loading} columns={{ sm: 3, md: 3 }} />
      <Strip ariaLabel="Actividad" metrics={actividad} loading={loading} columns={{ sm: 2, md: 4 }} />
      <Strip ariaLabel="Por revisar" metrics={porRevisar} loading={loading} columns={{ sm: 3, md: 3 }} />
    </Stack>
  );
}

interface StripProps {
  ariaLabel: string;
  metrics: Metric[];
  loading: boolean;
  columns: { sm: number; md: number };
}

/**
 * Todas las celdas de una fila comparten las mismas tres lineas (etiqueta,
 * cifra, nota) via subgrid: aunque una etiqueta ocupe dos renglones y otra
 * uno, o la cifra tenga 1 o 7 digitos, los numeros quedan centrados y a la
 * misma altura. En movil cada indicador es un renglon: etiqueta a la
 * izquierda y cifra a la derecha, alineadas en columna.
 */
function Strip({ ariaLabel, metrics, loading, columns }: StripProps) {
  return (
    <Box
      component="dl"
      aria-label={ariaLabel}
      sx={{
        ...surfaceSx,
        m: 0,
        overflow: "hidden",
        display: "grid",
        gridTemplateColumns: {
          xs: "1fr",
          sm: `repeat(${columns.sm}, minmax(0, 1fr))`,
          md: `repeat(${columns.md}, minmax(0, 1fr))`,
        },
        // gap de 1px sobre fondo de linea = divisores finos entre celdas.
        gap: "1px",
        bgcolor: "rgba(15, 23, 42, 0.06)",
      }}
    >
      {metrics.map((metric) => {
        const flagged = metric.tone !== "neutral" && (metric.value ?? 0) > 0;
        const color = flagged ? TONE_COLOR[metric.tone as Exclude<Tone, "neutral">] : undefined;
        const Icon = metric.icon;
        return (
          <Box
            key={metric.label}
            sx={{
              bgcolor: "background.paper",
              display: { xs: "flex", sm: "grid" },
              alignItems: "center",
              columnGap: 1.5,
              rowGap: 0,
              px: { xs: 2.25, sm: 1.5, md: 2 },
              py: { xs: 1.5, sm: 2.5 },
              minHeight: { xs: 56, sm: 0 },
              gridRow: { sm: "span 3" },
              gridTemplateRows: { sm: "subgrid" },
              justifyItems: { sm: "center" },
              textAlign: { sm: "center" },
            }}
          >
            <Stack
              component="dt"
              direction={{ xs: "row", sm: "column" }}
              alignItems="center"
              gap={{ xs: 1.25, sm: 0.75 }}
              sx={{ flex: 1, minWidth: 0, alignSelf: { sm: "start" } }}
            >
              <Icon sx={{ fontSize: 18, color: color ?? designTokens.textCaption, flexShrink: 0 }} />
              <Typography variant="body2" sx={{ fontWeight: 500, lineHeight: 1.3, textWrap: "balance" }}>
                {metric.label}
              </Typography>
            </Stack>
            <Box
              component="dd"
              sx={{
                m: 0,
                mt: { sm: 1.25 },
                gridRow: { sm: 2 },
                order: { xs: 2, sm: 0 },
                opacity: metric.fetching ? 0.5 : 1,
                transition: "opacity 150ms ease",
              }}
            >
              {loading || metric.value === undefined ? (
                <Skeleton width={64} height={36} />
              ) : (
                <Typography
                  sx={{
                    fontSize: { xs: "1.375rem", sm: "1.5rem", md: "1.75rem" },
                    fontWeight: 700,
                    letterSpacing: "-0.025em",
                    lineHeight: 1.15,
                    whiteSpace: "nowrap",
                    fontVariantNumeric: "tabular-nums",
                    color: color ?? "text.primary",
                  }}
                >
                  {fmt.format(metric.value)}
                </Typography>
              )}
            </Box>
            {flagged && metric.hint && !loading && (
              <Typography
                component="dd"
                variant="caption"
                sx={{ m: 0, mt: { sm: 0.5 }, gridRow: { sm: 3 }, order: { xs: 1, sm: 0 }, color, whiteSpace: "nowrap" }}
              >
                {metric.hint}
              </Typography>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
