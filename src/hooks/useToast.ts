import { useCallback, useState } from "react";

export type ToastSeverity = "success" | "error";

export interface ToastState {
  severity: ToastSeverity;
  message: string;
}

/**
 * Estado de un toast simple (severity + mensaje) mostrado via Snackbar.
 * Antes reimplementado identico (useState + setToast) en 10 paginas.
 * Empareja con <ToastSnackbar /> (src/components/ToastSnackbar.tsx).
 */
export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((severity: ToastSeverity, message: string) => {
    setToast({ severity, message });
  }, []);

  const closeToast = useCallback(() => setToast(null), []);

  return { toast, showToast, closeToast };
}
