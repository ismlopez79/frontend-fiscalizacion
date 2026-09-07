import { Box, Stack, Typography } from "@mui/material";

export function LoginDivider() {
  return (
    <Stack direction="row" alignItems="center" spacing={1.5}>
      <Box sx={{ flex: 1, height: "1px", backgroundColor: "#E4E7EB" }} />
      <Typography sx={{ fontSize: 13, color: "#6B7280", whiteSpace: "nowrap" }}>
        o continúa con
      </Typography>
      <Box sx={{ flex: 1, height: "1px", backgroundColor: "#E4E7EB" }} />
    </Stack>
  );
}
