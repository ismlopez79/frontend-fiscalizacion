import { apiClient } from "./client";
import type { DistrictDto, MunicipalityDto } from "@/types/fiscalizacionFases";

/**
 * Territorio: 14 departamentos -> 44 municipios -> 262 distritos, ya
 * cargados en el backend. Los departamentos se leen con
 * catalogApi.getDepartamentos (mismo GET /departamentos de siempre).
 * El selector de ubicacion es de dos pasos (departamento y distrito): cada
 * distrito ya trae su municipio, no hay que pedirlo.
 */
export const territorioApi = {
  /** Segundo combo del selector: distritos activos del departamento, ordenados por nombre. */
  getDistritosDeDepartamento: async (departmentId: number): Promise<DistrictDto[]> => {
    const { data } = await apiClient.get<DistrictDto[]>(`/departamentos/${departmentId}/distritos`);
    return data;
  },
  getMunicipiosDeDepartamento: async (departmentId: number): Promise<MunicipalityDto[]> => {
    const { data } = await apiClient.get<MunicipalityDto[]>(`/departamentos/${departmentId}/municipios`);
    return data;
  },
  getDistritosDeMunicipio: async (municipalityId: number): Promise<DistrictDto[]> => {
    const { data } = await apiClient.get<DistrictDto[]>(`/municipios/${municipalityId}/distritos`);
    return data;
  },
};
