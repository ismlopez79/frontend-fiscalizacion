import axios from "axios";

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
    }
    return Promise.reject(error);
  }
);
