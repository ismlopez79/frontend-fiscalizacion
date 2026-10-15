/** Lado mayor de la foto ya reducida: de sobra para verla ampliada en pantalla completa. */
const MAX_SIDE_PX = 1600;
const JPEG_QUALITY = 0.9;
/** Una foto que ya es chica y liviana se sube tal cual, sin recomprimir. */
const SKIP_BELOW_BYTES = 1024 * 1024;

/**
 * Reduce una foto en el navegador antes de subirla: la camara o la galeria de
 * un celular entregan 3-15 MB y 12-48 megapixeles, mucho mas de lo que una
 * foto de perfil necesita, y con mala señal esa subida tarda o falla. Se
 * escala para que el lado mayor no pase de 1600 px y se guarda como JPG de
 * alta calidad (queda en unos cientos de kB, sin diferencia visible en
 * pantalla). De paso convierte a JPG formatos que el backend no acepta pero
 * el navegador si sabe leer (ej. WEBP).
 *
 * Si el navegador no logra leer la imagen (formato no soportado, foto
 * demasiado grande para la memoria del telefono) devuelve el archivo
 * original: quien llama aplica sus validaciones de siempre.
 */
export async function shrinkPhoto(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    // El navegador ya aplica la orientacion EXIF al decodificar: la foto no sale girada.
    await img.decode();

    const longest = Math.max(img.naturalWidth, img.naturalHeight);
    if (longest === 0) return file;
    const isAccepted = file.type === "image/jpeg" || file.type === "image/png";
    if (isAccepted && longest <= MAX_SIDE_PX && file.size <= SKIP_BELOW_BYTES) return file;

    const scale = Math.min(1, MAX_SIDE_PX / longest);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    // JPG no tiene transparencia: un PNG transparente quedaria con fondo negro.
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
    if (!blob) return file;
    // Rarisimo, pero si no se gano nada se conserva el original aceptado.
    if (isAccepted && blob.size >= file.size) return file;

    const name = file.name.replace(/\.[^.]+$/, "") || "foto";
    return new File([blob], `${name}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(url);
  }
}
