import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { getStoredToken } from "@/api/client";
import { isTokenExpired } from "@/utils/jwt";

interface ProtectedRouteProps {
  /** Si se indica, el usuario debe tener al menos uno de estos roles. */
  allowedRoles?: string[];
}

/**
 * Guard de rutas. Si no hay sesion, redirige a /login recordando la ruta
 * original en el query param redirectTo (ver tambien el interceptor 401
 * en api/client.ts, que hace lo mismo ante un token vencido).
 *
 * Ademas de `isAuthenticated` (que solo refleja si hay una sesion en memoria)
 * revisamos aqui el `exp` del token en cada navegacion: si expiro mientras la
 * SPA seguia montada (tab abierta, navegacion client-side sin reload), esto
 * corta de forma sincrona antes de renderizar la ruta protegida, en vez de
 * dejarla montar y esperar a que el primer fetch reciba un 401.
 *
 * NOTA: hoy solo filtra por rol (ADMINISTRADOR/SUPERVISOR/DIGITADOR) porque
 * el login todavia no devuelve permisos finos. Cuando el backend los
 * incluya en la respuesta de login, este guard debe extenderse para
 * aceptar tambien `requiredPermissions` y usarlos junto a los @PreAuthorize
 * reales del backend (el guard de frontend es UX, no seguridad: el backend
 * sigue siendo quien manda).
 */
export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user, logout } = useAuth();
  const location = useLocation();

  const token = getStoredToken();
  const tokenExpired = Boolean(token) && isTokenExpired(token as string);
  const sessionValid = isAuthenticated && user && token && !tokenExpired;

  // Efecto (no durante el render) porque logout() dispara un setState: si
  // varias rutas protegidas re-renderizan a la vez con un token ya vencido,
  // llamarlo en el cuerpo del componente violaria las reglas de React.
  useEffect(() => {
    if (tokenExpired) logout();
  }, [tokenExpired, logout]);

  if (!sessionValid) {
    const redirectTo = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirectTo=${redirectTo}`} replace />;
  }

  if (allowedRoles && !allowedRoles.some((role) => user.roles.includes(role))) {
    return <Navigate to="/403" replace />;
  }

  return <Outlet />;
}
