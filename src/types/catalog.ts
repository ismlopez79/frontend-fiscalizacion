export interface DepartmentDto {
  id: number;
  code: string;
  name: string;
  active: boolean;
}

export interface DepartmentRequest {
  code: string;
  name: string;
  active: boolean;
}

export interface DuicentroDto {
  id: number;
  code: string;
  name: string;
  departmentId: number;
  departmentName: string;
  address: string | null;
  active: boolean;
}

export interface DuicentroRequest {
  code: string;
  name: string;
  departmentId: number;
  address?: string | null;
  active: boolean;
}

export interface PoliticalPartyDto {
  id: number;
  code: string;
  name: string;
  active: boolean;
}

export interface PoliticalPartyRequest {
  code: string;
  name: string;
  active: boolean;
}

export type DelegateType = "JVE" | "RNPN" | "JEFE_DUICENTRO";

export const DELEGATE_TYPES: DelegateType[] = ["JVE", "RNPN", "JEFE_DUICENTRO"];

export const DELEGATE_TYPE_LABELS: Record<DelegateType, string> = {
  JVE: "Delegado JVE",
  RNPN: "Delegado RNPN",
  JEFE_DUICENTRO: "Jefe de Duicentro",
};

export interface DelegateDto {
  id: number;
  firstName: string;
  lastName: string;
  internalCode: string | null;
  /**
   * DUI salvadoreno (12345678-9), requerido y unico desde la migracion V15
   * (cruzado con el DUI de /usuarios). Registros creados antes de esa
   * migracion pueden traer null hasta que alguien los edite de nuevo.
   */
  dui: string | null;
  type: DelegateType;
  active: boolean;
  /**
   * Username del usuario DIGITADOR al que este delegado JVE esta vinculado
   * automaticamente (ya implementado por backend). Cuando viene poblado,
   * el registro se sincroniza desde /usuarios y NO debe editarse aqui
   * directamente — cualquier cambio manual se pierde en la proxima
   * sincronizacion.
   */
  linkedUsername: string | null;
  /**
   * Partido politico que representa este delegado. Solo aplica a type
   * "JVE" (RNPN y JEFE_DUICENTRO no llevan partido) — ver partyRequired.
   * Null si aun no se ha capturado (posible al crear, no al editar).
   */
  politicalPartyId: number | null;
  politicalPartyName: string | null;
  /**
   * true cuando type === "JVE": el backend exige politicalPartyId al editar
   * (409 si se omite), aunque es opcional al crear. Viaja calculado desde
   * el backend para no duplicar esa regla en el frontend.
   */
  partyRequired: boolean;
}

export interface DelegateRequest {
  firstName: string;
  lastName: string;
  internalCode?: string | null;
  /** Requerido, formato 12345678-9, unico entre delegados y usuarios. */
  dui: string;
  type: DelegateType;
  active: boolean;
  /** Opcional al crear; obligatorio al editar un delegado JVE (409 si se omite). */
  politicalPartyId?: number | null;
}

export interface ProductionCategoryDto {
  id: number;
  code: string;
  name: string;
  description: string | null;
  active: boolean;
  displayOrder: number;
}

export interface ProductionCategoryRequest {
  code: string;
  name: string;
  description?: string | null;
  active: boolean;
  displayOrder: number;
}

export interface IncidentTypeDto {
  id: number;
  code: string;
  name: string;
  description: string | null;
  active: boolean;
  displayOrder: number;
}

export interface IncidentTypeRequest {
  code: string;
  name: string;
  description?: string | null;
  active: boolean;
  displayOrder: number;
}
