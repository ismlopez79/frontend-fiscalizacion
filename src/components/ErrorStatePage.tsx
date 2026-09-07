import { Stack } from "@mui/material";
import type { ReactNode } from "react";
import { designTokens } from "@/theme/theme";

/**
 * Shell compartido por las paginas de estado de error de pagina completa
 * (403, 404, ...). Solo el contenedor + la entrada se comparten — el
 * contenido (icono, titulo, texto) sigue siendo propio de cada pagina,
 * porque genuinamente difiere entre ellas.
 *
 * Son pantallas "rare/first-time": el unico tier donde el spec de motion
 * permite un poco de delight, asi que entran con fade + un desplazamiento
 * corto en vez de aparecer en seco.
 */
export function ErrorStatePage({ children }: { children: ReactNode }) {
  return (
    <Stack
      spacing={2}
      sx={{
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        textAlign: "center",
        "@keyframes errorStateIn": {
          from: { opacity: 0, transform: "translateY(8px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
        "@keyframes errorStateInReduced": {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
        opacity: 0,
        animation: `errorStateIn 350ms ${designTokens.easeOut} both`,
        "@media (prefers-reduced-motion: reduce)": {
          animation: `errorStateInReduced 350ms ${designTokens.easeOut} both`,
        },
      }}
    >
      {children}
    </Stack>
  );
}
