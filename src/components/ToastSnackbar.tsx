import { Alert, Snackbar } from "@mui/material";
import type { ToastState } from "@/hooks/useToast";

interface ToastSnackbarProps {
  toast: ToastState | null;
  onClose: () => void;
  autoHideDuration?: number;
}

/**
 * Snackbar+Alert compartido para el toast de exito/error (antes
 * reimplementado identico en 10 paginas). Empareja con useToast().
 */
export function ToastSnackbar({ toast, onClose, autoHideDuration = 4000 }: ToastSnackbarProps) {
  return (
    <Snackbar
      open={!!toast}
      autoHideDuration={autoHideDuration}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
    >
      {toast ? (
        <Alert severity={toast.severity} onClose={onClose} sx={{ width: "100%" }}>
          {toast.message}
        </Alert>
      ) : undefined}
    </Snackbar>
  );
}
