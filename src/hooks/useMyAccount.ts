import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { userApi } from "@/api/userApi";
import { temporaryDelegateApi } from "@/api/electoralApi";
import { useAuth } from "@/hooks/useAuth";
import type { SelfProfileUpdateRequest } from "@/types/user";

export const TEMPORARY_DELEGATE_ROLE = "DELEGADO_TEMPORAL";

/**
 * Vista unica del perfil propio, sea usuario permanente (/usuarios/me) o
 * delegado temporal (/delegados-temporales/me): las dos cuentas viven en
 * tablas distintas y el backend las distingue por el JWT, asi que el
 * frontend elige el endpoint por el rol de la sesion (mismo criterio que el
 * interceptor de api/client.ts).
 */
export interface MyAccountView {
  fullName: string;
  username: string;
  dui: string | null;
  email: string | null;
  phone: string | null;
  active: boolean;
  /** Solo usuarios permanentes. */
  roles: string[] | null;
  politicalPartyName: string | null;
  /** Solo delegados temporales. */
  electoralPeriodName: string | null;
  /** Solo usuarios con rol DIGITADOR vinculados a un delegado JVE. */
  linkedDelegateName: string | null;
  /** El backend manda profilePhotoUrl solo si hay foto guardada. */
  hasPhoto: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Endpoints de la foto propia segun el tipo de cuenta. */
export function myPhotoApi(isTemporary: boolean) {
  return isTemporary
    ? {
        get: temporaryDelegateApi.getMiFotoPerfil,
        upload: temporaryDelegateApi.uploadMiFotoPerfil,
        remove: temporaryDelegateApi.eliminarMiFotoPerfil,
      }
    : { get: userApi.getMiFotoPerfil, upload: userApi.uploadMiFotoPerfil, remove: userApi.eliminarMiFotoPerfil };
}

export function useIsTemporaryDelegate(): boolean {
  const { user } = useAuth();
  return !!user?.roles.includes(TEMPORARY_DELEGATE_ROLE);
}

export function useMyAccount() {
  const isTemporary = useIsTemporaryDelegate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  // El usuario va en la key: el perfil de una persona nunca sale del cache para otra.
  const queryKey = ["mi-cuenta", isTemporary ? "delegado-temporal" : "usuario", user?.username ?? ""];

  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<MyAccountView> => {
      if (isTemporary) {
        const d = await temporaryDelegateApi.getMe();
        return {
          fullName: d.fullName,
          username: d.username,
          dui: d.dui,
          email: d.email,
          phone: d.phone,
          active: d.active,
          roles: null,
          politicalPartyName: d.politicalPartyName,
          electoralPeriodName: d.electoralPeriodName,
          linkedDelegateName: null,
          hasPhoto: !!d.profilePhotoUrl,
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
        };
      }
      const u = await userApi.getMe();
      return {
        fullName: u.fullName,
        username: u.username,
        dui: u.dui,
        email: u.email,
        phone: u.phone,
        active: u.active,
        roles: u.roles,
        politicalPartyName: u.linkedDelegatePoliticalPartyName,
        electoralPeriodName: null,
        linkedDelegateName: u.linkedDelegateName,
        hasPhoto: !!u.profilePhotoUrl,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      };
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (body: SelfProfileUpdateRequest): Promise<void> => {
      if (isTemporary) await temporaryDelegateApi.updateMe(body);
      else await userApi.updateMe(body);
    },
    // El PATCH devuelve el perfil ya actualizado: se vuelve a leer para quedar
    // alineado con lo que el backend normalizo (p. ej. espacios del correo).
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return { isTemporary, query, queryKey, updateMutation };
}
