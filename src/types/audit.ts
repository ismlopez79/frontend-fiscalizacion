/**
 * Acciones conocidas del log de auditoria. El backend puede escribir otras
 * en el futuro (el campo es un enum de su lado, no algo que el frontend
 * controle) — se usa string en el resto del tipado para no romper si
 * aparece un valor nuevo que el select todavia no conoce.
 */
export const AUDIT_ACTIONS = [
  "CREATE",
  "UPDATE",
  "APPROVE",
  "REJECT",
  "OBSERVE",
  "LOGIN",
  "LOGIN_FAILED",
  "DELETE",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number] | (string & {});

/**
 * entityName usados hoy por el backend. Igual que AUDIT_ACTIONS, es una
 * lista de sugerencias para el filtro (Autocomplete freeSolo) — el campo
 * en si es texto libre del lado del backend, no un enum cerrado.
 */
export const AUDIT_ENTITY_NAMES = [
  "ACTA",
  "ACTA_FILE",
  "USER",
  "DEPARTMENT",
  "DUICENTRO",
  "DELEGATE",
  "PRODUCTION_CATEGORY",
] as const;

export interface AuditLogDto {
  id: number;
  username: string;
  /**
   * Nombre completo del usuario en el momento del evento (snapshot, igual
   * que username — si el usuario cambia su nombre despues, esta fila no se
   * actualiza retroactivamente). Agregado junto con la migracion V13.
   */
  fullName: string;
  action: AuditAction;
  entityName: string;
  entityId: number | null;
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
  ipAddress: string | null;
  extraInfo: string | null;
  createdAt: string;
}

export interface AuditLogFilters {
  username?: string;
  entityName?: string;
  entityId?: number;
  action?: string;
  from?: string;
  to?: string;
}
