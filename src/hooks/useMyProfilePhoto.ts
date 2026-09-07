import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { userApi } from "@/api/userApi";

/**
 * Blob URL de la foto de perfil del usuario logueado, o null si no tiene
 * (o si la consulta falla — ver nota en userApi.getMiFotoPerfil sobre la
 * incertidumbre de ese endpoint). Compartido entre AppShell (avatar del
 * header) y PerfilPage, vía la misma query key de react-query, para que
 * subir/quitar una foto en un lugar se refleje en el otro sin duplicar el
 * fetch.
 */
export function useMyProfilePhoto() {
  const query = useQuery({
    queryKey: ["mi-foto-perfil"],
    queryFn: userApi.getMiFotoPerfil,
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
