import dayjs from "dayjs";
import "dayjs/locale/es";

/** "2026-09-25" -> "25 sep 2026". Locale por instancia para no tocar el idioma global de dayjs. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = dayjs(value);
  return d.isValid() ? d.locale("es").format("D MMM YYYY") : value;
}

export function formatDateTime(value: string): string {
  return dayjs(value).locale("es").format("D MMM YYYY, HH:mm");
}

/** "08:30:00" -> "08:30". */
export function formatTime(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.slice(0, 5);
}
