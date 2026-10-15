import type { ReactNode } from "react";
import { Box, Typography } from "@mui/material";
import { designTokens } from "@/theme/theme";

/** Fila etiqueta/valor de una ficha (dentro de un <dl>). Vacio se lee "No indicado", no un guion suelto. */
export function DetailRow({ label, value, numeric }: { label: string; value: ReactNode | null; numeric?: boolean }) {
  const empty = value === null || value === undefined || value === "";
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "128px 1fr", columnGap: 1.5, alignItems: "baseline" }}>
      <Typography component="dt" variant="body2" sx={{ color: designTokens.textCaption }}>
        {label}
      </Typography>
      <Typography
        component="dd"
        variant="body2"
        sx={{
          m: 0,
          fontWeight: empty ? 400 : 600,
          color: empty ? designTokens.textDisabled : "text.primary",
          fontVariantNumeric: numeric ? "tabular-nums" : undefined,
          overflowWrap: "anywhere",
        }}
      >
        {empty ? "No indicado" : value}
      </Typography>
    </Box>
  );
}
