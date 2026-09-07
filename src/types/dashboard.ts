import type { ActaStatus } from "@/theme/statusTokens";

export interface DashboardResumen {
  departamentosActivos: number;
  duicentrosActivos: number;
  usuariosActivos: number;
  actasTotal: number;
  actasPorEstado: Record<ActaStatus, number>;
  produccionTotal: number;
  actasConDiscrepancia: number;
  actasPosibleDuplicado: number;
  incidentesTotal: number;
  /** "YYYY-MM" — mes en curso segun el reloj del servidor, del dia 1 a hoy. */
  mesActual: string;
  produccionMesActual: number;
  actasMesActual: number;
}

export interface DuicentroTopDto {
  duicentroId: number;
  duicentroName: string;
  departmentName: string;
  totalProduccion: number;
  totalActas: number;
}

export interface CategoriaProduccionDto {
  categoryName: string;
  total: number;
}

export interface IncidentePorTipoDto {
  typeName: string;
  total: number;
}

export type DashboardGroupBy = "day" | "week" | "month";

export interface ProduccionPorFechaDto {
  period: string;
  total: number;
}

export interface DashboardDateRange {
  from?: string;
  to?: string;
}
