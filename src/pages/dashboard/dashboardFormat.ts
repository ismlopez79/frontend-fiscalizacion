import dayjs from "dayjs";
import "dayjs/locale/es";

export const dashboardNumberFormatter = new Intl.NumberFormat("es-SV");

/**
 * "2026-08" -> "agosto 2026". Se llama .locale("es") sobre la instancia, no
 * dayjs.locale("es") global, para no cambiar el idioma de fechas del resto
 * de la app (que usa DD/MM/YYYY en todos lados, sin nombres de mes).
 */
export function formatMonthLabel(mesActual: string): string {
  return dayjs(`${mesActual}-01`).locale("es").format("MMMM YYYY");
}
