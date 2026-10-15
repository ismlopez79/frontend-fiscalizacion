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
 * AuthContext) porque el interceptor de abajo necesita limpiarla en un 401
 * y marcarla en un 403 PROFILE_INCOMPLETE_REQUIRED — AuthContext es quien la
 * escribe (applyAuthResponse) y lee para poblar su estado de React, pero el
 * storage en si es de este modulo para evitar un import circular entre ambos.
 */
export interface StoredSession {
  username: string;
  fullName: string;
  roles: string[];
  primerIngreso: boolean;
  /** Ausente en sesiones guardadas antes de este campo: se trata como true. */
  profileComplete?: boolean;
  scope: AuthScope;
}

const SESSION_STORAGE_KEY = "jve_auth_session";

/**
 * Donde se completa el perfil obligatorio (correo, telefono y foto): la misma
 * pantalla "Mi cuenta", que ya permite editar todo eso. No hay pantalla aparte.
 */
export const COMPLETE_PROFILE_PATH = "/perfil";

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
 * Excepcion: POST /auth/change-password tambien responde 401
 * INVALID_CREDENTIALS cuando el "currentPassword" enviado no coincide (caso
 * B, cambio voluntario) — ahi no es una sesion vencida, es un error de
 * formulario que la propia pantalla debe mostrar, sin destruir un token FULL
 * valido en el proceso. Cualquier otro 401 de esa ruta (SESSION_EXPIRED,
 * token vencido) si es sesion terminada.
 *
 * Modulo de Elecciones apagado: a un DELEGADO_TEMPORAL el backend le
 * responde 401 SESSION_EXPIRED en cualquier ruta, asi que sale por este
 * mismo camino. Un usuario permanente que recibe 403 MODULE_DISABLED sigue
 * con sesion valida: la pantalla que hizo el request muestra el mensaje.
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const data = error.response?.data as Partial<ApiErrorResponse> | undefined;
    const errorCode = data?.code ?? data?.error;
    const isWrongCurrentPassword =
      error.config?.url?.includes("/auth/change-password") && errorCode === "INVALID_CREDENTIALS";
    // El 401 del propio login es "credenciales invalidas", no una sesion
    // terminada: lo muestra LoginPage.
    const isLoginCall = error.config?.url?.includes("/auth/login");
    if (error.response?.status === 401 && !isWrongCurrentPassword && !isLoginCall) {
      // Sesion terminada (token vencido, invalidado porque la contraseña de
      // la cuenta se cambio/restablecio, o delegado temporal con el modulo de
      // Elecciones apagado): se limpia TODO, token y sesion.
      setStoredToken(null);
      setStoredSession(null);
      const currentPath = window.location.pathname + window.location.search;
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = `/login?redirectTo=${encodeURIComponent(currentPath)}`;
      }
      return Promise.reject(error);
    }

    // 403 PROFILE_INCOMPLETE_REQUIRED: al usuario le falta correo, telefono o
    // foto. El backend lo re-evalua en cada request, asi que puede llegar a
    // mitad de una sesion ya abierta (p. ej. un admin le borro el telefono).
    // Se marca la sesion y se lleva a la persona a completar su perfil; desde
    // ahi solo se llaman los endpoints .../me, que el backend si permite.
    if (error.response?.status === 403 && errorCode === "PROFILE_INCOMPLETE_REQUIRED") {
      const session = getStoredSession();
      if (session) setStoredSession({ ...session, profileComplete: false });
      if (!window.location.pathname.startsWith(COMPLETE_PROFILE_PATH)) {
        const currentPath = window.location.pathname + window.location.search;
        window.location.href = `${COMPLETE_PROFILE_PATH}?redirectTo=${encodeURIComponent(currentPath)}`;
      }
    }

    return Promise.reject(error);
  }
);
