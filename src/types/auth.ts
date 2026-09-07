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
  scope: AuthScope;
}

export interface AuthUser {
  username: string;
  fullName: string;
  roles: string[];
  permissions: string[];
  primerIngreso: boolean;
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
