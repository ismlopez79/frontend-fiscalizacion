import { Box } from "@mui/material";
// Version optimizada (720px WebP, ~52 KB) del logo original src/logo/logo.png (1495px, 429 KB):
// se muestra a 230px como maximo, asi que alcanza incluso para pantallas 3x.
import logo from "@/logo/logo-720.webp";

/**
 * Logo institucional JVE. Se usa el archivo provisto tal cual: sin
 * recortes, sin recoloreo, sin deformar proporciones (object-fit: contain).
 */
export function JveLogo() {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        mb: 1,
      }}
    >
      <Box
        component="img"
        src={logo}
        alt="Junta de Vigilancia Electoral"
        sx={{
          width: "100%",
          maxWidth: 230,
          height: "auto",
          objectFit: "contain",
          userSelect: "none",
        }}
        draggable={false}
      />
    </Box>
  );
}
