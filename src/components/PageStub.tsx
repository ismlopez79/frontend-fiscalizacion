import { Alert, Paper, Stack, Typography } from "@mui/material";
import ConstructionIcon from "@mui/icons-material/ConstructionOutlined";

interface PageStubProps {
  title: string;
  description: string;
  /** Bloque del roadmap de frontend donde se implementa esta pantalla. */
  block: string;
}

/**
 * Placeholder explicito para pantallas todavia no implementadas.
 * Existe para que ninguna ruta del inventario quede omitida en silencio
 * (regla del prompt de frontend, seccion 4): el usuario ve exactamente
 * que pantalla falta y en que bloque del roadmap se construye.
 */
export function PageStub({ title, description, block }: PageStubProps) {
  return (
    <Paper variant="outlined" sx={{ p: 4, maxWidth: 640 }}>
      <Stack spacing={2}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <ConstructionIcon color="disabled" />
          <Typography variant="h3">{title}</Typography>
        </Stack>
        <Typography variant="body1" color="text.secondary">
          {description}
        </Typography>
        <Alert severity="info" variant="outlined">
          Pendiente de implementación — {block} del roadmap de frontend.
        </Alert>
      </Stack>
    </Paper>
  );
}
