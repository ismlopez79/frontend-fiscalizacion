import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { COMPLETE_PROFILE_PATH } from "@/api/client";

const EXEMPT_ROLE = "ADMINISTRADOR";

/**
 * Bloquea el resto de la app mientras al usuario le falte correo, telefono
 * o foto de perfil (profileComplete === false), llevandolo a "Mi cuenta"
 * (/perfil), que queda FUERA de este guard para poder completarlo ahi. El backend ya responde 403
 * PROFILE_INCOMPLETE_REQUIRED a todo salvo su propio perfil; este guard evita
 * que el frontend navegue (y dispare esas llamadas) para empezar, y recuerda a
 * donde queria ir para volver ahi al terminar.
 *
 * ADMINISTRADOR queda exento, igual que en el backend.
 */
export function RequireCompleteProfile() {
  const { user } = useAuth();
  const location = useLocation();

  if (user && !user.profileComplete && !user.roles.includes(EXEMPT_ROLE)) {
    const redirectTo = location.pathname + location.search;
    return <Navigate to={`${COMPLETE_PROFILE_PATH}?redirectTo=${encodeURIComponent(redirectTo)}`} replace />;
  }

  return <Outlet />;
}
