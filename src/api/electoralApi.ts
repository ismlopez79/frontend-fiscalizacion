import { apiClient } from "./client";
import type { BulkImportResult } from "@/types/bulkImport";
import type { ResetPasswordResponse } from "@/types/user";
import type {
  AssignmentDto,
  AssignmentFilters,
  CreateAssignmentRequest,
  CreateTemporaryDelegateRequest,
  ElectoralPeriodDto,
  ElectoralPeriodRequest,
  FiscalizationQuestionDto,
  FiscalizationQuestionRequest,
  ServiceCenterDto,
  ServiceCenterRequest,
  TemporaryDelegateDto,
  UpdateAssignmentRequest,
  UpdateTemporaryDelegateRequest,
} from "@/types/electoral";

/**
 * Ancla temporal de todo el modulo electoral: hay que crear y activar un
 * periodo antes de poder dar de alta delegados temporales o centros de
 * servicio (ambos referencian electoralPeriodId).
 */
export const electoralPeriodApi = {
  getPeriodos: async (): Promise<ElectoralPeriodDto[]> => {
    const { data } = await apiClient.get<ElectoralPeriodDto[]>("/periodos-electorales");
    return data;
  },
  createPeriodo: async (body: ElectoralPeriodRequest): Promise<ElectoralPeriodDto> => {
    const { data } = await apiClient.post<ElectoralPeriodDto>("/periodos-electorales", body);
    return data;
  },
  updatePeriodo: async (id: number, body: ElectoralPeriodRequest): Promise<ElectoralPeriodDto> => {
    const { data } = await apiClient.put<ElectoralPeriodDto>(`/periodos-electorales/${id}`, body);
    return data;
  },
  /** Marca este periodo active:true y desactiva automaticamente cualquier otro — solo puede haber uno activo a la vez. */
  activarPeriodo: async (id: number): Promise<ElectoralPeriodDto> => {
    const { data } = await apiClient.post<ElectoralPeriodDto>(`/periodos-electorales/${id}/activar`);
    return data;
  },
};

/**
 * Catalogo propio de delegados temporales (no viven en /api/usuarios, ver
 * comentario en types/electoral.ts). Igual que /usuarios: la contraseña solo
 * se toca via restablecerPassword, nunca vuelve en el POST de creacion.
 */
export const temporaryDelegateApi = {
  getDelegadosTemporales: async (electoralPeriodId?: number): Promise<TemporaryDelegateDto[]> => {
    const { data } = await apiClient.get<TemporaryDelegateDto[]>("/delegados-temporales", {
      params: electoralPeriodId ? { electoralPeriodId } : undefined,
    });
    return data;
  },
  createDelegadoTemporal: async (body: CreateTemporaryDelegateRequest): Promise<TemporaryDelegateDto> => {
    const { data } = await apiClient.post<TemporaryDelegateDto>("/delegados-temporales", body);
    return data;
  },
  updateDelegadoTemporal: async (
    id: number,
    body: UpdateTemporaryDelegateRequest
  ): Promise<TemporaryDelegateDto> => {
    const { data } = await apiClient.put<TemporaryDelegateDto>(`/delegados-temporales/${id}`, body);
    return data;
  },
  restablecerPassword: async (id: number, newPassword?: string): Promise<ResetPasswordResponse> => {
    const { data } = await apiClient.post<ResetPasswordResponse>(
      `/delegados-temporales/${id}/restablecer-password`,
      { newPassword: newPassword || undefined }
    );
    return data;
  },
  descargarPlantilla: async (): Promise<Blob> => {
    const { data } = await apiClient.get("/delegados-temporales/plantilla", { responseType: "blob" });
    return data;
  },
  /** Todas las filas del archivo entran al mismo periodo — no es una columna del Excel. */
  cargaMasiva: async (file: File, electoralPeriodId: number): Promise<BulkImportResult> => {
    const form = new FormData();
    form.append("file", file);
    const { data } = await apiClient.post<BulkImportResult>("/delegados-temporales/carga-masiva", form, {
      params: { electoralPeriodId },
    });
    return data;
  },
  getFotoPerfil: async (delegadoId: number): Promise<Blob> => {
    const { data } = await apiClient.get(`/delegados-temporales/${delegadoId}/foto-perfil`, {
      responseType: "blob",
    });
    return data;
  },
};

/** Centros habilitados durante un periodo (tipo JRV), analogos a los duicentros pero acotados a electoralPeriodId. */
export const serviceCenterApi = {
  getCentros: async (electoralPeriodId: number, onlyActive?: boolean): Promise<ServiceCenterDto[]> => {
    const { data } = await apiClient.get<ServiceCenterDto[]>("/centros-servicio", {
      params: { electoralPeriodId, onlyActive },
    });
    return data;
  },
  createCentro: async (body: ServiceCenterRequest): Promise<ServiceCenterDto> => {
    const { data } = await apiClient.post<ServiceCenterDto>("/centros-servicio", body);
    return data;
  },
  updateCentro: async (id: number, body: ServiceCenterRequest): Promise<ServiceCenterDto> => {
    const { data } = await apiClient.put<ServiceCenterDto>(`/centros-servicio/${id}`, body);
    return data;
  },
  descargarPlantilla: async (): Promise<Blob> => {
    const { data } = await apiClient.get("/centros-servicio/plantilla", { responseType: "blob" });
    return data;
  },
  /** Todas las filas del archivo entran al mismo periodo — no es una columna del Excel, igual criterio que la carga masiva de delegados temporales. */
  cargaMasiva: async (file: File, electoralPeriodId: number): Promise<BulkImportResult> => {
    const form = new FormData();
    form.append("file", file);
    const { data } = await apiClient.post<BulkImportResult>("/centros-servicio/carga-masiva", form, {
      params: { electoralPeriodId },
    });
    return data;
  },
};

/**
 * Rotacion de delegados por centro y fecha. PUT corrige centro/fecha de una
 * fila existente sin tocar al delegado; cambiar de delegado sigue siendo
 * desactivar (DELETE) + crear (POST) una nueva fila — ver comentario en
 * eliminarAsignacion.
 */
export const assignmentApi = {
  getAsignaciones: async (filters: AssignmentFilters = {}): Promise<AssignmentDto[]> => {
    const params: Record<string, string | number> = {};
    if (filters.fecha) params.fecha = filters.fecha;
    if (filters.centroServicioId !== undefined) params.centroServicioId = filters.centroServicioId;
    if (filters.delegadoTemporalId !== undefined) params.delegadoTemporalId = filters.delegadoTemporalId;
    if (filters.usuarioId !== undefined) params.usuarioId = filters.usuarioId;
    const { data } = await apiClient.get<AssignmentDto[]>("/asignaciones", { params });
    return data;
  },
  /** El propio delegado (temporal o permanente/DIGITADOR) consulta donde le toca fiscalizar. fecha opcional (por defecto hoy). Lista vacia si quien llama no tiene asignaciones. */
  getMisAsignaciones: async (fecha?: string): Promise<AssignmentDto[]> => {
    const { data } = await apiClient.get<AssignmentDto[]>("/asignaciones/mias", {
      params: fecha ? { fecha } : undefined,
    });
    return data;
  },
  crearAsignacion: async (body: CreateAssignmentRequest): Promise<AssignmentDto> => {
    const { data } = await apiClient.post<AssignmentDto>("/asignaciones", body);
    return data;
  },
  /** Corrige centro y/o fecha de una asignacion existente — no cambia de delegado. */
  actualizarAsignacion: async (id: number, body: UpdateAssignmentRequest): Promise<AssignmentDto> => {
    const { data } = await apiClient.put<AssignmentDto>(`/asignaciones/${id}`, body);
    return data;
  },
  /** Desactiva la asignacion (no la borra) — se conserva el historico de quien estuvo donde. */
  eliminarAsignacion: async (id: number): Promise<void> => {
    await apiClient.delete(`/asignaciones/${id}`);
  },
};

/**
 * Catalogo del checklist del formulario de fiscalizacion — mismo patron que
 * categorias de produccion / tipos de incidente (permiso CATALOG_MANAGE), no
 * vive hardcodeado en el frontend. El GET es publico (cualquier token) para
 * que el formulario del delegado pueda armarse dinamicamente.
 */
export const fiscalizationQuestionApi = {
  getPreguntas: async (): Promise<FiscalizationQuestionDto[]> => {
    const { data } = await apiClient.get<FiscalizationQuestionDto[]>("/preguntas-fiscalizacion");
    return data;
  },
  createPregunta: async (body: FiscalizationQuestionRequest): Promise<FiscalizationQuestionDto> => {
    const { data } = await apiClient.post<FiscalizationQuestionDto>("/preguntas-fiscalizacion", body);
    return data;
  },
  updatePregunta: async (id: number, body: FiscalizationQuestionRequest): Promise<FiscalizationQuestionDto> => {
    const { data } = await apiClient.put<FiscalizationQuestionDto>(`/preguntas-fiscalizacion/${id}`, body);
    return data;
  },
};
