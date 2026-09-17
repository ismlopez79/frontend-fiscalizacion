/** Hoy solo existe "ELECTIONS"; el shape ya es genérico por si se agregan más módulos apagables. */
export type ModuloCode = "ELECTIONS";

export interface ModuloDto {
  code: ModuloCode;
  name: string;
  description: string;
  enabled: boolean;
  updatedAt: string;
}

export interface UpdateModuloRequest {
  enabled: boolean;
}
