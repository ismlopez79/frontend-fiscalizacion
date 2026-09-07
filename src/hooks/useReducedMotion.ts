import { useEffect, useState } from "react";

/**
 * Refleja prefers-reduced-motion en vivo (cambia si el usuario ajusta la
 * preferencia del sistema mientras la app esta abierta). Se usa para apagar
 * animaciones dirigidas por JS (recharts, springs) donde un simple @media
 * en CSS no alcanza.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = () => setReduced(mql.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  return reduced;
}
