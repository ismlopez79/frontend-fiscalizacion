import { Button, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { ErrorStatePage } from "@/components/ErrorStatePage";

export function ForbiddenPage() {
  return (
    <ErrorStatePage>
      <LockOutlinedIcon sx={{ fontSize: 48, color: "text.secondary" }} />
      <Typography variant="h3">No tienes acceso a esta sección</Typography>
      <Typography variant="body2" color="text.secondary">
        Si crees que esto es un error, contacta a un administrador del sistema.
      </Typography>
      <Button component={RouterLink} to="/dashboard" variant="contained">
        Volver al dashboard
      </Button>
    </ErrorStatePage>
  );
}
