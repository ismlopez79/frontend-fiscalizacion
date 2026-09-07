export interface UserDto {
  id: number;
  username: string;
  fullName: string;
  email: string | null;
  /**
   * DUI salvadoreno (12345678-9), requerido y unico desde la migracion V15
   * (cruzado con el DUI de /delegados). Usuarios creados antes de esa
   * migracion pueden traer null hasta que alguien los edite de nuevo.
   */
  dui: string | null;
  active: boolean;
  /** Cuenta recien creada o con password reseteado por el admin: debe cambiarla antes de usar el sistema. */
  primerIngreso: boolean;
  /** Se bloqueo sola tras 5 intentos fallidos de login seguidos; solo se desbloquea con un reset de admin. */
  locked: boolean;
  roles: string[];
  roleIds: number[];
  /**
   * Vinculo automatico Usuario -> Delegado JVE. Null si el usuario no tiene
   * rol DIGITADOR, o si es un DIGITADOR creado antes de que existiera este
   * vinculo (se crea al guardar el usuario de nuevo con PUT /usuarios/{id}).
   */
  linkedDelegateId: number | null;
  linkedDelegateName: string | null;
  /**
   * Null si el usuario no ha subido foto de perfil. No es un <img src> listo
   * para usar a secas (el endpoint requiere el header Authorization) — solo
   * se usa aqui como señal de "tiene foto o no"; el fetch autenticado real
   * se arma con el id del usuario, ver userApi.getFotoPerfil.
   */
  profilePhotoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RoleDto {
  id: number;
  name: string;
  description: string;
}

export const DIGITADOR_ROLE_NAME = "DIGITADOR";

export interface CreateUserRequest {
  username: string;
  password: string;
  fullName: string;
  email?: string;
  /** Requerido, formato 12345678-9, unico entre usuarios y delegados. */
  dui: string;
  roleIds: number[];
  active: boolean;
  /** Solo importa si roleIds incluye DIGITADOR: alimenta el Delegado JVE vinculado. */
  delegateInternalCode?: string;
}

export interface UpdateUserRequest {
  fullName: string;
  email?: string;
  /** Requerido, formato 12345678-9, unico entre usuarios y delegados. */
  dui: string;
  roleIds: number[];
  active: boolean;
  /**
   * Solo importa si roleIds incluye DIGITADOR. OJO: si se manda una cadena
   * vacia, el backend sincroniza igual y borra el codigo existente del
   * delegado vinculado — por eso el frontend debe omitir esta clave por
   * completo (no mandarla como "") cuando el admin no quiso tocarla.
   */
  delegateInternalCode?: string;
}

export interface ResetPasswordRequest {
  /** Opcional: si se omite (o va vacio), el backend genera una automaticamente. */
  newPassword?: string;
}

/**
 * Unica vez que el backend devuelve una contraseña en texto plano. El
 * frontend debe mostrarla una sola vez y no persistirla en ningun lado.
 */
export interface ResetPasswordResponse {
  temporaryPassword: string;
}
