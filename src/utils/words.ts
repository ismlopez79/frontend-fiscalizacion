/** Minimo de palabras que exige la seccion de Observaciones (actas y formularios de fiscalizacion). */
export const OBSERVATIONS_MIN_WORDS = 30;

/** Palabras = secuencias sin espacios ("12", "JRV-04" y "sí" cuentan como una). */
export function countWords(text: string | null | undefined): number {
  return (text ?? "").trim().match(/\S+/g)?.length ?? 0;
}

/** Mensaje unico para cuando faltan palabras, igual en todos los formularios. */
export function missingWordsMessage(words: number, min = OBSERVATIONS_MIN_WORDS): string {
  return `Escribe al menos ${min} palabras (llevas ${words}, faltan ${min - words}).`;
}
