import { apiClient } from "./client";
import type { PageResponse } from "@/types/common";
import {
  COMPONENT_TYPES,
  COMPONENT_TYPE_LABELS,
  LAYOUT_LABELS,
  optionsFromPresetCode,
} from "@/types/fiscalizacionFases";
import type {
  ActivityDto,
  ActivityFilters,
  ActivityFormDto,
  ActivityFormListFilters,
  ActivityFormListItem,
  ActivityFormPhotoDto,
  ActivityFormSaveResponse,
  AddActivityDelegateRequest,
  Answers,
  CreateActivityRequest,
  CreatePhaseRequest,
  DelegateAvailabilityDto,
  FormTemplateDto,
  FormTemplateRequest,
  FormTemplateSummary,
  PhaseDto,
  TemplateBuilderCatalog,
  TemplateComponentType,
  TemplateLayout,
  TemplateOption,
  TemplateStatus,
  UpdateActivityRequest,
  UpdatePhaseRequest,
} from "@/types/fiscalizacionFases";

type RawCatalogEntry = string | { code?: string; name?: string; label?: string; description?: string; options?: unknown };

function entryCode(entry: RawCatalogEntry): string {
  return typeof entry === "string" ? entry : entry.code ?? entry.name ?? "";
}

function entryLabel(entry: RawCatalogEntry, fallback: string): string {
  if (typeof entry === "string") return fallback;
  return entry.label ?? (entry.code ? entry.name : undefined) ?? entry.description ?? fallback;
}

function readOptions(raw: unknown): TemplateOption[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  return raw.map((o) =>
    typeof o === "string" ? { code: o, label: o } : { code: String(o.code), label: String(o.label ?? o.name ?? o.code) }
  );
}

function pickList(raw: Record<string, unknown>, keys: string[]): RawCatalogEntry[] {
  for (const key of keys) {
    const value = raw[key];
    if (Array.isArray(value)) return value as RawCatalogEntry[];
  }
  return [];
}

/**
 * El catalogo del constructor se normaliza aqui (acepta listas de codigos o
 * de objetos {code,label,options}) y cae a los valores conocidos si algo no
 * viene: el constructor nunca queda sin tipos ni layouts para elegir.
 */
function normalizeCatalog(raw: unknown): TemplateBuilderCatalog {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;

  const types = pickList(obj, ["componentTypes", "types", "tipos"])
    .map((e) => entryCode(e) as TemplateComponentType)
    .filter((code) => COMPONENT_TYPES.includes(code));
  const layouts = pickList(obj, ["layouts", "sectionLayouts"])
    .map((e) => entryCode(e) as TemplateLayout)
    .filter((code) => code in LAYOUT_LABELS);
  const presets = pickList(obj, ["optionPresets", "presets"])
    .map((e) => {
      const code = entryCode(e);
      const options = (typeof e === "object" && readOptions(e.options)) || optionsFromPresetCode(code);
      return { code, label: entryLabel(e, options.map((o) => o.label).join(" / ")), options };
    })
    .filter((p) => !!p.code);

  return {
    componentTypes: (types.length ? types : COMPONENT_TYPES).map((code) => ({ code, label: COMPONENT_TYPE_LABELS[code] })),
    layouts: (layouts.length ? layouts : (Object.keys(LAYOUT_LABELS) as TemplateLayout[])).map((code) => ({
      code,
      label: LAYOUT_LABELS[code],
    })),
    optionPresets: presets,
  };
}

/** El listado puede venir como arreglo o paginado: se aceptan ambos. */
function asList<T>(data: T[] | PageResponse<T>): T[] {
  return Array.isArray(data) ? data : data?.content ?? [];
}

/**
 * Plantillas de formulario (permiso FORM_TEMPLATE_MANAGE para escribir).
 * Ciclo: BORRADOR (se edita) -> PUBLICADA (la que usan las fases, ya no se
 * edita) -> ARCHIVADA. Para cambiar una publicada: nuevaVersion, editar ese
 * borrador y publicarlo; los informes ya llenos conservan su version.
 */
export const formTemplateApi = {
  getPlantillas: async (status?: TemplateStatus): Promise<FormTemplateSummary[]> => {
    const { data } = await apiClient.get<FormTemplateSummary[] | PageResponse<FormTemplateSummary>>(
      "/plantillas-formulario",
      { params: status ? { status } : undefined }
    );
    return asList(data);
  },
  getPlantilla: async (id: number): Promise<FormTemplateDto> => {
    const { data } = await apiClient.get<FormTemplateDto>(`/plantillas-formulario/${id}`);
    return data;
  },
  getCatalogoConstructor: async (): Promise<TemplateBuilderCatalog> => {
    const { data } = await apiClient.get<unknown>("/plantillas-formulario/catalogo-constructor");
    return normalizeCatalog(data);
  },
  /** Queda como v1 en BORRADOR. */
  crear: async (body: FormTemplateRequest): Promise<FormTemplateDto> => {
    const { data } = await apiClient.post<FormTemplateDto>("/plantillas-formulario", body);
    return data;
  },
  /** Solo borradores. */
  actualizar: async (id: number, body: FormTemplateRequest): Promise<FormTemplateDto> => {
    const { data } = await apiClient.put<FormTemplateDto>(`/plantillas-formulario/${id}`, body);
    return data;
  },
  /** Archiva la version publicada anterior del mismo codigo. */
  publicar: async (id: number): Promise<FormTemplateDto> => {
    const { data } = await apiClient.post<FormTemplateDto>(`/plantillas-formulario/${id}/publicar`);
    return data;
  },
  /** Borrador nuevo a partir de una publicada. */
  nuevaVersion: async (id: number): Promise<FormTemplateDto> => {
    const { data } = await apiClient.post<FormTemplateDto>(`/plantillas-formulario/${id}/nueva-version`);
    return data;
  },
  archivar: async (id: number): Promise<FormTemplateDto> => {
    const { data } = await apiClient.post<FormTemplateDto>(`/plantillas-formulario/${id}/archivar`);
    return data;
  },
  /** Solo borradores. */
  eliminar: async (id: number): Promise<void> => {
    await apiClient.delete(`/plantillas-formulario/${id}`);
  },
};

/**
 * Fases del periodo. Todo periodo nace con las 6 precargadas; el admin solo
 * las ajusta. La fase apunta a la plantilla por CODIGO: siempre usa la
 * version publicada vigente. No hay DELETE: se desactiva con PUT.
 */
export const phaseApi = {
  /** Solo activas — cualquier autenticado. */
  getFases: async (periodId: number): Promise<PhaseDto[]> => {
    const { data } = await apiClient.get<PhaseDto[]>(`/periodos-electorales/${periodId}/fases`);
    return data;
  },
  /** Incluye inactivas — ELECTORAL_PERIOD_MANAGE. */
  getFasesTodas: async (periodId: number): Promise<PhaseDto[]> => {
    const { data } = await apiClient.get<PhaseDto[]>(`/periodos-electorales/${periodId}/fases/todas`);
    return data;
  },
  crearFase: async (periodId: number, body: CreatePhaseRequest): Promise<PhaseDto> => {
    const { data } = await apiClient.post<PhaseDto>(`/periodos-electorales/${periodId}/fases`, body);
    return data;
  },
  actualizarFase: async (id: number, body: UpdatePhaseRequest): Promise<PhaseDto> => {
    const { data } = await apiClient.put<PhaseDto>(`/fases/${id}`, body);
    return data;
  },
};

function activityParams(filters: ActivityFilters, page: number, size: number) {
  const params: Record<string, string | number | boolean> = { page, size };
  if (filters.periodoId !== undefined) params.periodoId = filters.periodoId;
  if (filters.faseId !== undefined) params.faseId = filters.faseId;
  if (filters.desde) params.desde = filters.desde;
  if (filters.hasta) params.hasta = filters.hasta;
  if (filters.departamentoId !== undefined) params.departamentoId = filters.departamentoId;
  if (filters.distritoId !== undefined) params.distritoId = filters.distritoId;
  if (filters.incluirCanceladas) params.incluirCanceladas = true;
  return params;
}

/**
 * Actividades: un evento concreto (fase + fecha + distrito + lugar) con su
 * equipo de delegados. Aislamiento: un delegado solo ve aquellas donde esta
 * asignado (403 en cualquier otra). Una vez enviado el informe, ni la
 * actividad ni sus delegados se pueden cambiar (409).
 */
export const activityApi = {
  /** Sin fecha: de hoy a 60 dias adelante. */
  getMias: async (fecha?: string): Promise<ActivityDto[]> => {
    const { data } = await apiClient.get<ActivityDto[]>("/actividades/mias", {
      params: fecha ? { fecha } : undefined,
    });
    return data;
  },
  getActividades: async (filters: ActivityFilters, page: number, size: number): Promise<PageResponse<ActivityDto>> => {
    const { data } = await apiClient.get<PageResponse<ActivityDto>>("/actividades", {
      params: activityParams(filters, page, size),
    });
    return data;
  },
  getActividad: async (id: number): Promise<ActivityDto> => {
    const { data } = await apiClient.get<ActivityDto>(`/actividades/${id}`);
    return data;
  },
  crear: async (body: CreateActivityRequest): Promise<ActivityDto> => {
    const { data } = await apiClient.post<ActivityDto>("/actividades", body);
    return data;
  },
  /** Corregir, o cancelar con active: false. */
  actualizar: async (id: number, body: UpdateActivityRequest): Promise<ActivityDto> => {
    const { data } = await apiClient.put<ActivityDto>(`/actividades/${id}`, body);
    return data;
  },
  agregarDelegado: async (id: number, body: AddActivityDelegateRequest): Promise<ActivityDto> => {
    const { data } = await apiClient.post<ActivityDto>(`/actividades/${id}/delegados`, body);
    return data;
  },
  /**
   * Temporales del periodo y usuarios DIGITADOR con su disponibilidad en esa
   * fecha (ASSIGNMENT_MANAGE). Para trasladar a alguien ocupado: quitarlo de
   * su actividad (quitarDelegado) y agregarlo en la nueva.
   */
  getDelegadosDisponibles: async (periodoId: number, fecha: string): Promise<DelegateAvailabilityDto[]> => {
    const { data } = await apiClient.get<DelegateAvailabilityDto[]>("/actividades/delegados-disponibles", {
      params: { periodoId, fecha },
    });
    return data;
  },
  /** asignacionId = delegates[].id (no el id del delegado). */
  quitarDelegado: async (id: number, asignacionId: number): Promise<void> => {
    await apiClient.delete(`/actividades/${id}/delegados/${asignacionId}`);
  },
};

/**
 * Informe de una actividad: uno solo, compartido por todos sus delegados.
 * El autoguardado (PATCH) manda SIEMPRE la foto completa de answers con la
 * version que se tiene; un 409 FORM_EDIT_CONFLICT significa que otro
 * delegado guardo antes — se avisa y se recarga, nunca se reintenta en
 * silencio (ver useActivityFormAutosave).
 */
export const activityFormApi = {
  /** null (204) = el informe todavia no se inicio. */
  getFormulario: async (activityId: number): Promise<ActivityFormDto | null> => {
    const { data, status } = await apiClient.get<ActivityFormDto>(`/actividades/${activityId}/formulario`);
    return status === 204 || !data ? null : data;
  },
  /** Crea el BORRADOR; si otro delegado ya lo abrio, devuelve ese mismo. Sin body. */
  iniciar: async (activityId: number): Promise<ActivityFormDto> => {
    const { data } = await apiClient.post<ActivityFormDto>(`/actividades/${activityId}/formulario`);
    return data;
  },
  autoguardar: async (activityId: number, version: number, answers: Answers): Promise<ActivityFormSaveResponse> => {
    const { data } = await apiClient.patch<ActivityFormSaveResponse>(`/actividades/${activityId}/formulario`, {
      version,
      answers,
    });
    return data;
  },
  enviar: async (activityId: number): Promise<ActivityFormDto> => {
    const { data } = await apiClient.post<ActivityFormDto>(`/actividades/${activityId}/formulario/enviar`);
    return data;
  },
  aprobar: async (activityId: number, comment?: string): Promise<ActivityFormDto> => {
    const { data } = await apiClient.post<ActivityFormDto>(
      `/actividades/${activityId}/formulario/aprobar`,
      comment ? { comment } : {}
    );
    return data;
  },
  observar: async (activityId: number, comment: string): Promise<ActivityFormDto> => {
    const { data } = await apiClient.post<ActivityFormDto>(`/actividades/${activityId}/formulario/observar`, { comment });
    return data;
  },
  rechazar: async (activityId: number, comment: string): Promise<ActivityFormDto> => {
    const { data } = await apiClient.post<ActivityFormDto>(`/actividades/${activityId}/formulario/rechazar`, { comment });
    return data;
  },
  /** Solo ADMINISTRADOR. */
  anular: async (activityId: number, comment: string): Promise<ActivityFormDto> => {
    const { data } = await apiClient.post<ActivityFormDto>(`/actividades/${activityId}/formulario/anular`, { comment });
    return data;
  },
  /** Lo ultimo que se envio. 409 si nunca se envio, 404 si no hay informe. */
  descargarPdf: async (activityId: number): Promise<Blob> => {
    const { data } = await apiClient.get(`/actividades/${activityId}/formulario/pdf`, { responseType: "blob" });
    return data;
  },
  getFormularios: async (
    filters: ActivityFormListFilters,
    page: number,
    size: number
  ): Promise<PageResponse<ActivityFormListItem>> => {
    const params: Record<string, string | number> = { page, size };
    if (filters.estado) params.estado = filters.estado;
    if (filters.periodoId !== undefined) params.periodoId = filters.periodoId;
    if (filters.faseId !== undefined) params.faseId = filters.faseId;
    const { data } = await apiClient.get<PageResponse<ActivityFormListItem>>("/formularios-actividad", { params });
    return data;
  },
};

/**
 * Anexo fotografico del informe: solo JPG o PNG de hasta 25 MB, entre
 * minPhotos y maxPhotos por informe. Se suben, editan y borran mientras el
 * informe esta en BORRADOR u OBSERVADA (cualquier delegado asignado o un
 * administrador). No toca la version del informe: no choca con el
 * autoguardado. Las imagenes llevan el header Authorization, asi que se piden
 * como blob y se muestran con una object URL.
 */
export const activityFormPhotoApi = {
  getFotos: async (activityId: number): Promise<ActivityFormPhotoDto[]> => {
    const { data } = await apiClient.get<ActivityFormPhotoDto[]>(`/actividades/${activityId}/formulario/fotos`);
    return data;
  },
  /** 409 si el tipo o el contenido no sirven, pasa de 25 MB, ya hay maxPhotos o el informe ya no se edita. */
  subir: async (
    activityId: number,
    file: File,
    descripcion?: string,
    onProgress?: (fraction: number) => void
  ): Promise<ActivityFormPhotoDto> => {
    const form = new FormData();
    form.append("file", file);
    if (descripcion?.trim()) form.append("descripcion", descripcion.trim());
    const { data } = await apiClient.post<ActivityFormPhotoDto>(`/actividades/${activityId}/formulario/fotos`, form, {
      onUploadProgress: onProgress ? (e) => e.total && onProgress(e.loaded / e.total) : undefined,
    });
    return data;
  },
  /** Copia reducida (JPG, 1600 px de lado mayor, ya enderezada): para miniaturas y vista ampliada. */
  ver: async (fotoId: number): Promise<Blob> => {
    const { data } = await apiClient.get(`/formularios-actividad/fotos/${fotoId}/ver`, { responseType: "blob" });
    return data;
  },
  /** El archivo original, tal como se subio. */
  descargar: async (fotoId: number): Promise<Blob> => {
    const { data } = await apiClient.get(`/formularios-actividad/fotos/${fotoId}/descargar`, { responseType: "blob" });
    return data;
  },
  /** Maximo 300 caracteres. */
  actualizarDescripcion: async (fotoId: number, description: string): Promise<ActivityFormPhotoDto> => {
    const { data } = await apiClient.patch<ActivityFormPhotoDto>(`/formularios-actividad/fotos/${fotoId}`, {
      description,
    });
    return data;
  },
  eliminar: async (fotoId: number): Promise<void> => {
    await apiClient.delete(`/formularios-actividad/fotos/${fotoId}`);
  },
};
