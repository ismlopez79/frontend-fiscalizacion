import type { ReactNode } from "react";
import { Box, Stack, Typography } from "@mui/material";
import type { SxProps, Theme } from "@mui/material";

/**
 * Superficie base del dashboard: blanca, sin borde duro, radio amplio y una
 * sombra de dos capas (contacto + ambiente) apenas perceptible. La jerarquia
 * la hacen el espacio y la tipografia, no los marcos.
 */
export const surfaceSx = {
  bgcolor: "background.paper",
  borderRadius: "20px",
  boxShadow: "0 0 0 1px rgba(15, 23, 42, 0.04), 0 1px 2px rgba(15, 23, 42, 0.04), 0 12px 32px -16px rgba(15, 23, 42, 0.10)",
} as const;

interface SurfaceProps {
  children: ReactNode;
  sx?: SxProps<Theme>;
}

export function Surface({ children, sx }: SurfaceProps) {
  return <Box sx={[surfaceSx, { p: { xs: 2.5, md: 3 } }, ...(Array.isArray(sx) ? sx : [sx])]}>{children}</Box>;
}

interface SectionHeaderProps {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}

export function SectionHeader({ title, subtitle, actions }: SectionHeaderProps) {
  return (
    <Stack
      direction="row"
      justifyContent="space-between"
      alignItems="flex-start"
      flexWrap="wrap"
      gap={1.5}
      sx={{ mb: 2.5 }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography component="h2" sx={{ fontSize: "1rem", fontWeight: 700, letterSpacing: "-0.01em", color: "text.primary" }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" sx={{ mt: 0.25 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {actions}
    </Stack>
  );
}
