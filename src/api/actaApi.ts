import { apiClient } from "./client";
import type { PageResponse } from "@/types/common";
import type {
  ActaBorradorActivo,
  ActaCommentRequest,
  ActaDraftSaveResponse,
  ActaFileDto,
  ActaListFilters,
  ActaPracticaResponse,
  ActaResponse,
  BulkApprovalResultDto,
  CreateActaRequest,
  CreateBorradorRequest,
  ReviewHistoryDto,
  UpdateBorradorRequest,
} from "@/types/acta";

export const actaApi = {
  getActas: async (
    filters: ActaListFilters,
    page: number,
    size: number
  ): Promise<PageResponse<ActaResponse>> => {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    if (filters.createdByMe !== undefined) params.set("createdByMe", String(filters.createdByMe));
    if (filters.status) params.set("status", filters.status);
    if (filters.actaNumber) params.set("actaNumber", filters.actaNumber);
    if (filters.actaDate) params.set("actaDate", filters.actaDate);
    if (filters.jveDelegateId !== undefined) params.set("jveDelegateId", String(filters.jveDelegateId));
    // Orden del listado: por fecha del acta (la columna "Fecha"), la mas
    // reciente primero; dentro de una misma fecha, la ultima ingresada al
    // sistema primero; "id" desempata para que el orden no cambie entre
    // paginas. Sin esto el backend ordena por actaDate ASCENDENTE
    // (@PageableDefault) y se veian primero las mas viejas.
    // Spring espera "sort" repetido (sort=...&sort=...), por eso URLSearchParams
    // y no un arreglo (axios lo mandaria como sort[]=).
    params.append("sort", "actaDate,desc");
    params.append("sort", "createdAt,desc");
    params.append("sort", "id,desc");
    const { data } = await apiClient.get<PageResponse<ActaResponse>>("/actas", { params });
    return data;
  },
  getActa: async (id: number): Promise<ActaResponse> => {
    const { data } = await apiClient.get<ActaResponse>(`/actas/${id}`);
    return data;
  },
  /** Decisiones del revisor sobre el acta (la pantalla las ordena). El autor solo ve las de sus actas. */
  getRevisiones: async (id: number): Promise<ReviewHistoryDto[]> => {
    const { data } = await apiClient.get<ReviewHistoryDto[]>(`/actas/${id}/revisiones`);
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
   * Corrige un acta en REGISTRADA, OBSERVADA o RECHAZADA: mismo body que createActa,
   * sin cambiar el departamento (su numero pertenece a el). Responde el acta
   * completa con el total recalculado y el mismo numero y estado. 409 si el
   * acta ya no esta en un estado corregible; 403 si no es del usuario.
   */
  updateActa: async (id: number, body: CreateActaRequest): Promise<ActaResponse> => {
    const { data } = await apiClient.put<ActaResponse>(`/actas/${id}`, body);
    return data;
  },
  /**
   * Modo practica: mismo body que createActa, pero el backend solo valida y
   * devuelve el acta simulada (numero PRACTICA-xxxx, id null) sin guardar
   * nada. 403 MODULE_DISABLED si el modulo TRAINING esta apagado.
   */
  crearActaPractica: async (body: CreateActaRequest): Promise<ActaPracticaResponse> => {
    const { data } = await apiClient.post<ActaPracticaResponse>("/practica/actas", body);
    return data;
  },
  /**
   * Modo practica: el backend valida la foto/PDF y la descarta. La respuesta
   * no trae enlace de descarga — la vista previa sale del archivo local.
   */
  validarArchivoPractica: async (file: File): Promise<void> => {
    const form = new FormData();
    form.append("file", file);
    await apiClient.post("/practica/actas/archivos", form);
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
  /**
   * PDF del acta, generado al vuelo por el backend (nunca se guarda en el
   * servidor) — mismo patron de blob autenticado que descargarArchivo, ya
   * que un <a href="..."> directo no puede llevar el header Authorization.
   * 409 BUSINESS_RULE_VIOLATION si el acta todavia esta en BORRADOR.
   */
  descargarPdf: async (actaId: number): Promise<Blob> => {
    const { data } = await apiClient.get(`/actas/${actaId}/pdf`, {
      responseType: "blob",
    });
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
   * Solo permitido mientras el acta esta en REGISTRADA, OBSERVADA o RECHAZADA (el
   * backend responde 400 BUSINESS_RULE_VIOLATION fuera de esos estados,
   * ej. si el estado cambio mientras la pantalla estaba abierta).
   */
  deleteArchivo: async (fileId: number): Promise<void> => {
    await apiClient.delete(`/actas/archivos/${fileId}`);
  },
};
