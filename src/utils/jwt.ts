/**
 * Lectura ligera del claim `exp` de un JWT (sin libreria extra) para poder
 * detectar un token vencido en el cliente antes de montar una ruta protegida,
 * en vez de esperar a que el backend responda 401 (ver interceptor en
 * api/client.ts, que sigue siendo la fuente de verdad para todo lo demas:
 * firma invalida, token malformado, revocacion, etc).
 */
export function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== "number") {
    // Sin exp legible: no podemos confirmar vencimiento aqui, que decida el backend.
    return false;
  }
  return payload.exp * 1000 <= Date.now();
}

function decodeJwtPayload(token: string): { exp?: number } | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}
