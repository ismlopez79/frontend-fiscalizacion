import { apiClient } from "./client";
import type {
  DelegateDto,
  DelegateRequest,
  DepartmentDto,
  DepartmentRequest,
  DuicentroDto,
  DuicentroRequest,
  IncidentTypeDto,
  IncidentTypeRequest,
  ProductionCategoryDto,
  ProductionCategoryRequest,
} from "@/types/catalog";
import type { BulkImportResult } from "@/types/bulkImport";

async function downloadPlantilla(path: string): Promise<Blob> {
  const { data } = await apiClient.get(path, { responseType: "blob" });
  return data;
}

async function cargaMasiva(path: string, file: File): Promise<BulkImportResult> {
  const form = new FormData();
  form.append("file", file);
  // No fijar Content-Type a mano aqui: el interceptor de apiClient (ver
  // client.ts) borra el default "application/json" para bodies FormData,
  // así que axios/el navegador ponen multipart/form-data con el boundary
  // correcto solos.
  const { data } = await apiClient.post<BulkImportResult>(path, form);
  return data;
}

/**
 * Catalogos operativos (permiso CATALOG_MANAGE para escritura). Los GET
 * "simples" (sin /todos) solo devuelven activos y no exigen ese permiso —
 * cualquier autenticado puede leerlos para armar selects en el formulario
 * de actas. Las pantallas de administracion usan los /todos donde existen
 * para poder ver y reactivar los inactivos.
 */
export const catalogApi = {
  getDepartamentos: async (): Promise<DepartmentDto[]> => {
    const { data } = await apiClient.get<DepartmentDto[]>("/departamentos");
    return data;
  },
  getDepartamentosTodos: async (): Promise<DepartmentDto[]> => {
    const { data } = await apiClient.get<DepartmentDto[]>("/departamentos/todos");
    return data;
  },
  createDepartamento: async (body: DepartmentRequest): Promise<DepartmentDto> => {
    const { data } = await apiClient.post<DepartmentDto>("/departamentos", body);
    return data;
  },
  updateDepartamento: async (id: number, body: DepartmentRequest): Promise<DepartmentDto> => {
    const { data } = await apiClient.put<DepartmentDto>(`/departamentos/${id}`, body);
    return data;
  },
  descargarPlantillaDepartamentos: () => downloadPlantilla("/departamentos/plantilla"),
  cargaMasivaDepartamentos: (file: File) => cargaMasiva("/departamentos/carga-masiva", file),

  getDuicentros: async (departmentId?: number): Promise<DuicentroDto[]> => {
    const { data } = await apiClient.get<DuicentroDto[]>("/duicentros", {
      params: departmentId ? { departmentId } : undefined,
    });
    return data;
  },
  createDuicentro: async (body: DuicentroRequest): Promise<DuicentroDto> => {
    const { data } = await apiClient.post<DuicentroDto>("/duicentros", body);
    return data;
  },
  updateDuicentro: async (id: number, body: DuicentroRequest): Promise<DuicentroDto> => {
    const { data } = await apiClient.put<DuicentroDto>(`/duicentros/${id}`, body);
    return data;
  },
  descargarPlantillaDuicentros: () => downloadPlantilla("/duicentros/plantilla"),
  cargaMasivaDuicentros: (file: File) => cargaMasiva("/duicentros/carga-masiva", file),

  getDelegados: async (type?: string): Promise<DelegateDto[]> => {
    const { data } = await apiClient.get<DelegateDto[]>("/delegados", {
      params: type ? { type } : undefined,
    });
    return data;
  },
  createDelegado: async (body: DelegateRequest): Promise<DelegateDto> => {
    const { data } = await apiClient.post<DelegateDto>("/delegados", body);
    return data;
  },
  updateDelegado: async (id: number, body: DelegateRequest): Promise<DelegateDto> => {
    const { data } = await apiClient.put<DelegateDto>(`/delegados/${id}`, body);
    return data;
  },

  getCategorias: async (): Promise<ProductionCategoryDto[]> => {
    const { data } = await apiClient.get<ProductionCategoryDto[]>("/categorias");
    return data;
  },
  createCategoria: async (body: ProductionCategoryRequest): Promise<ProductionCategoryDto> => {
    const { data } = await apiClient.post<ProductionCategoryDto>("/categorias", body);
    return data;
  },
  updateCategoria: async (
    id: number,
    body: ProductionCategoryRequest
  ): Promise<ProductionCategoryDto> => {
    const { data } = await apiClient.put<ProductionCategoryDto>(`/categorias/${id}`, body);
    return data;
  },

  getTiposIncidente: async (): Promise<IncidentTypeDto[]> => {
    const { data } = await apiClient.get<IncidentTypeDto[]>("/tipos-incidente");
    return data;
  },
  createTipoIncidente: async (body: IncidentTypeRequest): Promise<IncidentTypeDto> => {
    const { data } = await apiClient.post<IncidentTypeDto>("/tipos-incidente", body);
    return data;
  },
  updateTipoIncidente: async (id: number, body: IncidentTypeRequest): Promise<IncidentTypeDto> => {
    const { data } = await apiClient.put<IncidentTypeDto>(`/tipos-incidente/${id}`, body);
    return data;
  },
};
