import { apiClient } from "./client";
import type { PageResponse } from "@/types/common";
import type {
  ActaBorradorActivo,
  ActaCommentRequest,
  ActaDraftSaveResponse,
  ActaFileDto,
  ActaListFilters,
  ActaResponse,
  BulkApprovalResultDto,
  CreateActaRequest,
  CreateBorradorRequest,
  UpdateBorradorRequest,
} from "@/types/acta";

export const actaApi = {
  getActas: async (
    filters: ActaListFilters,
    page: number,
    size: number
  ): Promise<PageResponse<ActaResponse>> => {
    const params: Record<string, string | number | boolean> = { page, size };
    if (filters.createdByMe !== undefined) params.createdByMe = filters.createdByMe;
    if (filters.status) params.status = filters.status;
    if (filters.actaNumber) params.actaNumber = filters.actaNumber;
    if (filters.actaDate) params.actaDate = filters.actaDate;
    if (filters.jveDelegateId !== undefined) params.jveDelegateId = filters.jveDelegateId;
    const { data } = await apiClient.get<PageResponse<ActaResponse>>("/actas", { params });
    return data;
  },
  getActa: async (id: number): Promise<ActaResponse> => {
    const { data } = await apiClient.get<ActaResponse>(`/actas/${id}`);
    return data;
  },
  /** Bandeja de revisor: endpoint dedicado, no es /actas con filtro de status. */
  getPendientesRevision: async (page: number, size: number): Promise<PageResponse<ActaResponse>> => {
    const { data } = await apiClient.get<PageResponse<ActaResponse>>("/actas/pendientes-revision", {
      params: { page, size },
    });
    return data;
  },
  /** Aprueba de una sola vez todas las actas en PENDIENTE_REVISION (misma cola que getPendientesRevision). */
  aprobarTodasPendientes: async (): Promise<BulkApprovalResultDto> => {
    const { data } = await apiClient.post<BulkApprovalResultDto>("/actas/pendientes-revision/aprobar-todas");
    return data;
  },
  createActa: async (body: CreateActaRequest): Promise<ActaResponse> => {
    const { data } = await apiClient.post<ActaResponse>("/actas", body);
    return data;
  },
  /**
   * Flujo de autoguardado (reemplaza a createActa durante la captura, ver
   * doc "Actas — autoguardado de borrador"). Inicializa el borrador apenas
   * el digitador elige departamento + duicentro + fecha; el numero de acta
   * se asigna solo hasta /finalizar.
   */
  crearBorrador: async (body: CreateBorradorRequest): Promise<ActaDraftSaveResponse> => {
    const { data } = await apiClient.post<ActaDraftSaveResponse>("/actas/borrador", body);
    return data;
  },
  /**
   * Autoguardado periodico: manda la foto completa del formulario, no un
   * diff. Last-write-wins — el backend guarda lo ultimo que llega sin
   * comparar version. Solo puede responder 409 si el acta ya no esta en
   * BORRADOR, o (rarisimo) OPTIMISTIC_LOCK_CONFLICT por una carrera real de
   * escritura a nivel de fila.
   */
  autoguardarBorrador: async (id: number, body: UpdateBorradorRequest): Promise<ActaDraftSaveResponse> => {
    const { data } = await apiClient.patch<ActaDraftSaveResponse>(`/actas/${id}/borrador`, body);
    return data;
  },
  /**
   * Valida todo el contenido acumulado (mismas reglas que createActa) y
   * transiciona BORRADOR -> REGISTRADA, asignando el numero de acta. Sin
   * body. 409 si falta algo obligatorio.
   */
  finalizarBorrador: async (id: number): Promise<ActaResponse> => {
    const { data } = await apiClient.post<ActaResponse>(`/actas/${id}/finalizar`);
    return data;
  },
  /**
   * Borrador BORRADOR mas reciente del usuario autenticado (uno por
   * digitador en la practica). Se llama al entrar a "nueva acta" para
   * recuperar un borrador sin terminar. null si no hay ninguno (204).
   */
  getBorradorActivo: async (): Promise<ActaBorradorActivo | null> => {
    const { data, status } = await apiClient.get<ActaBorradorActivo>("/actas/delegado/borrador-activo");
    return status === 204 ? null : data;
  },
  /**
   * Descarta un borrador sin terminar (lo pasa a ANULADA). Sin body. Se usa
   * cuando el digitador, al recuperar un borrador al entrar a "nueva acta",
   * elige empezar de cero en vez de continuarlo. Errores: 404 si no existe,
   * 403 si no es suyo, 409 si ya no esta en BORRADOR.
   */
  descartarBorrador: async (id: number): Promise<void> => {
    await apiClient.delete(`/actas/${id}/borrador`);
  },
  enviarRevision: async (id: number): Promise<ActaResponse> => {
    const { data } = await apiClient.post<ActaResponse>(`/actas/${id}/enviar-revision`);
    return data;
  },
  reanudar: async (id: number): Promise<ActaResponse> => {
    const { data } = await apiClient.post<ActaResponse>(`/actas/${id}/reanudar`);
    return data;
  },
  /** El comentario es opcional (el backend acepta omitirlo o { comment: null }). */
  aprobar: async (id: number, comment?: string): Promise<ActaResponse> => {
    const body: ActaCommentRequest = comment ? { comment } : {};
    const { data } = await apiClient.post<ActaResponse>(`/actas/${id}/aprobar`, body);
    return data;
  },
  observar: async (id: number, comment: string): Promise<ActaResponse> => {
    const { data } = await apiClient.post<ActaResponse>(`/actas/${id}/observar`, { comment });
    return data;
  },
  rechazar: async (id: number, comment: string): Promise<ActaResponse> => {
    const { data } = await apiClient.post<ActaResponse>(`/actas/${id}/rechazar`, { comment });
    return data;
  },
  anular: async (id: number, comment: string): Promise<ActaResponse> => {
    const { data } = await apiClient.post<ActaResponse>(`/actas/${id}/anular`, { comment });
    return data;
  },
  getArchivos: async (actaId: number): Promise<ActaFileDto[]> => {
    const { data } = await apiClient.get<ActaFileDto[]>(`/actas/${actaId}/archivos`);
    return data;
  },
  uploadArchivo: async (actaId: number, file: File): Promise<ActaFileDto> => {
    const form = new FormData();
    form.append("file", file);
    const { data } = await apiClient.post<ActaFileDto>(`/actas/${actaId}/archivos`, form);
    return data;
  },
  /**
   * El backend pide el binario con Content-Disposition: attachment y
   * requiere el header Authorization — un <img src="..."> o <a href="...">
   * directo no puede llevar ese header, asi que hay que traerlo como blob
   * via el cliente autenticado y armar una object URL en el navegador.
   */
  descargarArchivo: async (fileId: number): Promise<Blob> => {
    const { data } = await apiClient.get(`/actas/archivos/${fileId}/descargar`, {
      responseType: "blob",
    });
    return data;
  },
  /**
   * Solo permitido mientras el acta esta en REGISTRADA u OBSERVADA (el
   * backend responde 400 BUSINESS_RULE_VIOLATION fuera de esos estados,
   * ej. si el estado cambio mientras la pantalla estaba abierta).
   */
  deleteArchivo: async (fileId: number): Promise<void> => {
    await apiClient.delete(`/actas/archivos/${fileId}`);
  },
};
