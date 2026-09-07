import { useState } from "react";
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
} from "@mui/material";

interface ConfirmacionAccionProps {
  open: boolean;
  titulo: string;
  descripcion?: string;
  requiereComentario?: boolean;
  variant?: "default" | "destructive";
  confirmLabel?: string;
  /** Mutacion del caller en curso: deshabilita ambos botones y muestra spinner, para evitar doble submit. */
  loading?: boolean;
  onConfirm: (comment?: string) => void;
  onCancel: () => void;
}

/**
 * Dialogo de confirmacion reutilizable para las acciones del flujo de
 * revision (aprobar / observar / rechazar / anular). Cuando
 * requiereComentario es true, no permite confirmar con el campo vacio,
 * reflejando la misma regla que ya valida el backend.
 */
export function ConfirmacionAccion({
  open,
  titulo,
  descripcion,
  requiereComentario,
  variant = "default",
  confirmLabel = "Confirmar",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmacionAccionProps) {
  const [comment, setComment] = useState("");
  const commentIsInvalid = requiereComentario && comment.trim().length === 0;

  const handleConfirm = () => {
    if (commentIsInvalid || loading) return;
    onConfirm(requiereComentario ? comment.trim() : undefined);
    setComment("");
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : onCancel} maxWidth="sm" fullWidth>
      <DialogTitle>{titulo}</DialogTitle>
      <DialogContent>
        {descripcion && <DialogContentText sx={{ mb: 2 }}>{descripcion}</DialogContentText>}
        {requiereComentario && (
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            label="Comentario"
            placeholder="Explique el motivo..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            error={commentIsInvalid}
            helperText={commentIsInvalid ? "El comentario es obligatorio" : " "}
            disabled={loading}
          />
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCancel} color="inherit" disabled={loading}>
          Cancelar
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          color={variant === "destructive" ? "error" : "primary"}
          disabled={commentIsInvalid || loading}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
