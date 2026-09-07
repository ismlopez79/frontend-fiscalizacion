import { createContext, useCallback, useMemo, useState, type ReactNode } from "react";
import { authApi } from "@/api/authApi";
import { getStoredToken, setStoredToken } from "@/api/client";
import { isTokenExpired } from "@/utils/jwt";
import type { AuthScope, AuthUser, LoginRequest, LoginResponse } from "@/types/auth";

/**
 * Guardamos el token JWT en localStorage y decodificamos su payload de forma
 * ligera (sin libreria extra) solo para leer roles/permisos que el backend
 * ya nos entrega en la respuesta de login. El JWT en si sigue siendo
 * validado exclusivamente por el backend en cada request.
 */
interface StoredSession {
  username: string;
  fullName: string;
  roles: string[];
  primerIngreso: boolean;
  scope: AuthScope;
}

const SESSION_STORAGE_KEY = "jve_auth_session";

function readStoredSession(): StoredSession | null {
  const raw = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

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
    return readStoredSession();
  });
  const [isLoading, setIsLoading] = useState(false);

  const applyAuthResponse = useCallback((response: LoginResponse) => {
    setStoredToken(response.token);
    const newSession: StoredSession = {
      username: response.username,
      fullName: response.fullName,
      roles: response.roles,
      primerIngreso: response.primerIngreso,
      scope: response.scope,
    };
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newSession));
    setSession(newSession);
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
    localStorage.removeItem(SESSION_STORAGE_KEY);
    setSession(null);
  }, []);

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
            scope: session.scope,
          }
        : null,
      isAuthenticated: session !== null,
      isLoading,
      login,
      applyAuthResponse,
      logout,
      hasRole: (role: string) => session?.roles.includes(role) ?? false,
    }),
    [session, isLoading, login, applyAuthResponse, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
