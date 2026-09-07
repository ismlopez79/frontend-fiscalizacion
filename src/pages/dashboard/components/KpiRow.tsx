import { Stack } from "@mui/material";
import MapOutlinedIcon from "@mui/icons-material/MapOutlined";
import StoreOutlinedIcon from "@mui/icons-material/StoreOutlined";
import GroupOutlinedIcon from "@mui/icons-material/GroupOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import BarChartOutlinedIcon from "@mui/icons-material/BarChartOutlined";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import TrendingUpOutlinedIcon from "@mui/icons-material/TrendingUpOutlined";
import { StatTile } from "./StatTile";
import { formatMonthLabel } from "../dashboardFormat";
import type { DashboardResumen } from "@/types/dashboard";

interface KpiRowProps {
  resumen: DashboardResumen | undefined;
  loading: boolean;
}

/**
 * Fila de KPIs: numeros unicos sin serie de tiempo, van en stat tiles. Se
 * envuelve en flex-wrap para que en movil se reordene en columnas en vez de
 * forzar scroll horizontal.
 */
/**
 * Color fijo por tile (badge), no semaforo de severidad — solo distingue
 * visualmente cada tarjeta como en el diseño de referencia.
 */
const KPI_COLORS = {
  departamentos: "#2F6FED",
  duicentros: "#1E9E6B",
  usuarios: "#7C4FE0",
  actas: "#2F6FED",
  produccion: "#0EA5B7",
  discrepancia: "#B8860B",
  duplicados: "#D0362E",
  incidentes: "#B85A1E",
  actasMes: "#2F6FED",
  produccionMes: "#0EA5B7",
} as const;

export function KpiRow({ resumen, loading }: KpiRowProps) {
  const mesLabel = resumen?.mesActual ? formatMonthLabel(resumen.mesActual) : "este mes";

  return (
    <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
      <StatTile
        label="Departamentos activos"
        value={resumen?.departamentosActivos ?? null}
        icon={MapOutlinedIcon}
        color={KPI_COLORS.departamentos}
        loading={loading}
        index={0}
      />
      <StatTile
        label="Duicentros activos"
        value={resumen?.duicentrosActivos ?? null}
        icon={StoreOutlinedIcon}
        color={KPI_COLORS.duicentros}
        loading={loading}
        index={1}
      />
      <StatTile
        label="Usuarios activos"
        value={resumen?.usuariosActivos ?? null}
        icon={GroupOutlinedIcon}
        color={KPI_COLORS.usuarios}
        loading={loading}
        index={2}
      />
      <StatTile
        label="Actas totales"
        value={resumen?.actasTotal ?? null}
        icon={DescriptionOutlinedIcon}
        color={KPI_COLORS.actas}
        loading={loading}
        index={3}
      />
      <StatTile
        label={`Actas de ${mesLabel}`}
        value={resumen?.actasMesActual ?? null}
        icon={CalendarMonthOutlinedIcon}
        color={KPI_COLORS.actasMes}
        loading={loading}
        index={4}
      />
      <StatTile
        label="Producción total"
        value={resumen?.produccionTotal ?? null}
        icon={BarChartOutlinedIcon}
        color={KPI_COLORS.produccion}
        loading={loading}
        index={5}
      />
      <StatTile
        label={`Producción de ${mesLabel}`}
        value={resumen?.produccionMesActual ?? null}
        icon={TrendingUpOutlinedIcon}
        color={KPI_COLORS.produccionMes}
        loading={loading}
        index={6}
      />
      <StatTile
        label="Actas con discrepancia"
        value={resumen?.actasConDiscrepancia ?? null}
        icon={ReportProblemOutlinedIcon}
        color={KPI_COLORS.discrepancia}
        loading={loading}
        index={7}
      />
      <StatTile
        label="Posibles duplicados"
        value={resumen?.actasPosibleDuplicado ?? null}
        icon={ContentCopyOutlinedIcon}
        color={KPI_COLORS.duplicados}
        loading={loading}
        index={8}
      />
      <StatTile
        label="Incidentes totales"
        value={resumen?.incidentesTotal ?? null}
        icon={WarningAmberOutlinedIcon}
        color={KPI_COLORS.incidentes}
        loading={loading}
        index={9}
      />
    </Stack>
  );
}
