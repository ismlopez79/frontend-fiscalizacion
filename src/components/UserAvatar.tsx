import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Avatar } from "@mui/material";
import { userApi } from "@/api/userApi";

interface UserAvatarProps {
  userId: number;
  /** UserDto.profilePhotoUrl !== null — evita pedir la foto si no existe. */
  hasPhoto: boolean;
  fallbackText: string;
  size?: number;
  /** Por defecto trae la foto de /usuarios/{id}/foto-perfil — pasar otra (ej. delegados temporales) para reusar este componente en otros catalogos. */
  fetchPhoto?: (userId: number) => Promise<Blob>;
  /** Namespace de la queryKey de react-query — distinto por catalogo para no cruzar cache entre ids de tablas distintas. */
  cacheNamespace?: string;
}

/**
 * Avatar autenticado de un usuario cualquiera (no el propio — para eso ver
 * useMyProfilePhoto). GET /usuarios/{id}/foto-perfil no sirve como <img src>
 * directo (requiere Authorization), asi que se trae como blob via react-query
 * y se cachea por userId — cambiar de pagina en la tabla de usuarios no
 * vuelve a pedir los avatares ya vistos.
 */
export function UserAvatar({
  userId,
  hasPhoto,
  fallbackText,
  size = 32,
  fetchPhoto = userApi.getFotoPerfil,
  cacheNamespace = "foto-perfil",
}: UserAvatarProps) {
  const query = useQuery({
    queryKey: [cacheNamespace, userId],
    queryFn: () => fetchPhoto(userId),
    enabled: hasPhoto,
    retry: false,
    staleTime: 5 * 60 * 1000,
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

  return (
    <Avatar src={url ?? undefined} sx={{ width: size, height: size, fontSize: size * 0.45 }}>
      {fallbackText}
    </Avatar>
  );
}
