export interface ElectoralPeriodDto {
  id: number;
  name: string;
  code: string;
  startDate: string;
  endDate: string;
  active: boolean;
}

/** Se crea siempre inactivo (active: false) — activarlo es un paso aparte, ver electoralPeriodApi.activar. */
export interface ElectoralPeriodRequest {
  name: string;
  code: string;
  startDate: string;
  endDate: string;
}

export interface TemporaryDelegateDto {
  id: number;
  username: string;
  fullName: string;
  dui: string;
  email: string | null;
  electoralPeriodId: number;
  electoralPeriodName: string;
  active: boolean;
  primerIngreso: boolean;
  locked: boolean;
  profilePhotoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTemporaryDelegateRequest {
  fullName: string;
  /** Requerido, formato 12345678-9. Unico cruzando esta tabla y /usuarios. */
  dui: string;
  email?: string;
  /** Opcional — si se omite, el backend lo deriva del dui. */
  username?: string;
  electoralPeriodId: number;
}

/** username es inmutable, igual que en /usuarios — por eso no aparece aqui. */
export interface UpdateTemporaryDelegateRequest {
  fullName: string;
  dui: string;
  email?: string;
  electoralPeriodId: number;
  active: boolean;
}

export interface ServiceCenterDto {
  id: number;
  code: string;
  name: string;
  departmentId: number;
  departmentName: string;
  address: string | null;
  electoralPeriodId: number;
  active: boolean;
}

export interface ServiceCenterRequest {
  code: string;
  name: string;
  departmentId: number;
  address?: string;
  electoralPeriodId: number;
  active: boolean;
}

export type AssignmentDelegateType = "TEMPORARY" | "PERMANENT";

/**
 * delegateType/delegateId/delegateName son genericos: cubren tanto un
 * delegado temporal como un usuario permanente con rol DIGITADOR, sin
 * duplicar un par de campos por cada fuente posible. Ya no existen
 * temporaryDelegateId/temporaryDelegateName sueltos.
 */
export interface AssignmentDto {
  id: number;
  serviceCenterId: number;
  serviceCenterName: string;
  delegateType: AssignmentDelegateType;
  delegateId: number;
  delegateName: string;
  assignmentDate: string;
  active: boolean;
}

export interface AssignmentFilters {
  fecha?: string;
  centroServicioId?: number;
  /** Filtra por delegado temporal. */
  delegadoTemporalId?: number;
  /** Filtra por delegado permanente (usuario con rol DIGITADOR). */
  usuarioId?: number;
}

/**
 * Exactamente uno de temporaryDelegateId/userId debe venir — 409 si vienen
 * ambos o ninguno. Si viene userId, ese usuario debe tener rol DIGITADOR.
 */
export interface CreateAssignmentRequest {
  serviceCenterId: number;
  temporaryDelegateId?: number;
  userId?: number;
  assignmentDate: string;
}

/**
 * Corrige el centro y/o la fecha de una asignacion ya existente — no cambia
 * de delegado (esa fila sigue siendo del mismo delegado). Para cambiar de
 * delegado, desactivar (DELETE) y crear una nueva (POST).
 */
export interface UpdateAssignmentRequest {
  serviceCenterId: number;
  assignmentDate: string;
}

export type FiscalizationAnswerType = "SI_NO" | "SI_NO_PARCIAL" | "TEXTO_LIBRE";

export const FISCALIZATION_ANSWER_TYPES: FiscalizationAnswerType[] = ["SI_NO", "SI_NO_PARCIAL", "TEXTO_LIBRE"];

export const FISCALIZATION_ANSWER_TYPE_LABELS: Record<FiscalizationAnswerType, string> = {
  SI_NO: "Sí / No",
  SI_NO_PARCIAL: "Sí / No / Parcial",
  TEXTO_LIBRE: "Texto libre",
};

export interface FiscalizationQuestionDto {
  id: number;
  code: string;
  text: string;
  answerType: FiscalizationAnswerType;
  active: boolean;
  displayOrder: number;
}

export interface FiscalizationQuestionRequest {
  code: string;
  text: string;
  answerType: FiscalizationAnswerType;
  active: boolean;
  displayOrder: number;
}
