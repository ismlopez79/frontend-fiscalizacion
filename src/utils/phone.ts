/**
 * Telefono salvadoreno: 4 digitos + guion + 4 digitos (1234-5678). Opcional
 * en usuarios permanentes y delegados temporales desde la migracion V31; el
 * backend responde 400 si llega con otro formato.
 */
export const PHONE_REGEX = /^\d{4}-\d{4}$/;

export const PHONE_HELPER_TEXT = "Opcional. Formato 1234-5678.";

/** Mascara de input: solo digitos, guion tras el cuarto, maximo 9 caracteres. */
export function formatPhoneInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 4) return digits;
  return `${digits.slice(0, 4)}-${digits.slice(4)}`;
}
