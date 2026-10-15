export interface LoginRequest {
  username: string;
  password: string;
}

export type AuthScope = "FULL" | "PASSWORD_CHANGE_ONLY";

export interface LoginResponse {
  token: string;
  username: string;
  fullName: string;
  roles: string[];
  primerIngreso: boolean;
  /**
   * false = le falta correo, telefono o foto de perfil: el backend lo bloquea
   * (403 PROFILE_INCOMPLETE_REQUIRED) de todo menos su propio perfil hasta que
   * lo complete. Siempre true para ADMINISTRADOR. Opcional por compatibilidad
   * con un backend que aun no lo envie (se trata como true).
   */
  profileComplete?: boolean;
  scope: AuthScope;
}

export interface AuthUser {
  username: string;
  fullName: string;
  roles: string[];
  permissions: string[];
  primerIngreso: boolean;
  /** Ver LoginResponse.profileComplete. */
  profileComplete: boolean;
  scope: AuthScope;
}

/**
 * Caso A (primer ingreso / post-reset admin, scope PASSWORD_CHANGE_ONLY): solo
 * newPassword, sin currentPassword. Caso B (cambio voluntario, scope FULL):
 * ambos campos.
 */
export interface ChangePasswordRequest {
  currentPassword?: string;
  newPassword: string;
}

export type ChangePasswordResponse = LoginResponse;
