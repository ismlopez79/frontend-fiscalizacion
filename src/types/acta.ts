import type { ActaStatus } from "@/theme/statusTokens";

export interface ProductionValueRequest {
  categoryId: number;
  quantity: number;
  needsVerification: boolean;
}

export interface ProductionValueResponse {
  id: number;
  categoryId: number;
  categoryName: string;
  quantity: number;
  needsVerification: boolean;
}

export interface ProduccionRequest {
  productionDate: string;
  observations?: string;
  declaredTotal?: number;
  values: ProductionValueRequest[];
}

export interface ProduccionResponse {
  id: number;
  productionDate: string;
  status: ActaStatus;
  declaredTotal: number | null;
  calculatedTotal: number;
  hasDiscrepancy: boolean;
  observations: string | null;
  values: ProductionValueResponse[];
}

export interface IncidenteRequest {
  incidentTypeId: number;
  description: string;
}

export interface IncidenteResponse {
  id: number;
  incidentTypeId: number;
  incidentTypeName: string;
  description: string;
}

export interface CreateActaRequest {
  departmentId: number;
  duicentroId: number;
  actaDate: string;
  arrivalTime?: string;
  departureTime?: string;
  /**
   * Solo tiene efecto para ADMINISTRADOR/SUPERVISOR (eleccion libre del
   * catalogo). Si quien crea el acta es DIGITADOR, el backend lo ignora
   * por completo y siempre usa el delegado JVE vinculado a ese usuario —
   * el frontend ni siquiera debe mandarlo en ese caso.
   */
  jveDelegateId?: number;
  /**
   * Delegado RNPN / jefe de duicentro: o se manda el id (elegido del
   * catalogo) o el nombre libre (persona no catalogada), nunca ambos para
   * el mismo campo — el formulario se encarga de la exclusion mutua.
   */
  rnpnDelegateId?: number;
  rnpnDelegateName?: string;
  duicentroChiefId?: number;
  duicentroChiefName?: string;
  observations?: string;
  declaredTotal?: number;
  producciones: ProduccionRequest[];
  incidentes?: IncidenteRequest[];
}

/**
 * Shape unico que devuelven TODOS los endpoints de actas (crear, consultar,
 * y cada paso del flujo de aprobacion).
 */
export interface ActaResponse {
  id: number;
  actaNumber: string;
  departmentId: number;
  departmentName: string;
  duicentroId: number;
  duicentroName: string;
  actaDate: string;
  arrivalTime: string | null;
  departureTime: string | null;
  jveDelegateName: string | null;
  rnpnDelegateName: string | null;
  duicentroChiefName: string | null;
  status: ActaStatus;
  observations: string | null;
  declaredTotal: number | null;
  /** SIEMPRE recalculado por el backend — el frontend nunca confia en su propio calculo. */
  calculatedTotal: number;
  hasDiscrepancy: boolean;
  possibleDuplicate: boolean;
  createdByUsername: string;
  createdAt: string;
  updatedAt: string;
  producciones: ProduccionResponse[];
  incidentes: IncidenteResponse[];
}

export interface ActaFileDto {
  id: number;
  actaId: number;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  fileHash: string;
  uploadedByUsername: string;
  uploadedAt: string;
  downloadUrl: string;
}

export interface ActaListFilters {
  createdByMe?: boolean;
  status?: ActaStatus;
  /** Busqueda parcial (contiene), sin distinguir mayusculas/minusculas. */
  actaNumber?: string;
  /** Fecha exacta del acta, formato YYYY-MM-DD. */
  actaDate?: string;
  jveDelegateId?: number;
}

/** POST /actas/pendientes-revision/aprobar-todas */
export interface BulkApprovalResultDto {
  approvedCount: number;
}

/** Body compartido por aprobar/observar/rechazar/anular. */
export interface ActaCommentRequest {
  comment?: string | null;
}

/**
 * Contenido del borrador (autoguardado): mismas claves que el cuerpo de
 * CreateActaRequest salvo departmentId/duicentroId/actaDate (esos viajan
 * aparte en el PATCH, ver UpdateBorradorRequest). El backend lo guarda tal
 * cual, sin validar, hasta que se llama /finalizar — por eso todo es
 * opcional aqui, a diferencia de CreateActaRequest.
 */
export interface ActaDraftContent {
  arrivalTime?: string | null;
  departureTime?: string | null;
  jveDelegateId?: number | null;
  rnpnDelegateId?: number | null;
  rnpnDelegateName?: string | null;
  duicentroChiefId?: number | null;
  duicentroChiefName?: string | null;
  observations?: string | null;
  declaredTotal?: number | null;
  producciones?: ProduccionRequest[];
  incidentes?: IncidenteRequest[];
}

export interface CreateBorradorRequest {
  departmentId: number;
  duicentroId: number;
  actaDate: string;
  content?: ActaDraftContent | null;
}

/**
 * Estrategia last-write-wins: el backend guarda lo ultimo que llega sin
 * comparar version (el borrador es de un solo dueño, no hay "otra sesion"
 * real editandolo a la vez). El @Version de la entidad sigue existiendo del
 * lado del backend como red de seguridad interna contra una carrera de
 * escritura real a nivel de fila — eso puede responder 409
 * OPTIMISTIC_LOCK_CONFLICT (rarisimo), que el frontend resuelve
 * reintentando el mismo autoguardado una vez, en silencio.
 */
export interface UpdateBorradorRequest {
  departmentId?: number;
  duicentroId?: number;
  actaDate?: string;
  content: ActaDraftContent;
}

/** Respuesta liviana de crear/autoguardar el borrador — no es el ActaResponse completo (el acta aun no existe como tal hasta /finalizar). */
export interface ActaDraftSaveResponse {
  id: number;
  actaNumber: string | null;
  status: "BORRADOR";
  version: number;
  updatedAt: string;
}

/** GET /actas/delegado/borrador-activo */
export interface ActaBorradorActivo {
  id: number;
  actaNumber: string | null;
  status: "BORRADOR";
  version: number;
  departmentId: number;
  duicentroId: number;
  actaDate: string;
  content: ActaDraftContent | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Instantanea completa del formulario de acta que usa el flujo de
 * autoguardado (LocalStorage a cada tecla + PATCH /actas/{id}/borrador con
 * debounce).
 */
export interface ActaDraftSnapshot {
  departmentId: number;
  duicentroId: number;
  actaDate: string;
  content: ActaDraftContent;
}
