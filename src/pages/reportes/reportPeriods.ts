import dayjs from "dayjs";
import quarterOfYear from "dayjs/plugin/quarterOfYear";
import type { DashboardDateRange } from "@/types/dashboard";

dayjs.extend(quarterOfYear);

/**
 * El backend no tiene concepto de "semanal/mensual/trimestral" — solo
 * recibe from/to (ver GET /reportes/*.pdf). Estos presets son pura UX del
 * frontend: se resuelven a un rango concreto antes de llamar a la API.
 */
export type PeriodPreset = "semana" | "mes" | "trimestre" | "historico" | "personalizado";

export const PERIOD_PRESET_LABELS: Record<PeriodPreset, string> = {
  semana: "Semana actual",
  mes: "Mes actual",
  trimestre: "Trimestre actual",
  historico: "Todo el histórico",
  personalizado: "Rango personalizado",
};

export function computeRange(
  preset: PeriodPreset,
  customFrom: string,
  customTo: string
): DashboardDateRange {
  const today = dayjs();
  switch (preset) {
    case "semana":
      return { from: today.startOf("week").format("YYYY-MM-DD"), to: today.endOf("week").format("YYYY-MM-DD") };
    case "mes":
      return { from: today.startOf("month").format("YYYY-MM-DD"), to: today.endOf("month").format("YYYY-MM-DD") };
    case "trimestre":
      return {
        from: today.startOf("quarter").format("YYYY-MM-DD"),
        to: today.endOf("quarter").format("YYYY-MM-DD"),
      };
    case "historico":
      return {};
    case "personalizado":
      return { from: customFrom || undefined, to: customTo || undefined };
  }
}

/** Mismo texto que el backend usaria en la portada del PDF (ver contrato: "Todo el historico", "Desde el ...", "Hasta el ..."). */
export function formatRangeLabel(range: DashboardDateRange): string {
  const fmt = (d: string) => dayjs(d).format("DD/MM/YYYY");
  if (!range.from && !range.to) return "Todo el histórico";
  if (range.from && range.to) return `${fmt(range.from)} – ${fmt(range.to)}`;
  if (range.from) return `Desde el ${fmt(range.from)}`;
  return `Hasta el ${fmt(range.to!)}`;
}
