/**
 * Material de vidrio del sistema ("liquid glass" en version web).
 *
 * Regla de rendimiento: backdrop-filter SOLO en piezas chicas que flotan
 * sobre contenido (barras de filtros pegadas, menus, tooltips, barra de
 * accion movil). Nunca en tarjetas, tablas, fondos de pagina ni en el
 * backdrop de un dialogo: el costo del blur crece con el area y se paga en
 * cada frame de scroll.
 *
 * Con prefers-reduced-transparency el material pasa a solido.
 */
export const glassSx = (weight: "light" | "thick" = "light") => ({
  bgcolor: weight === "thick" ? "rgba(255, 255, 255, 0.80)" : "rgba(255, 255, 255, 0.62)",
  backdropFilter: "blur(20px) saturate(180%)",
  WebkitBackdropFilter: "blur(20px) saturate(180%)",
  // Borde claro = luz que atrapa el material; el anillo oscuro exterior lo separa del fondo claro.
  border: "1px solid rgba(255, 255, 255, 0.8)",
  "@media (prefers-reduced-transparency: reduce)": {
    bgcolor: "#FFFFFF",
    backdropFilter: "none",
    WebkitBackdropFilter: "none",
  },
});

export const glassShadow = {
  resting: "0 0 0 1px rgba(15, 23, 42, 0.05), 0 1px 2px rgba(15, 23, 42, 0.04)",
  floating: "0 0 0 1px rgba(15, 23, 42, 0.06), 0 12px 32px -12px rgba(15, 23, 42, 0.22)",
} as const;
