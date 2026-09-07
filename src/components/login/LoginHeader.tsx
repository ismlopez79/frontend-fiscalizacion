import { Stack, Typography } from "@mui/material";

export function LoginHeader() {
  return (
    <Stack
      spacing={0.75}
      alignItems="center"
      sx={{ textAlign: "center", mb: 3.5, width: "100%" }}
    >
      <Typography
        sx={{
          fontSize: 28,
          fontWeight: 700,
          color: "#0D1B2A",
          lineHeight: 1.2,
          textAlign: "center",
          width: "100%",
        }}
      >
        Bienvenido de nuevo
      </Typography>
      <Typography
        sx={{
          fontSize: 15.5,
          fontWeight: 400,
          color: "#6B7280",
          lineHeight: 1.5,
          textAlign: "center",
          width: "100%",
          maxWidth: 380,
        }}
      >
        Inicia sesión para continuar con el sistema de gestión de actas
      </Typography>
    </Stack>
  );
}
