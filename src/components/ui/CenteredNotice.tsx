import type { ReactNode } from "react";
import { Box, Stack, Typography } from "@mui/material";
import { designTokens } from "@/theme/theme";
import { Surface } from "./Surface";

/** Pantalla de aviso centrada (borrador pendiente, edicion no disponible). */
export function CenteredNotice({
  icon,
  title,
  body,
  actions,
}: {
  icon: ReactNode;
  title: string;
  body: ReactNode;
  actions: ReactNode;
}) {
  return (
    <Stack alignItems="center" sx={{ flexShrink: 0, py: { xs: 2, md: 6 } }}>
      <Surface sx={{ maxWidth: 560, width: "100%", p: { xs: 3, md: 4 } }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: "14px",
            bgcolor: designTokens.accentSoft,
            color: designTokens.accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mb: 2,
          }}
        >
          {icon}
        </Box>
        <Typography variant="h3" component="h1" sx={{ mb: 1 }}>
          {title}
        </Typography>
        <Typography variant="body2" component="div" sx={{ mb: 3 }}>
          {body}
        </Typography>
        <Stack direction="row" gap={1.25} flexWrap="wrap" justifyContent="flex-end">
          {actions}
        </Stack>
      </Surface>
    </Stack>
  );
}
