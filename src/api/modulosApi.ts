import { apiClient } from "./client";
import type { ModuloCode, ModuloDto, UpdateModuloRequest } from "@/types/modulo";

/**
 * GET /modulos es accesible para cualquier usuario autenticado (se usa para
 * decidir que mostrar en el menu, ver useModulos). PUT requiere MODULE_MANAGE
 * (solo ADMINISTRADOR) y puede responder 400 si se intenta habilitar sin un
 * periodo electoral activo.
 */
export const modulosApi = {
  getModulos: async (): Promise<ModuloDto[]> => {
    const { data } = await apiClient.get<ModuloDto[]>("/modulos");
    return data;
  },
  updateModulo: async (code: ModuloCode, body: UpdateModuloRequest): Promise<ModuloDto> => {
    const { data } = await apiClient.put<ModuloDto>(`/modulos/${code}`, body);
    return data;
  },
};
