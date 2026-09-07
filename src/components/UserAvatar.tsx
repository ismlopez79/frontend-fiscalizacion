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
}

/**
 * Avatar autenticado de un usuario cualquiera (no el propio — para eso ver
 * useMyProfilePhoto). GET /usuarios/{id}/foto-perfil no sirve como <img src>
 * directo (requiere Authorization), asi que se trae como blob via react-query
 * y se cachea por userId — cambiar de pagina en la tabla de usuarios no
 * vuelve a pedir los avatares ya vistos.
 */
export function UserAvatar({ userId, hasPhoto, fallbackText, size = 32 }: UserAvatarProps) {
  const query = useQuery({
    queryKey: ["foto-perfil", userId],
    queryFn: () => userApi.getFotoPerfil(userId),
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
