import dayjs from "dayjs";
import "dayjs/locale/es";

export const dashboardNumberFormatter = new Intl.NumberFormat("es-SV");

const percentFormatter = new Intl.NumberFormat("es-SV", { maximumFractionDigits: 1 });

export function formatPercent(part: number, total: number): string {
  if (total <= 0) return "0 %";
  return `${percentFormatter.format((part / total) * 100)} %`;
}

/**
 * "2026-08" -> "agosto 2026". Se llama .locale("es") sobre la instancia, no
 * dayjs.locale("es") global, para no cambiar el idioma de fechas del resto
 * de la app (que usa DD/MM/YYYY en todos lados, sin nombres de mes).
 */
export function formatMonthLabel(mesActual: string): string {
  return dayjs(`${mesActual}-01`).locale("es").format("MMMM YYYY");
}

/** "2026-09-01".."2026-09-25" -> "1 sep – 25 sep 2026". Vacio en un extremo = abierto. */
export function formatRangeLabel(from: string, to: string): string {
  const f = from ? dayjs(from).locale("es") : null;
  const t = to ? dayjs(to).locale("es") : null;
  if (f && t) {
    const sameYear = f.year() === t.year();
    return `${f.format(sameYear ? "D MMM" : "D MMM YYYY")} – ${t.format("D MMM YYYY")}`;
  }
  if (f) return `desde el ${f.format("D MMM YYYY")}`;
  if (t) return `hasta el ${t.format("D MMM YYYY")}`;
  return "todo el historial";
}

export type DatePreset = "all" | "month" | "30d" | "year";

export const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: "all", label: "Todo" },
  { value: "month", label: "Este mes" },
  { value: "30d", label: "30 días" },
  { value: "year", label: "Este año" },
];

const ISO = "YYYY-MM-DD";

export function getPresetRange(preset: DatePreset): { from: string; to: string } {
  const today = dayjs();
  switch (preset) {
    case "month":
      return { from: today.startOf("month").format(ISO), to: today.format(ISO) };
    case "30d":
      return { from: today.subtract(29, "day").format(ISO), to: today.format(ISO) };
    case "year":
      return { from: today.startOf("year").format(ISO), to: today.format(ISO) };
    default:
      return { from: "", to: "" };
  }
}

/**
 * Rango de un mes calendario ("2026-09"). El mes en curso termina hoy, igual
 * que el preset "Este mes", para que ambos controles marquen lo mismo.
 */
export function getMonthRange(month: string): { from: string; to: string } {
  const start = dayjs(`${month}-01`);
  const end = start.endOf("month");
  const today = dayjs();
  return { from: start.format(ISO), to: (end.isAfter(today) ? today : end).format(ISO) };
}

/** "YYYY-MM" si el rango es exactamente un mes calendario; null si no. */
export function matchMonth(from: string, to: string): string | null {
  if (!from || !to) return null;
  const month = from.slice(0, 7);
  const range = getMonthRange(month);
  return range.from === from && range.to === to ? month : null;
}

export function currentMonth(): string {
  return dayjs().format("YYYY-MM");
}

export function shiftMonth(month: string, delta: number): string {
  return dayjs(`${month}-01`).add(delta, "month").format("YYYY-MM");
}

/** Nombres cortos de los 12 meses en español ("ene", "feb", ...). */
export const MONTH_SHORT_LABELS = Array.from({ length: 12 }, (_, i) =>
  dayjs().month(i).locale("es").format("MMM").replace(".", "")
);

/** Que preset coincide exactamente con el rango actual; null = rango personalizado. */
export function matchPreset(from: string, to: string): DatePreset | null {
  for (const { value } of DATE_PRESETS) {
    const range = getPresetRange(value);
    if (range.from === from && range.to === to) return value;
  }
  return null;
}

/**
 * Mas de `max` filas: las mas chicas se agrupan en "Otras" en vez de
 * inventar un color extra. `source` ya viene ordenado por total desc.
 */
export function groupWithOthers<T extends { total: number }>(
  source: T[],
  max: number,
  makeOthers: (total: number) => T
): T[] {
  if (source.length <= max) return source;
  const rest = source.slice(max).reduce((sum, r) => sum + r.total, 0);
  return [...source.slice(0, max), makeOthers(rest)];
}
