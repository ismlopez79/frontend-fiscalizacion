import { Button, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { ErrorStatePage } from "@/components/ErrorStatePage";

export function NotFoundPage() {
  return (
    <ErrorStatePage>
      <Typography variant="h1">404</Typography>
      <Typography variant="body1" color="text.secondary">
        La página que buscas no existe.
      </Typography>
      <Button component={RouterLink} to="/dashboard" variant="contained">
        Volver al dashboard
      </Button>
    </ErrorStatePage>
  );
}
