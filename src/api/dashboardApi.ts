import { apiClient } from "./client";
import type {
  CategoriaProduccionDto,
  DashboardDateRange,
  DashboardGroupBy,
  DashboardResumen,
  DuicentroTopDto,
  IncidentePorTipoDto,
  ProduccionPorFechaDto,
} from "@/types/dashboard";

/**
 * Metricas del panel de administrador (permiso REPORT_VIEW, sembrado hoy
 * para ADMINISTRADOR y SUPERVISOR). Las 4 consultas de produccion excluyen
 * actas ANULADA del lado del backend — el frontend no necesita filtrarlas.
 */
export const dashboardApi = {
  getResumen: async (): Promise<DashboardResumen> => {
    const { data } = await apiClient.get<DashboardResumen>("/dashboard/resumen");
    return data;
  },
  getDuicentrosTop: async (
    limit: number,
    range: DashboardDateRange
  ): Promise<DuicentroTopDto[]> => {
    const { data } = await apiClient.get<DuicentroTopDto[]>("/dashboard/duicentros-top", {
      params: { limit, from: range.from || undefined, to: range.to || undefined },
    });
    return data;
  },
  getProduccionPorCategoria: async (range: DashboardDateRange): Promise<CategoriaProduccionDto[]> => {
    const { data } = await apiClient.get<CategoriaProduccionDto[]>(
      "/dashboard/produccion-por-categoria",
      { params: { from: range.from || undefined, to: range.to || undefined } }
    );
    return data;
  },
  getProduccionPorFecha: async (
    range: DashboardDateRange,
    groupBy: DashboardGroupBy
  ): Promise<ProduccionPorFechaDto[]> => {
    const { data } = await apiClient.get<ProduccionPorFechaDto[]>("/dashboard/produccion-por-fecha", {
      params: { from: range.from || undefined, to: range.to || undefined, groupBy },
    });
    return data;
  },
  getIncidentesPorTipo: async (range: DashboardDateRange): Promise<IncidentePorTipoDto[]> => {
    const { data } = await apiClient.get<IncidentePorTipoDto[]>("/dashboard/incidentes-por-tipo", {
      params: { from: range.from || undefined, to: range.to || undefined },
    });
    return data;
  },
};
