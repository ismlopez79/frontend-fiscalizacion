import { Box } from "@mui/material";
import type { ReactNode } from "react";
import { designTokens } from "@/theme/theme";

/**
 * Fondo de las pantallas de autenticacion.
 *
 * Blanco/azul muy claro, con formas curvas enormes y extremadamente
 * transparentes + puntos decorativos en las esquinas. Todo el peso visual
 * debe recaer en la tarjeta de login, asi que el fondo se queda deliberadamente
 * silencioso: sin gradientes fuertes, sin colores saturados.
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
        width: "100%",
        // grid + place-items en vez de flex: centra en ambos ejes sin
        // recortar el inicio del contenido cuando hay overflow y scroll.
        display: "grid",
        placeItems: "center",
        bgcolor: "#FFFFFF",
        backgroundImage:
          "radial-gradient(ellipse 80% 60% at 50% 0%, #E7F0FA 0%, #FFFFFF 60%)",
        px: 2,
        py: { xs: 3, sm: 4 },
        boxSizing: "border-box",
        "@keyframes bgFadeIn": {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
        animation: `bgFadeIn 700ms ${designTokens.easeOut}`,
      }}
    >
      {/* Forma curva superior izquierda */}
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          top: { xs: -180, md: -220 },
          left: { xs: -160, md: -140 },
          width: { xs: 340, md: 480 },
          height: { xs: 340, md: 480 },
          borderRadius: "50%",
          background:
            "linear-gradient(135deg, rgba(27,58,107,0.16) 0%, rgba(231,240,250,0.4) 100%)",
          filter: "blur(6px)",
          opacity: 0.5,
          display: { xs: "none", sm: "block" },
        }}
      />

      {/* Forma curva inferior derecha */}
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          bottom: { xs: -200, md: -260 },
          right: { xs: -160, md: -180 },
          width: { xs: 360, md: 520 },
          height: { xs: 360, md: 520 },
          borderRadius: "50%",
          background:
            "linear-gradient(315deg, rgba(248,176,24,0.10) 0%, rgba(231,240,250,0.5) 100%)",
          filter: "blur(6px)",
          opacity: 0.6,
          display: { xs: "none", sm: "block" },
        }}
      />

      {/* Franja curva sutil de fondo, cruzando la pantalla */}
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          top: "8%",
          right: "-10%",
          width: "70%",
          height: "140%",
          border: "1px solid rgba(27,58,107,0.08)",
          borderRadius: "50%",
          transform: "rotate(-8deg)",
          display: { xs: "none", md: "block" },
        }}
      />

      {/* Grupo de puntos decorativos - esquina superior derecha */}
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          top: { md: 48 },
          right: { md: 64 },
          display: { xs: "none", md: "grid" },
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: "10px",
        }}
      >
        {Array.from({ length: 20 }).map((_, i) => (
          <Box
            key={i}
            sx={{
              width: 4,
              height: 4,
              borderRadius: "50%",
              bgcolor: "rgba(27,58,107,0.18)",
            }}
          />
        ))}
      </Box>

      {/* Grupo de puntos decorativos - esquina inferior izquierda */}
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          bottom: { md: 56 },
          left: { md: 56 },
          display: { xs: "none", md: "grid" },
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "10px",
        }}
      >
        {Array.from({ length: 16 }).map((_, i) => (
          <Box
            key={i}
            sx={{
              width: 4,
              height: 4,
              borderRadius: "50%",
              bgcolor: "rgba(27,58,107,0.14)",
            }}
          />
        ))}
      </Box>

      <Box sx={{ position: "relative", zIndex: 1, width: "100%", display: "flex", justifyContent: "center" }}>
        {children}
      </Box>
    </Box>
  );
}
