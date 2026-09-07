import { Box } from "@mui/material";
import logo from "@/logo/logo.png";

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
          maxWidth: 260,
          height: "auto",
          objectFit: "contain",
          userSelect: "none",
        }}
        draggable={false}
      />
    </Box>
  );
}
