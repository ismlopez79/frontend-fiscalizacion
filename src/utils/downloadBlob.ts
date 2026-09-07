/**
 * Dispara la descarga de un blob en el navegador via un <a> temporal.
 * Usado para las plantillas .xlsx de carga masiva (la API las devuelve
 * como binario, no como JSON).
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
