/**
 * DUI salvadoreno: 8 digitos + guion + 1 digito verificador (12345678-9).
 * Requerido y unico (cruzado entre usuarios y delegados) desde la
 * migracion V15. Registros creados antes de esa fecha pueden tener
 * dui: null todavia — se vuelve obligatorio la primera vez que se editen.
 */
export const DUI_REGEX = /^\d{8}-\d$/;

export const DUI_HELPER_TEXT = "Formato 12345678-9.";

/**
 * Mascara de input: conserva solo digitos, inserta el guion despues del
 * octavo y corta en 10 caracteres (8 + guion + 1). Facilita escribir el DUI
 * sin que el usuario tenga que teclear el guion el mismo.
 */
export function formatDuiInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 9);
  if (digits.length <= 8) return digits;
  return `${digits.slice(0, 8)}-${digits.slice(8)}`;
}
