import type { ActaStatus } from "@/theme/statusTokens";
import type { ReviewHistoryDto } from "@/types/acta";

/**
 * Fiscalizacion por fases: territorio, plantillas de formulario, fases del
 * periodo, actividades y el informe unico por actividad. Reemplaza al
 * formulario atado a un centro de servicio (ya eliminado):
 * cada fase usa su propio formato fisico, y varios delegados comparten un
 * solo informe por actividad.
 */

// ---------------------------------------------------------------- Territorio

/** Departamento -> municipio -> distrito. El distrito ya trae su municipio, no hay que pedirlo aparte. */
export interface MunicipalityDto {
  id: number;
  code: string;
  name: string;
  departmentId: number;
  active: boolean;
}

export interface DistrictDto {
  id: number;
  code: string;
  name: string;
  municipalityId: number;
  municipalityName: string;
  active: boolean;
}

// ---------------------------------------------------------------- Plantillas

export type TemplateStatus = "BORRADOR" | "PUBLICADA" | "ARCHIVADA";

/** FICHA: pares etiqueta/campo. TABLA: una fila por item, columnas por componente. */
export type TemplateLayout = "FICHA" | "TABLA";

export type TemplateComponentType =
  | "TEXTO"
  | "TEXTO_LARGO"
  | "NUMERO"
  | "TELEFONO"
  | "FECHA"
  | "HORA"
  | "SI_NO"
  | "OPCION_UNICA"
  | "OPCION_MULTIPLE"
  | "LISTA_TEXTO"
  | "CONTEO_POR_PARTIDO";

export interface TemplateOption {
  code: string;
  label: string;
}

export interface TemplateComponent {
  id?: number;
  code: string;
  /** Solo hace falta cuando el item tiene varios componentes; con uno solo se usa la etiqueta del item. */
  label: string | null;
  type: TemplateComponentType;
  required: boolean;
  /** Lleva optionPreset O options (minimo 2), nunca los dos. */
  optionPreset?: string | null;
  options?: TemplateOption[] | null;
}

export interface TemplateItem {
  id?: number;
  code: string;
  label: string;
  components: TemplateComponent[];
}

export interface TemplateSection {
  id?: number;
  title: string;
  layout: TemplateLayout;
  /** Solo TABLA: la primera columna es la etiqueta del item; luego una por componente. */
  columnHeaders: string[] | null;
  items: TemplateItem[];
}

export interface FormTemplateDto {
  id: number;
  code: string;
  name: string;
  formatCode: string | null;
  description: string | null;
  version: number;
  status: TemplateStatus;
  sections: TemplateSection[];
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string | null;
}

/** Fila del listado: la misma plantilla sin necesidad de traer las secciones. */
export type FormTemplateSummary = Omit<FormTemplateDto, "sections"> & { sections?: TemplateSection[] };

/** Body de POST /plantillas-formulario y de PUT /plantillas-formulario/{id} (mismo shape). */
export interface FormTemplateRequest {
  code: string;
  name: string;
  formatCode: string | null;
  description: string | null;
  sections: TemplateSection[];
}

/** Catalogo para el constructor, ya normalizado (ver formTemplateApi.getCatalogoConstructor). */
export interface TemplateBuilderCatalog {
  componentTypes: { code: TemplateComponentType; label: string }[];
  layouts: { code: TemplateLayout; label: string }[];
  optionPresets: { code: string; label: string; options: TemplateOption[] }[];
}

// ---------------------------------------------------------------- Fases

export interface PhaseDto {
  id: number;
  electoralPeriodId: number;
  code: string;
  name: string;
  formTemplateCode: string;
  formTemplateName: string | null;
  formTemplateVersion: number | null;
  /** Impresion de papeletas y desarrollo de votaciones: la actividad debe indicar el tipo de eleccion. */
  requiresElectionType: boolean;
  displayOrder: number;
  active: boolean;
}

export interface CreatePhaseRequest {
  code: string;
  name: string;
  formTemplateCode: string;
  requiresElectionType: boolean;
  displayOrder: number;
}

/** PUT: igual que el POST pero sin code y con active. No hay DELETE: se desactiva. */
export interface UpdatePhaseRequest {
  name: string;
  formTemplateCode: string;
  requiresElectionType: boolean;
  displayOrder: number;
  active: boolean;
}

// ---------------------------------------------------------------- Actividades

export type ElectionType = "PRESIDENCIAL" | "LEGISLATIVA" | "MUNICIPAL";

export const ELECTION_TYPES: ElectionType[] = ["PRESIDENCIAL", "LEGISLATIVA", "MUNICIPAL"];

export const ELECTION_TYPE_LABELS: Record<ElectionType, string> = {
  PRESIDENCIAL: "Presidencial",
  LEGISLATIVA: "Legislativa",
  MUNICIPAL: "Municipal",
};

export type ActivityDelegateType = "TEMPORARY" | "PERMANENT";

export interface ActivityDelegateDto {
  /** Id de la asignacion: es el que se usa para quitar al delegado (DELETE .../delegados/{id}). */
  id: number;
  delegateType: ActivityDelegateType;
  delegateId: number;
  fullName: string;
}

export interface ActivityDto {
  id: number;
  electoralPeriodId: number;
  phaseId: number;
  phaseCode: string;
  phaseName: string;
  formTemplateCode: string;
  activityDate: string;
  departmentId: number;
  departmentName: string;
  municipalityId: number;
  municipalityName: string;
  districtId: number;
  districtName: string;
  placeName: string;
  address: string | null;
  electionType: ElectionType | null;
  notes: string | null;
  active: boolean;
  delegates: ActivityDelegateDto[];
  createdAt: string;
  updatedAt: string;
}

export interface ActivityFilters {
  periodoId?: number;
  faseId?: number;
  desde?: string;
  hasta?: string;
  departamentoId?: number;
  distritoId?: number;
  incluirCanceladas?: boolean;
}

export interface CreateActivityRequest {
  phaseId: number;
  activityDate: string;
  districtId: number;
  placeName: string;
  address: string | null;
  /** Solo si la fase lo pide (requiresElectionType); 409 si sobra o falta. */
  electionType: ElectionType | null;
  notes: string | null;
  /** Maximo 30 cada uno. userIds deben ser usuarios con rol DIGITADOR. */
  temporaryDelegateIds: number[];
  userIds: number[];
}

/** Igual que el POST pero sin fase ni delegados, y con active (false = cancelar). */
export interface UpdateActivityRequest {
  activityDate: string;
  districtId: number;
  placeName: string;
  address: string | null;
  electionType: ElectionType | null;
  notes: string | null;
  active: boolean;
}

/**
 * Un delegado no puede estar en dos actividades activas el mismo dia (sea
 * cual sea la fase): el backend responde 409 al crear, agregar, cambiar la
 * fecha o reactivar. Esta ruta dice de antemano quien esta libre esa fecha.
 */
export interface DelegateAvailabilityDto {
  delegateType: ActivityDelegateType;
  delegateId: number;
  fullName: string;
  available: boolean;
  /** Donde esta ocupado ese dia (null si esta libre). */
  busyIn: {
    activityId: number;
    phaseName: string;
    placeName: string;
    districtName: string;
  } | null;
}

/** Exactamente uno de los dos. */
export type AddActivityDelegateRequest = { temporaryDelegateId: number } | { userId: number };

// ---------------------------------------------------------------- Informe

/** Mismo enum de estados que las actas (se reusan EstadoActaChip y sus tokens). */
export type ActivityFormStatus = ActaStatus;

/** Valor de una respuesta. Vacio (null, "", []) cuenta como "sin responder". */
export type PartyCount = { partyId: number; count: number };
export type AnswerValue = string | number | boolean | string[] | PartyCount[] | null;

/** Llave ITEM.COMPONENTE -> valor. */
export type Answers = Record<string, AnswerValue>;

export interface ActivityFormDelegate {
  delegateType: ActivityDelegateType;
  delegateId: number;
  fullName: string;
}

export interface ActivityFormDto {
  id: number;
  activityId: number;
  /** null hasta el primer envio. */
  formNumber: string | null;
  status: ActivityFormStatus;
  version: number;
  editable: boolean;
  answers: Answers;
  delegates: ActivityFormDelegate[];
  /** false: son los asignados hoy; true: ya quedaron fijados en el informe. */
  delegatesFinal: boolean;
  submittedAt: string | null;
  submittedByName: string | null;
  reviewComment: string | null;
  /** Historial de decisiones del revisor (aprobar, observar, rechazar, anular). */
  reviews: ReviewHistoryDto[];
  template: FormTemplateDto;
  /** Anexo fotografico. Subir o borrar una foto no cambia la version del informe. */
  photos: ActivityFormPhotoDto[];
  /** Fotos necesarias para enviar (ELECTION_PHOTOS_MIN en el backend). */
  minPhotos: number;
  /** Tope de fotos por informe (ELECTION_PHOTOS_MAX). */
  maxPhotos: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Foto del anexo. viewUrl/downloadUrl vienen con el prefijo /api: no se usan
 * tal cual (el cliente ya lo trae en su baseURL), se piden por id.
 */
export interface ActivityFormPhotoDto {
  id: number;
  formId: number;
  activityId: number;
  originalName: string;
  description: string | null;
  mimeType: string;
  sizeBytes: number;
  fileHash: string;
  uploadedByName: string;
  uploadedAt: string;
  viewUrl: string;
  downloadUrl: string;
}

export interface ActivityFormSaveResponse {
  id: number;
  status: ActivityFormStatus;
  version: number;
  updatedAt: string;
}

export interface ActivityFormListItem {
  id: number;
  activityId: number;
  formNumber: string | null;
  status: ActivityFormStatus;
  phaseCode: string;
  phaseName: string;
  activityDate: string;
  departmentName: string;
  districtName: string;
  placeName: string;
  submittedByName: string | null;
  submittedAt: string | null;
  updatedAt: string;
}

export interface ActivityFormListFilters {
  estado?: ActivityFormStatus;
  periodoId?: number;
  faseId?: number;
}

// ---------------------------------------------------------------- Etiquetas

export const COMPONENT_TYPE_LABELS: Record<TemplateComponentType, string> = {
  TEXTO: "Texto corto",
  TEXTO_LARGO: "Texto largo",
  NUMERO: "Número",
  TELEFONO: "Teléfono",
  FECHA: "Fecha",
  HORA: "Hora",
  SI_NO: "Sí / No",
  OPCION_UNICA: "Opción única",
  OPCION_MULTIPLE: "Opción múltiple",
  LISTA_TEXTO: "Lista de nombres",
  CONTEO_POR_PARTIDO: "Conteo por partido",
};

export const COMPONENT_TYPES = Object.keys(COMPONENT_TYPE_LABELS) as TemplateComponentType[];

export const LAYOUT_LABELS: Record<TemplateLayout, string> = {
  FICHA: "Ficha",
  TABLA: "Tabla",
};

export const TEMPLATE_STATUS_LABELS: Record<TemplateStatus, string> = {
  BORRADOR: "Borrador",
  PUBLICADA: "Publicada",
  ARCHIVADA: "Archivada",
};

export function isOptionType(type: TemplateComponentType): boolean {
  return type === "OPCION_UNICA" || type === "OPCION_MULTIPLE";
}

/** "BUENA_REGULAR_MALA" -> [BUENA "Buena", REGULAR "Regular", MALA "Mala"]. */
export function optionsFromPresetCode(preset: string): TemplateOption[] {
  return preset
    .split("_")
    .filter(Boolean)
    .map((code) => ({ code, label: code.charAt(0) + code.slice(1).toLowerCase() }));
}

/** Llave de una respuesta: ITEM.COMPONENTE. */
export function answerKey(itemCode: string, componentCode: string): string {
  return `${itemCode}.${componentCode}`;
}

export function isEmptyAnswer(value: AnswerValue | undefined): boolean {
  return value === null || value === undefined || value === "" || (Array.isArray(value) && value.length === 0);
}
