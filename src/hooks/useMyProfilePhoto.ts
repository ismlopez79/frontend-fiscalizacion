import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { myPhotoApi, useIsTemporaryDelegate } from "@/hooks/useMyAccount";
import { useAuth } from "@/hooks/useAuth";

/**
 * Blob URL de la foto de perfil del usuario logueado, o null si no tiene
 * (o si la consulta falla). Compartido entre AppShell (avatar del header) y
 * PerfilPage, vía la misma query key de react-query, para que subir/quitar
 * una foto en un lugar se refleje en el otro sin duplicar el fetch.
 *
 * El endpoint depende del tipo de cuenta: un delegado temporal tiene su
 * foto en /delegados-temporales/me/foto-perfil, no en /usuarios/me/... (son
 * tablas distintas y un mismo id numerico puede existir en ambas).
 */
export function useMyProfilePhoto() {
  const isTemporary = useIsTemporaryDelegate();
  const { user } = useAuth();
  const query = useQuery({
    // Tipo de cuenta Y usuario en la key: la foto de una persona nunca puede
    // salir del cache para otra que inicie sesion despues en el mismo navegador
    // (ademas, AuthContext vacia el cache al cerrar/cambiar de sesion).
    queryKey: ["mi-foto-perfil", isTemporary ? "delegado-temporal" : "usuario", user?.username ?? ""],
    // "No tiene foto" (404) es un resultado valido, no un error: si fallara,
    // react-query conservaria la foto anterior en pantalla (p. ej. tras quitarla).
    queryFn: async (): Promise<Blob | null> => {
      try {
        return await myPhotoApi(isTemporary).get();
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) return null;
        throw error;
      }
    },
    enabled: !!user,
    retry: false,
  });

  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!query.data) {
      setUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(query.data);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [query.data]);

  return url;
}
