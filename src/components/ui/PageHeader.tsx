import type { ReactNode } from "react";
import { Box, Stack, Typography } from "@mui/material";

interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Contenido junto al titulo (p. ej. la pastilla de estado de un acta). */
  titleAdornment?: ReactNode;
  actions?: ReactNode;
  /** Encima del titulo: enlace de regreso. */
  back?: ReactNode;
}

/**
 * Encabezado unico de pantalla: titulo con tracking negativo, subtitulo en
 * tono secundario y acciones alineadas a la derecha que se envuelven debajo
 * en movil. Todas las secciones lo usan para que la primera linea de cada
 * pantalla se lea igual.
 */
export function PageHeader({ title, subtitle, titleAdornment, actions, back }: PageHeaderProps) {
  return (
    <Box>
      {back && <Box sx={{ mb: 1, ml: -1 }}>{back}</Box>}
      <Stack
        direction="row"
        alignItems={{ xs: "flex-start", md: "flex-end" }}
        justifyContent="space-between"
        flexWrap="wrap"
        gap={2}
      >
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" alignItems="center" gap={1.5} flexWrap="wrap">
            <Typography variant="h3" component="h1" sx={{ textWrap: "balance" }}>
              {title}
            </Typography>
            {titleAdornment}
          </Stack>
          {subtitle && (
            <Typography variant="body2" component="div" sx={{ mt: 0.5, maxWidth: "70ch" }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        {actions && (
          <Stack direction="row" gap={1.25} flexWrap="wrap" alignItems="center">
            {actions}
          </Stack>
        )}
      </Stack>
    </Box>
  );
}
