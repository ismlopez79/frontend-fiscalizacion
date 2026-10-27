import { ACTA_STATUS_TOKENS } from "@/theme/statusTokens";
import { TEMPLATE_STATUS_LABELS } from "@/types/fiscalizacionFases";

/**
 * Etiqueta legible de cualquier codigo de estado (actas, informes de
 * actividad, plantillas). Los chips ya leen sus propios diccionarios; esto es
 * para texto suelto que trae el codigo crudo, como los valores de auditoria.
 * La logica sigue comparando contra el codigo, nunca contra la etiqueta.
 */
const ETIQUETA_ESTADO: Record<string, string> = {
  ...Object.fromEntries(Object.entries(ACTA_STATUS_TOKENS).map(([code, t]) => [code, t.label])),
  ...TEMPLATE_STATUS_LABELS,
};

export const etiquetaEstado = (codigo: string): string => ETIQUETA_ESTADO[codigo] ?? codigo;
