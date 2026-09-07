import { apiClient } from "./client";
import type { DashboardDateRange } from "@/types/dashboard";

interface ReportePdf {
  blob: Blob;
  filename: string;
}

/**
 * El backend arma el nombre del archivo en Content-Disposition, pero ese
 * header no siempre llega al frontend (CORS no lo expone salvo que el
 * backend agregue Access-Control-Expose-Headers: Content-Disposition) — por
 * eso hay un fallback client-side que sigue el mismo patron descrito en el
 * contrato (_historico / _desde_ / _hasta_ / _a_).
 */
function buildFallbackFilename(slug: string, range: DashboardDateRange): string {
  if (!range.from && !range.to) return `reporte-${slug}_historico.pdf`;
  if (range.from && range.to) return `reporte-${slug}_${range.from}_a_${range.to}.pdf`;
  if (range.from) return `reporte-${slug}_desde_${range.from}.pdf`;
  return `reporte-${slug}_hasta_${range.to}.pdf`;
}

function extractFilename(contentDisposition: unknown, fallback: string): string {
  if (typeof contentDisposition !== "string") return fallback;
  const match = contentDisposition.match(/filename="?([^";]+)"?/);
  return match ? match[1] : fallback;
}

function rangeParams(range: DashboardDateRange) {
  return { from: range.from || undefined, to: range.to || undefined };
}

export const reportesApi = {
  /** Sin duicentroId: ranking de todos los duicentros. Con duicentroId: desglose por categoria de ese duicentro. */
  getReporteDuicentros: async (range: DashboardDateRange, duicentroId?: number): Promise<ReportePdf> => {
    const response = await apiClient.get("/reportes/duicentros.pdf", {
      params: { ...rangeParams(range), duicentroId },
      responseType: "blob",
    });
    return {
      blob: response.data,
      filename: extractFilename(
        response.headers["content-disposition"],
        buildFallbackFilename("duicentros", range)
      ),
    };
  },
  getReporteCategorias: async (range: DashboardDateRange): Promise<ReportePdf> => {
    const response = await apiClient.get("/reportes/categorias.pdf", {
      params: rangeParams(range),
      responseType: "blob",
    });
    return {
      blob: response.data,
      filename: extractFilename(
        response.headers["content-disposition"],
        buildFallbackFilename("categorias", range)
      ),
    };
  },
  getReporteUsuarios: async (range: DashboardDateRange): Promise<ReportePdf> => {
    const response = await apiClient.get("/reportes/usuarios.pdf", {
      params: rangeParams(range),
      responseType: "blob",
    });
    return {
      blob: response.data,
      filename: extractFilename(
        response.headers["content-disposition"],
        buildFallbackFilename("usuarios", range)
      ),
    };
  },
};
