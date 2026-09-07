import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

/**
 * Bloquea el acceso al resto de la app (dashboard, menu, etc.) mientras la
 * cuenta este en scope PASSWORD_CHANGE_ONLY (primer ingreso o post-reset de
 * admin). El backend ya rechaza con 403 cualquier llamada que no sea
 * /auth/change-password con ese token; este guard evita que el frontend
 * intente navegar (y disparar esas llamadas) para empezar.
 */
export function RequireFullAccess() {
  const { user } = useAuth();

  if (user?.scope === "PASSWORD_CHANGE_ONLY") {
    return <Navigate to="/cambiar-password" replace />;
  }

  return <Outlet />;
}
