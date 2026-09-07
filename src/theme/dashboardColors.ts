import { ACTA_STATUS_TOKENS } from "./statusTokens";
import type { ActaStatus } from "./statusTokens";

/**
 * Sistema de color exclusivo del dashboard.
 *
 * Reglas duras (no romper al tocar este archivo):
 * 1. ACCENT es el UNICO color para "esto es lo importante" (barra de ranking,
 *    punto final de la tendencia). No se usa para nada mas.
 * 2. La paleta categorica es fija y en orden — el color de una categoria se
 *    calcula por su posicion en el catalogo (displayOrder), NUNCA por su
 *    posicion en un array ya filtrado/ordenado por magnitud. Asi "Primera
 *    vez" es siempre el mismo azul, cambie el filtro de fechas o no.
 * 3. La paleta de estado (actasPorEstado) es su propio set, reutilizando los
 *    mismos tokens que ya usa EstadoActaChip en el resto de la app (para que
 *    un estado se vea igual en todas partes) — nunca se usa esta paleta para
 *    "categoria numero 4" en otra grafica, ni al reves.
 * 4. Cada color tiene version light y dark, elegidas a mano (no un invert
 *    automatico) para que ninguna se vea lavada sobre su propio fondo.
 *
 * La paleta categorica esta basada en Okabe-Ito, el set de colores
 * cientificamente validado para deficiencias de daltonismo mas comun
 * (protanopia/deuteranopia/tritanopia) — mantiene separacion perceptible
 * entre colores adyacentes incluso sin percepcion normal del color. Aun asi,
 * en toda la UI el color nunca es el unico medio para distinguir algo: sigue
 * yendo acompañado de etiqueta y, en actasPorEstado, tambien de icono.
 */
export type ChartMode = "light" | "dark";

export const ACCENT_COLOR: Record<ChartMode, string> = {
  light: "#2563EB",
  dark: "#5B9BFF",
};

export const CHART_TEXT_COLOR: Record<ChartMode, string> = {
  light: "#64748B",
  dark: "#AEB6C2",
};

export const CHART_GRID_COLOR: Record<ChartMode, string> = {
  light: "#E7E9EE",
  dark: "#333B47",
};

export const CHART_TOOLTIP_BG: Record<ChartMode, string> = {
  light: "#FFFFFF",
  dark: "#1E2530",
};

const CATEGORY_PALETTE: Record<ChartMode, string[]> = {
  light: [
    "#0072B2", // azul
    "#E69F00", // naranja
    "#009E73", // verde azulado
    "#CC79A7", // purpura rojizo
    "#56B4E9", // celeste
    "#D55E00", // bermellon
    "#B0A100", // amarillo oscurecido (F0E442 oscurecido para legibilidad sobre blanco)
  ],
  dark: [
    "#5DA3DD", // azul
    "#FFC24D", // naranja
    "#3FCFA3", // verde azulado
    "#E29BC4", // purpura rojizo
    "#8AD3F7", // celeste
    "#FF8A47", // bermellon
    "#E8DC5E", // amarillo
  ],
};

export const OTHERS_CATEGORY_COLOR: Record<ChartMode, string> = {
  light: "#9AA3B2",
  dark: "#7C8698",
};

/** Color de una categoria por su posicion FIJA en el catalogo (displayOrder), no por su posicion en un array ya ordenado por magnitud. */
export function getCategoryColor(catalogIndex: number, mode: ChartMode): string {
  const palette = CATEGORY_PALETTE[mode];
  return palette[catalogIndex % palette.length];
}

const STATUS_COLOR_DARK: Record<ActaStatus, string> = {
  BORRADOR: "#9AA3B2",
  REGISTRADA: "#6FA8EA",
  PENDIENTE_REVISION: "#E0B84A",
  OBSERVADA: "#F08A4B",
  APROBADA: "#4CAF7D",
  RECHAZADA: "#E86A6A",
  ANULADA: "#9AA3B2",
};

/** Paleta de estado — exclusiva de actasPorEstado, nunca reutilizar como categorica. */
export function getStatusColor(status: ActaStatus, mode: ChartMode): string {
  return mode === "dark" ? STATUS_COLOR_DARK[status] : ACTA_STATUS_TOKENS[status].color;
}

export const ACTA_STATUS_ORDER: ActaStatus[] = [
  "BORRADOR",
  "REGISTRADA",
  "PENDIENTE_REVISION",
  "OBSERVADA",
  "APROBADA",
  "RECHAZADA",
  "ANULADA",
];
