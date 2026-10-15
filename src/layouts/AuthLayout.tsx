import { Box } from "@mui/material";
import type { ReactNode } from "react";
import { designTokens } from "@/theme/theme";

/**
 * Fondo de las pantallas de autenticacion: un campo de color ambiental
 * (marino, dorado y celeste institucionales, muy suaves) sobre el que flota
 * la tarjeta de vidrio. El vidrio necesita algo detras para leerse como
 * material; sin este color seria solo una tarjeta blanca.
 *
 * Rendimiento: el color son gradientes radiales en un solo background
 * (sin filter: blur ni capas animadas), y la pantalla no hace scroll en
 * condiciones normales — el unico backdrop-filter (el de la tarjeta) se
 * pinta una vez.
 */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        // Fijo al viewport (no al documento): sin importar el zoom del
        // navegador, este contenedor siempre coincide exactamente con el
        // area visible. Si el contenido no cabe, hace scroll interno en vez
        // de recortarse.
        position: "fixed",
        inset: 0,
        overflowY: "auto",
        overflowX: "hidden",
        overscrollBehavior: "contain",
        width: "100%",
        // grid + place-items en vez de flex: centra en ambos ejes sin
        // recortar el inicio del contenido cuando hay overflow y scroll.
        display: "grid",
        placeItems: "center",
        bgcolor: "#F3F6FB",
        backgroundImage: [
          "radial-gradient(40rem 32rem at 12% 8%, rgba(27, 58, 107, 0.22), transparent 70%)",
          "radial-gradient(36rem 30rem at 92% 88%, rgba(248, 176, 24, 0.20), transparent 70%)",
          "radial-gradient(30rem 26rem at 85% 12%, rgba(86, 180, 233, 0.18), transparent 70%)",
          "radial-gradient(28rem 24rem at 8% 95%, rgba(27, 58, 107, 0.10), transparent 70%)",
          // Color tambien detras de la tarjeta: sin esto el vidrio solo "veria" blanco.
          "radial-gradient(22rem 18rem at 38% 62%, rgba(86, 180, 233, 0.22), transparent 70%)",
          "radial-gradient(20rem 16rem at 64% 38%, rgba(248, 176, 24, 0.16), transparent 70%)",
        ].join(", "),
        px: 2,
        py: { xs: 3, sm: 4 },
        boxSizing: "border-box",
        "@keyframes bgFadeIn": {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
        animation: `bgFadeIn 400ms ${designTokens.easeOut}`,
      }}
    >
      <Box sx={{ position: "relative", zIndex: 1, width: "100%", display: "flex", justifyContent: "center" }}>
        {children}
      </Box>
    </Box>
  );
}
