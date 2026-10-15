import type { ReactNode } from "react";
import { Box, Stack, Typography } from "@mui/material";
import { designTokens } from "@/theme/theme";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
}

/** Estado vacio que enseña que hacer, no solo "no hay nada". */
export function EmptyState({ icon, title, hint, action }: EmptyStateProps) {
  return (
    <Stack alignItems="center" justifyContent="center" gap={1} sx={{ height: "100%", minHeight: 220, px: 3, textAlign: "center" }}>
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          bgcolor: "rgba(15, 23, 42, 0.05)",
          color: designTokens.textCaption,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          mb: 0.5,
        }}
      >
        {icon}
      </Box>
      <Typography sx={{ fontWeight: 700, color: "text.primary" }}>{title}</Typography>
      {hint && (
        <Typography variant="body2" sx={{ maxWidth: 360 }}>
          {hint}
        </Typography>
      )}
      {action && <Box sx={{ mt: 1 }}>{action}</Box>}
    </Stack>
  );
}
