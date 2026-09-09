import type { ActaStatus } from "@/theme/statusTokens";

/**
 * Mismo enum que ActaStatus del lado del backend (literalmente la misma
 * maquina de estados) — se reusa el tipo y el chip/tokens de actas
 * (EstadoActaChip, ACTA_STATUS_TOKENS) tambien para formularios de
 * fiscalizacion, en vez de duplicar la paleta.
 */
export type FiscalizationFormStatus = ActaStatus;

/** { questionId, answer } — nunca el texto de la pregunta, eso se resuelve del catalogo al leer. */
export interface FiscalizationAnswerRequest {
  questionId: number;
  answer: string;
}

/** Igual que FiscalizationAnswerRequest pero resuelto contra el catalogo de preguntas (GET/finalizar en adelante). */
export interface FiscalizationAnswerResponse {
  questionId: number;
  questionText: string;
  answerType: "SI_NO" | "SI_NO_PARCIAL" | "TEXTO_LIBRE";
  answer: string;
}

/**
 * Contenido del borrador (autoguardado). No hace falta mandar un par por
 * cada pregunta del catalogo — solo las que el delegado ya respondio.
 */
export interface FiscalizationFormContent {
  arrivalTime?: string | null;
  departureTime?: string | null;
  observations?: string | null;
  respuestas?: FiscalizationAnswerRequest[];
}

export interface CreateFiscalizationBorradorRequest {
  serviceCenterId: number;
  formDate: string;
  content?: FiscalizationFormContent | null;
}

export interface UpdateFiscalizationBorradorRequest {
  serviceCenterId?: number;
  formDate?: string;
  content: FiscalizationFormContent;
}

/** Respuesta liviana de crear/autoguardar el borrador — el formulario aun no existe como tal hasta /finalizar. */
export interface FiscalizationDraftSaveResponse {
  id: number;
  formNumber: string | null;
  status: "BORRADOR";
  version: number;
  updatedAt: string;
}

/** GET /formularios-fiscalizacion/delegado/borrador-activo */
export interface FiscalizationBorradorActivo {
  id: number;
  formNumber: string | null;
  status: "BORRADOR";
  version: number;
  serviceCenterId: number;
  formDate: string;
  content: FiscalizationFormContent | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Shape que devuelven TODOS los endpoints de formularios ya guardados
 * (finalizar, consultar, y cada paso del flujo de revision). respuestas
 * viene siempre resuelto contra el catalogo (questionText/answerType
 * incluidos), nunca solo el id.
 */
export interface FiscalizationFormResponse {
  id: number;
  formNumber: string | null;
  serviceCenterId: number;
  serviceCenterName: string;
  electoralPeriodId: number;
  formDate: string;
  arrivalTime: string | null;
  departureTime: string | null;
  delegateName: string;
  status: FiscalizationFormStatus;
  observations: string | null;
  respuestas: FiscalizationAnswerResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface FiscalizationFormListFilters {
  createdByMe?: boolean;
  status?: FiscalizationFormStatus;
  serviceCenterId?: number;
  formDate?: string;
}

/** Body compartido por aprobar/observar/rechazar/anular. */
export interface FiscalizationCommentRequest {
  comment?: string | null;
}

/** Instantanea completa del formulario que usa el flujo de autoguardado (LocalStorage + PATCH con debounce). */
export interface FiscalizationDraftSnapshot {
  serviceCenterId: number;
  formDate: string;
  content: FiscalizationFormContent;
}
