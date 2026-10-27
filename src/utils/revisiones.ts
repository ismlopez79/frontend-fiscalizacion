import type { ReviewHistoryDto } from "@/types/acta";
import { formatDateTime } from "@/utils/dateFormat";

type Sujeto = "acta" | "informe";

/** Participio segun el genero del documento: "Acta rechazada", "Informe rechazado". */
const PARTICIPIO: Record<string, Record<Sujeto, string>> = {
  OBSERVADA: { acta: "observada", informe: "observado" },
  RECHAZADA: { acta: "rechazada", informe: "rechazado" },
  APROBADA: { acta: "aprobada", informe: "aprobado" },
  ANULADA: { acta: "anulada", informe: "anulado" },
};

/**
 * La decision que dejo el documento en su estado actual: la mas reciente con
 * ese mismo estado. Se ordena aqui en vez de confiar en el orden de la API.
 */
export function ultimaRevision(reviews: ReviewHistoryDto[] | undefined, status: string): ReviewHistoryDto | undefined {
  return [...(reviews ?? [])]
    .filter((r) => r.status === status)
    .sort((a, b) => b.reviewedAt.localeCompare(a.reviewedAt))[0];
}

/**
 * Titulo del aviso con quien decidio y cuando:
 * "Acta rechazada por Rosa Martínez el 27 oct 2026, 09:15". Sin la revision
 * (cargando o sin acceso) queda solo "Acta rechazada".
 */
export function tituloRevision(sujeto: Sujeto, status: string, review?: ReviewHistoryDto): string {
  const base = `${sujeto === "acta" ? "Acta" : "Informe"} ${PARTICIPIO[status]?.[sujeto] ?? status.toLowerCase()}`;
  return review ? `${base} por ${review.reviewerName} el ${formatDateTime(review.reviewedAt)}` : base;
}
