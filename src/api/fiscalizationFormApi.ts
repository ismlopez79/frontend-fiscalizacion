import { apiClient } from "./client";
import type { PageResponse } from "@/types/common";
import type {
  CreateFiscalizationBorradorRequest,
  FiscalizationBorradorActivo,
  FiscalizationCommentRequest,
  FiscalizationDraftSaveResponse,
  FiscalizationFormListFilters,
  FiscalizationFormResponse,
  UpdateFiscalizationBorradorRequest,
} from "@/types/fiscalizacionForm";

/**
 * Formularios de fiscalizacion electoral. Mismo patron de autoguardado y de
 * flujo de revision que actaApi — ver comentarios ahi para el detalle de
 * cada estrategia (last-write-wins, aislamiento por dueño, etc.), aqui solo
 * se anota lo que cambia respecto a actas.
 */
export const fiscalizationFormApi = {
  getFormularios: async (
    filters: FiscalizationFormListFilters,
    page: number,
    size: number
  ): Promise<PageResponse<FiscalizationFormResponse>> => {
    const params: Record<string, string | number | boolean> = { page, size };
    if (filters.createdByMe !== undefined) params.createdByMe = filters.createdByMe;
    if (filters.status) params.status = filters.status;
    if (filters.serviceCenterId !== undefined) params.serviceCenterId = filters.serviceCenterId;
    if (filters.formDate) params.formDate = filters.formDate;
    const { data } = await apiClient.get<PageResponse<FiscalizationFormResponse>>("/formularios-fiscalizacion", {
      params,
    });
    return data;
  },
  getFormulario: async (id: number): Promise<FiscalizationFormResponse> => {
    const { data } = await apiClient.get<FiscalizationFormResponse>(`/formularios-fiscalizacion/${id}`);
    return data;
  },
  getPendientesRevision: async (
    page: number,
    size: number
  ): Promise<PageResponse<FiscalizationFormResponse>> => {
    const { data } = await apiClient.get<PageResponse<FiscalizationFormResponse>>(
      "/formularios-fiscalizacion/pendientes-revision",
      { params: { page, size } }
    );
    return data;
  },
  crearBorrador: async (body: CreateFiscalizationBorradorRequest): Promise<FiscalizationDraftSaveResponse> => {
    const { data } = await apiClient.post<FiscalizationDraftSaveResponse>(
      "/formularios-fiscalizacion/borrador",
      body
    );
    return data;
  },
  autoguardarBorrador: async (
    id: number,
    body: UpdateFiscalizationBorradorRequest
  ): Promise<FiscalizationDraftSaveResponse> => {
    const { data } = await apiClient.patch<FiscalizationDraftSaveResponse>(
      `/formularios-fiscalizacion/${id}/borrador`,
      body
    );
    return data;
  },
  /** Asigna el formNumber y transiciona BORRADOR -> REGISTRADA. Sin body. */
  finalizarBorrador: async (id: number): Promise<FiscalizationFormResponse> => {
    const { data } = await apiClient.post<FiscalizationFormResponse>(`/formularios-fiscalizacion/${id}/finalizar`);
    return data;
  },
  /** Borrador BORRADOR mas reciente del delegado autenticado, solo si tiene contenido real. null si no hay ninguno (204). */
  getBorradorActivo: async (): Promise<FiscalizationBorradorActivo | null> => {
    const { data, status } = await apiClient.get<FiscalizationBorradorActivo>(
      "/formularios-fiscalizacion/delegado/borrador-activo"
    );
    return status === 204 ? null : data;
  },
  descartarBorrador: async (id: number): Promise<void> => {
    await apiClient.delete(`/formularios-fiscalizacion/${id}/borrador`);
  },
  enviarRevision: async (id: number): Promise<FiscalizationFormResponse> => {
    const { data } = await apiClient.post<FiscalizationFormResponse>(`/formularios-fiscalizacion/${id}/enviar-revision`);
    return data;
  },
  reanudar: async (id: number): Promise<FiscalizationFormResponse> => {
    const { data } = await apiClient.post<FiscalizationFormResponse>(`/formularios-fiscalizacion/${id}/reanudar`);
    return data;
  },
  aprobar: async (id: number, comment?: string): Promise<FiscalizationFormResponse> => {
    const body: FiscalizationCommentRequest = comment ? { comment } : {};
    const { data } = await apiClient.post<FiscalizationFormResponse>(`/formularios-fiscalizacion/${id}/aprobar`, body);
    return data;
  },
  observar: async (id: number, comment: string): Promise<FiscalizationFormResponse> => {
    const { data } = await apiClient.post<FiscalizationFormResponse>(`/formularios-fiscalizacion/${id}/observar`, {
      comment,
    });
    return data;
  },
  rechazar: async (id: number, comment: string): Promise<FiscalizationFormResponse> => {
    const { data } = await apiClient.post<FiscalizationFormResponse>(`/formularios-fiscalizacion/${id}/rechazar`, {
      comment,
    });
    return data;
  },
  anular: async (id: number, comment: string): Promise<FiscalizationFormResponse> => {
    const { data } = await apiClient.post<FiscalizationFormResponse>(`/formularios-fiscalizacion/${id}/anular`, {
      comment,
    });
    return data;
  },
};
