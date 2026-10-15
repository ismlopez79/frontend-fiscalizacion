import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Box } from "@mui/material";
import { designTokens } from "@/theme/theme";
import { glassShadow, glassSx } from "./glass";

interface FloatingToolbarProps {
  children: ReactNode;
}

/**
 * Barra de filtros en vidrio que se queda pegada arriba mientras el
 * contenido pasa por debajo. Al quedar pegada su material se "espesa" (mas
 * opaco, mas sombra): es la señal de que ahora flota sobre contenido y no
 * sobre el fondo. La deteccion usa IntersectionObserver (sin listeners de
 * scroll, cero trabajo por frame).
 */
export function FloatingToolbar({ children }: FloatingToolbarProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    // El AppBar fijo mide 56-64px: el sentinel "sale" justo cuando la barra se pega.
    const observer = new IntersectionObserver(([entry]) => setStuck(!entry.isIntersecting), {
      rootMargin: "-72px 0px 0px 0px",
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <Box ref={sentinelRef} aria-hidden sx={{ height: 0 }} />
      <Box
        sx={{
          position: "sticky",
          // Compensa el padding del contenedor de scroll del AppShell: la barra flota 8px bajo el AppBar.
          top: { xs: -4, sm: -8, lg: -16 },
          zIndex: 5,
          borderRadius: "16px",
          px: { xs: 1.5, md: 2 },
          py: 1.25,
          ...glassSx(stuck ? "thick" : "light"),
          boxShadow: stuck ? glassShadow.floating : glassShadow.resting,
          transition: `background-color 200ms ${designTokens.easeOut}, box-shadow 200ms ${designTokens.easeOut}`,
        }}
      >
        {children}
      </Box>
    </>
  );
}

/** Campo compacto para vivir dentro de una FloatingToolbar (fondo semi-opaco sobre el vidrio). */
export const toolbarFieldSx = {
  "& .MuiOutlinedInput-root": {
    bgcolor: "rgba(255, 255, 255, 0.7)",
    fontSize: "0.8125rem",
  },
  "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(15, 23, 42, 0.10)" },
} as const;
