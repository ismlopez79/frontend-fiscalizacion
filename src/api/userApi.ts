import { apiClient } from "./client";
import type {
  CreateUserRequest,
  ResetPasswordRequest,
  ResetPasswordResponse,
  RoleDto,
  UpdateUserRequest,
  UserDto,
} from "@/types/user";
import type { BulkImportResult } from "@/types/bulkImport";

/**
 * CRUD de usuarios (permiso USER_MANAGE, solo ADMINISTRADOR en el seed).
 * El username es inmutable tras la creacion: no existe un metodo para
 * cambiarlo, a proposito. La contraseña solo se toca via
 * resetPassword (flujo de admin, no pide la contraseña anterior).
 */
export const userApi = {
  getUsuarios: async (): Promise<UserDto[]> => {
    const { data } = await apiClient.get<UserDto[]>("/usuarios");
    return data;
  },
  getUsuario: async (id: number): Promise<UserDto> => {
    const { data } = await apiClient.get<UserDto>(`/usuarios/${id}`);
    return data;
  },
  createUsuario: async (body: CreateUserRequest): Promise<UserDto> => {
    const { data } = await apiClient.post<UserDto>("/usuarios", body);
    return data;
  },
  updateUsuario: async (id: number, body: UpdateUserRequest): Promise<UserDto> => {
    const { data } = await apiClient.put<UserDto>(`/usuarios/${id}`, body);
    return data;
  },
  resetPassword: async (id: number, body: ResetPasswordRequest): Promise<ResetPasswordResponse> => {
    const { data } = await apiClient.post<ResetPasswordResponse>(
      `/usuarios/${id}/restablecer-password`,
      body
    );
    return data;
  },
  descargarPlantilla: async (): Promise<Blob> => {
    const { data } = await apiClient.get("/usuarios/plantilla", { responseType: "blob" });
    return data;
  },
  cargaMasiva: async (file: File): Promise<BulkImportResult> => {
    const form = new FormData();
    form.append("file", file);
    const { data } = await apiClient.post<BulkImportResult>("/usuarios/carga-masiva", form);
    return data;
  },

  /**
   * Foto de perfil, autoservicio (cualquier rol, el id sale del token). Subir
   * una nueva reemplaza la anterior — no hay "agregar mas de una".
   */
  uploadMiFotoPerfil: async (file: File): Promise<void> => {
    const form = new FormData();
    form.append("file", file);
    await apiClient.post("/usuarios/me/foto-perfil", form);
  },
  eliminarMiFotoPerfil: async (): Promise<void> => {
    await apiClient.delete("/usuarios/me/foto-perfil");
  },
  /**
   * NOTA: el contrato del backend solo confirma POST/DELETE
   * /usuarios/me/foto-perfil y GET /usuarios/{id}/foto-perfil (publico,
   * requiere id numerico). No se confirmo un GET .../me/foto-perfil para ver
   * la propia sin conocer el propio id (que hoy no viaja en la sesion de
   * login). Se prueba aqui por simetria REST con POST/DELETE me; si el
   * backend no lo expone, esta llamada simplemente falla y el frontend cae
   * de vuelta a mostrar iniciales en vez de foto — no rompe nada, pero hay
   * que confirmarlo con backend o agregar el id a la sesion de login.
   */
  getMiFotoPerfil: async (): Promise<Blob> => {
    const { data } = await apiClient.get("/usuarios/me/foto-perfil", { responseType: "blob" });
    return data;
  },
  /** Foto de perfil de cualquier usuario por id — deliberadamente abierta a cualquier autenticado. */
  getFotoPerfil: async (userId: number): Promise<Blob> => {
    const { data } = await apiClient.get(`/usuarios/${userId}/foto-perfil`, { responseType: "blob" });
    return data;
  },
};

export const roleApi = {
  getRoles: async (): Promise<RoleDto[]> => {
    const { data } = await apiClient.get<RoleDto[]>("/roles");
    return data;
  },
};
