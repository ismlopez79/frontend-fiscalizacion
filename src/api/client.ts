import axios from "axios";
import type { AuthScope } from "@/types/auth";
import type { ApiErrorResponse } from "@/types/common";

/**
 * Cliente Axios unico de la app. Todos los servicios de /api deben
 * construirse sobre esta instancia (nunca instanciar axios suelto en
 * un componente).
 */
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api",
  headers: {
    "Content-Type": "application/json",
  },
});

const TOKEN_STORAGE_KEY = "jve_auth_token";

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

/**
 * Sesion liviana (roles, etc.) guardada junto al token. Vive aqui (no en
 * AuthContext) porque el interceptor de abajo necesita leer el rol del
 * usuario para decidir si un 403 MODULE_DISABLED debe forzar el logout de un
 * delegado temporal — AuthContext es quien la escribe (applyAuthResponse) y
 * lee para poblar su estado de React, pero el storage en si es de este
 * modulo para evitar un import circular entre ambos.
 */
export interface StoredSession {
  username: string;
  fullName: string;
  roles: string[];
  primerIngreso: boolean;
  scope: AuthScope;
}

const SESSION_STORAGE_KEY = "jve_auth_session";

export function getStoredSession(): StoredSession | null {
  const raw = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

export function setStoredSession(session: StoredSession | null): void {
  if (session) {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  }
}

apiClient.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  /**
   * Esta instancia fija Content-Type: application/json por defecto (arriba).
   * Para uploads (carga masiva, adjuntar archivo a un acta) el body es un
   * FormData, y el transformRequest por defecto de axios, al ver
   * Content-Type: application/json ya presente, entiende que hay que
   * serializar el FormData a JSON en vez de enviarlo tal cual — el request
   * termina viajando como application/json con un objeto vacio/inutil en
   * vez de multipart/form-data con el archivo. Hay que borrar el header
   * para estos casos: sin el, axios (y el navegador) arman el multipart con
   * el boundary correcto solos.
   */
  if (config.data instanceof FormData) {
    config.headers.delete("Content-Type");
  }
  return config;
});

/**
 * Si el backend responde 401 (token vencido/invalido), limpiamos la sesion
 * y forzamos vuelta a login. El componente de rutas protegidas se encarga
 * de recordar a donde queria ir el usuario para volver ahi tras loguearse.
 *
 * Excepcion: POST /auth/change-password tambien responde 401 cuando el
 * "currentPassword" enviado no coincide (caso B, cambio voluntario) — ahi no
 * es una sesion vencida, es un error de formulario que la propia pantalla
 * debe mostrar, sin destruir un token FULL valido en el proceso.
 *
 * 403 MODULE_DISABLED (modulo de Elecciones apagado): solo forzamos logout
 * si el usuario en sesion es DELEGADO_TEMPORAL — su cuenta deja de ser
 * valida mientras el modulo este apagado, incluso a mitad de sesion (ver
 * seccion 4.4 del prompt). Un delegado permanente (DIGITADOR/SUPERVISOR/
 * ADMINISTRADOR) que pierde FORM_* sigue con sesion valida para todo lo
 * demas (Actas/Duicentros, preparar la proxima eleccion, etc.), asi que ahi
 * NO se cierra sesion: la pantalla que hizo el request ya muestra el
 * mensaje del backend (data.message) via su manejo de error existente.
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const isChangePasswordCall = error.config?.url?.includes("/auth/change-password");
    if (error.response?.status === 401 && !isChangePasswordCall) {
      setStoredToken(null);
      const currentPath = window.location.pathname + window.location.search;
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = `/login?redirectTo=${encodeURIComponent(currentPath)}`;
      }
      return Promise.reject(error);
    }

    const data = error.response?.data as Partial<ApiErrorResponse> | undefined;
    const errorCode = data?.code ?? data?.error;
    if (error.response?.status === 403 && errorCode === "MODULE_DISABLED") {
      const session = getStoredSession();
      const isTemporaryDelegate = session?.roles.includes("DELEGADO_TEMPORAL") ?? false;
      if (isTemporaryDelegate) {
        setStoredToken(null);
        setStoredSession(null);
        if (!window.location.pathname.startsWith("/login")) {
          const params = new URLSearchParams();
          if (data?.message) params.set("moduleDisabledMessage", data.message);
          window.location.href = `/login?${params.toString()}`;
        }
      }
    }

    return Promise.reject(error);
  }
);
