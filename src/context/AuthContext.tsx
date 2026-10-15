import { createContext, useCallback, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/api/authApi";
import { getStoredSession, getStoredToken, setStoredSession, setStoredToken, type StoredSession } from "@/api/client";
import { isTokenExpired } from "@/utils/jwt";
import type { AuthUser, LoginRequest, LoginResponse } from "@/types/auth";

/**
 * Guardamos el token JWT en localStorage y decodificamos su payload de forma
 * ligera (sin libreria extra) solo para leer roles/permisos que el backend
 * ya nos entrega en la respuesta de login. El JWT en si sigue siendo
 * validado exclusivamente por el backend en cada request.
 *
 * El storage en si (StoredSession, get/setStoredSession) vive en api/client.ts
 * porque el interceptor de respuestas tambien necesita leerlo y limpiarlo
 * (401 de sesion terminada, 403 PROFILE_INCOMPLETE_REQUIRED).
 */
interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<LoginResponse>;
  /**
   * Persiste token + sesion a partir de una respuesta de login/change-password
   * sin volver a llamar a authApi.login. La usa directo ChangePasswordPage
   * tras un POST /auth/change-password exitoso, para "canjear" el token
   * restringido (PASSWORD_CHANGE_ONLY) por el nuevo token FULL.
   */
  applyAuthResponse: (response: LoginResponse) => void;
  /** Levanta el bloqueo local de perfil incompleto (ver RequireCompleteProfile). */
  markProfileComplete: () => void;
  logout: () => void;
  hasRole: (role: string) => boolean;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<StoredSession | null>(() => {
    const token = getStoredToken();
    if (!token || isTokenExpired(token)) {
      // Token ausente o ya vencido (p.ej. la pestaña estuvo cerrada mas
      // tiempo del que dura el token): no restauramos sesion "fantasma" que
      // el guard dejaria pasar hasta que el primer fetch reciba el 401.
      if (token) setStoredToken(null);
      return null;
    }
    return getStoredSession();
  });
  const [isLoading, setIsLoading] = useState(false);

  // El cache de react-query vive en memoria y NO sabe de sesiones: sin
  // vaciarlo, la siguiente persona que inicia sesion en el mismo navegador
  // veia por unos segundos datos de la anterior (su foto, "mis actas", su
  // perfil...) hasta que cada consulta se volvia a pedir. Se vacia al cerrar
  // sesion y tambien al aplicar una sesion nueva (cubre sesiones que no se
  // cerraron, p. ej. un token que vencio).
  const queryClient = useQueryClient();

  const applyAuthResponse = useCallback((response: LoginResponse) => {
    const previous = getStoredSession();
    // Mismo usuario (p. ej. tras cambiar su contraseña): el cache es suyo, se conserva.
    if (!previous || previous.username !== response.username) {
      queryClient.cancelQueries();
      queryClient.clear();
    }
    setStoredToken(response.token);
    const newSession = {
      username: response.username,
      fullName: response.fullName,
      roles: response.roles,
      primerIngreso: response.primerIngreso,
      // Backend viejo sin el campo = no hay bloqueo por perfil.
      profileComplete: response.profileComplete ?? true,
      scope: response.scope,
    };
    setStoredSession(newSession);
    setSession(newSession);
  }, [queryClient]);

  /** Tras completar correo, telefono y foto: levanta el bloqueo en la sesion local. */
  const markProfileComplete = useCallback(() => {
    setSession((current) => {
      if (!current) return current;
      const next = { ...current, profileComplete: true };
      setStoredSession(next);
      return next;
    });
  }, []);

  const login = useCallback(
    async (credentials: LoginRequest) => {
      setIsLoading(true);
      try {
        const response = await authApi.login(credentials);
        applyAuthResponse(response);
        return response;
      } finally {
        setIsLoading(false);
      }
    },
    [applyAuthResponse]
  );

  const logout = useCallback(() => {
    setStoredToken(null);
    setStoredSession(null);
    setSession(null);
    queryClient.cancelQueries();
    queryClient.clear();
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session
        ? {
            username: session.username,
            fullName: session.fullName,
            roles: session.roles,
            // Los permisos finos (ACTA_CREATE, CATALOG_MANAGE, etc.) hoy no
            // vienen en la respuesta de login. Cuando el backend los incluya,
            // se completan aqui. Por ahora los guards usan roles.
            permissions: [],
            primerIngreso: session.primerIngreso,
            profileComplete: session.profileComplete !== false,
            scope: session.scope,
          }
        : null,
      isAuthenticated: session !== null,
      isLoading,
      login,
      applyAuthResponse,
      markProfileComplete,
      logout,
      hasRole: (role: string) => session?.roles.includes(role) ?? false,
    }),
    [session, isLoading, login, applyAuthResponse, markProfileComplete, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
