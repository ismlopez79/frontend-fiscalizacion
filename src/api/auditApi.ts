import { apiClient } from "./client";
import type { PageResponse } from "@/types/common";
import type { AuditLogDto, AuditLogFilters } from "@/types/audit";

/**
 * Consulta de solo lectura sobre audit_logs (permiso AUDIT_VIEW). Todos los
 * filtros son opcionales y se combinan con AND del lado del backend; aqui
 * solo se omiten los que esten vacios para no mandar parametros basura.
 */
export const auditApi = {
  getAuditLogs: async (
    filters: AuditLogFilters,
    page: number,
    size: number
  ): Promise<PageResponse<AuditLogDto>> => {
    const params: Record<string, string | number> = { page, size };
    if (filters.username) params.username = filters.username;
    if (filters.entityName) params.entityName = filters.entityName;
    if (filters.entityId !== undefined) params.entityId = filters.entityId;
    if (filters.action) params.action = filters.action;
    if (filters.from) params.from = filters.from;
    if (filters.to) params.to = filters.to;

    const { data } = await apiClient.get<PageResponse<AuditLogDto>>("/audit-logs", { params });
    return data;
  },
};
