import { AxiosError } from "axios";
import type { ApiErrorResponse } from "@/types/common";

/**
 * Extrae un mensaje legible de un error de axios contra la API JVE.
 *
 * Ojo: sin header Authorization, o con token vencido/mal formado, Spring
 * Security rechaza la peticion antes de llegar al controller, asi que la
 * respuesta puede NO traer el shape ApiErrorResponse. Por eso siempre hay
 * que caer a un mensaje generico por codigo HTTP en vez de asumir
 * error.response.data.message.
 */
export function getApiErrorMessage(error: unknown, fallback = "Ocurrió un error inesperado."): string {
  if (!(error instanceof AxiosError)) {
    return fallback;
  }

  const data = error.response?.data as Partial<ApiErrorResponse> | undefined;
  if (data?.message) {
    return data.message;
  }

  switch (error.response?.status) {
    case 400:
      return "Revisa los datos del formulario: hay campos inválidos.";
    case 401:
      return "Tu sesión expiró o no es válida. Vuelve a iniciar sesión.";
    case 403:
      return "No tienes permiso para realizar esta acción.";
    case 404:
      return "El recurso solicitado no existe.";
    case 409:
      return "La operación no se puede completar por una regla de negocio.";
    case 413:
      return "El archivo supera el tamaño máximo permitido.";
    default:
      return fallback;
  }
}

/**
 * Codigo corto del error (INVALID_CREDENTIALS, ACCOUNT_LOCKED,
 * BUSINESS_RULE_VIOLATION, VALIDATION_ERROR, ...) para cuando el mismo
 * status HTTP puede significar cosas distintas segun el codigo (ej. login
 * vs cambio de contraseña, ambos con 401).
 */
export function getApiErrorCode(error: unknown): string | undefined {
  if (!(error instanceof AxiosError)) {
    return undefined;
  }
  return (error.response?.data as Partial<ApiErrorResponse> | undefined)?.error;
}

/**
 * Igual que getApiErrorMessage, pero para llamadas con responseType: "blob"
 * (descargas de PDF/Excel, ej. reportes). Axios entrega error.response.data
 * como Blob en ese caso pase lo que pase con el status — incluso si el
 * backend respondio JSON con el shape ApiErrorResponse — asi que hay que
 * leerlo como texto y parsearlo a mano para no perder el message real.
 */
export async function getBlobApiErrorMessage(
  error: unknown,
  fallback = "Ocurrió un error inesperado."
): Promise<string> {
  if (error instanceof AxiosError && error.response?.data instanceof Blob) {
    try {
      const text = await error.response.data.text();
      const parsed = JSON.parse(text) as Partial<ApiErrorResponse>;
      if (parsed.message) return parsed.message;
    } catch {
      // No era JSON parseable (ej. HTML de un 502) — cae al mensaje generico de abajo.
    }
  }
  return getApiErrorMessage(error, fallback);
}
