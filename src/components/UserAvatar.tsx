import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Avatar, ButtonBase } from "@mui/material";
import { userApi } from "@/api/userApi";
import { designTokens } from "@/theme/theme";
import { PhotoLightbox } from "./PhotoLightbox";

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
  /** Nombre de la persona, para el texto alternativo de la foto. */
  name?: string;
  /** Si hay foto, pulsarla la abre ampliada al centro de la pantalla. Activo por defecto. */
  zoomable?: boolean;
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
  name,
  zoomable = true,
}: UserAvatarProps) {
  const [zoomOpen, setZoomOpen] = useState(false);
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

  const alt = name ? `Foto de perfil de ${name}` : "Foto de perfil";
  const avatar = (
    <Avatar src={url ?? undefined} alt={url ? alt : undefined} sx={{ width: size, height: size, fontSize: size * 0.45 }}>
      {fallbackText}
    </Avatar>
  );

  // Sin foto no hay nada que ampliar: las iniciales se quedan como avatar estatico.
  if (!zoomable || !url) return avatar;

  return (
    <>
      <ButtonBase
        aria-label={`Ver ${alt.toLowerCase()}`}
        onClick={(e) => {
          e.stopPropagation();
          setZoomOpen(true);
        }}
        sx={{
          borderRadius: "50%",
          cursor: "zoom-in",
          transition: `transform 160ms ${designTokens.easeOut}, box-shadow 150ms ease`,
          "&:active": { transform: "scale(0.95)" },
          "&.Mui-focusVisible": { boxShadow: designTokens.focusRing },
          "@media (hover: hover) and (pointer: fine)": {
            "&:hover": { boxShadow: "0 0 0 2px rgba(37, 99, 235, 0.35)" },
          },
        }}
      >
        {avatar}
      </ButtonBase>
      <PhotoLightbox open={zoomOpen} src={url} alt={alt} onClose={() => setZoomOpen(false)} />
    </>
  );
}
