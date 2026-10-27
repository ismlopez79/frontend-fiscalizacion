import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import { EstadoActaChip } from "@/components/EstadoActaChip";
import { formatDateTime } from "@/utils/dateFormat";
import { getApiErrorMessage } from "@/utils/apiError";
import { designTokens } from "@/theme/theme";
import type { ReviewHistoryDto } from "@/types/acta";

type RevisionesHistorialProps =
  /** Ya vienen en la respuesta (informes de actividad). */
  | { reviews: ReviewHistoryDto[]; queryKey?: never; fetchReviews?: never }
  /** Se piden al abrir el dialogo (actas: GET /actas/{id}/revisiones). */
  | { reviews?: never; queryKey: readonly unknown[]; fetchReviews: () => Promise<ReviewHistoryDto[]> };

/**
 * Boton "Ver revisiones anteriores" y su dialogo: cada decision del revisor
 * (aprobar, observar, rechazar, anular) con su comentario, quien y cuando,
 * la mas reciente arriba.
 */
export function RevisionesHistorial(props: RevisionesHistorialProps) {
  const [open, setOpen] = useState(false);

  const query = useQuery({
    queryKey: props.queryKey ?? ["revisiones-inline"],
    queryFn: () => props.fetchReviews!(),
    enabled: open && !!props.fetchReviews,
  });

  const list = props.reviews ?? query.data ?? [];
  const sorted = [...list].sort((a, b) => b.reviewedAt.localeCompare(a.reviewedAt));
  const loading = !props.reviews && query.isLoading;

  return (
    <>
      <Button size="small" color="inherit" startIcon={<HistoryRoundedIcon />} onClick={() => setOpen(true)}>
        Ver revisiones anteriores
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Revisiones anteriores</DialogTitle>
        <DialogContent>
          {loading ? (
            <Stack spacing={1.5}>
              {[0, 1].map((i) => (
                <Skeleton key={i} variant="rounded" height={72} />
              ))}
            </Stack>
          ) : !props.reviews && query.isError ? (
            <Typography variant="body2" sx={{ color: designTokens.status.error.fg }}>
              {getApiErrorMessage(query.error, "No se pudo cargar el historial de revisiones.")}
            </Typography>
          ) : sorted.length === 0 ? (
            <Typography variant="body2">Todavía no hay revisiones.</Typography>
          ) : (
            <Box component="ol" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: 1.25 }}>
              {sorted.map((r) => (
                <Box component="li" key={r.id} sx={{ p: 1.5, borderRadius: "14px", bgcolor: "rgba(15, 23, 42, 0.03)" }}>
                  <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
                    <EstadoActaChip estado={r.status} />
                    <Typography variant="caption" sx={{ fontVariantNumeric: "tabular-nums" }}>
                      {r.reviewerName} · {formatDateTime(r.reviewedAt)}
                    </Typography>
                  </Stack>
                  {r.comment && (
                    <Typography variant="body2" sx={{ mt: 1, color: "text.primary", whiteSpace: "pre-line", overflowWrap: "anywhere" }}>
                      {r.comment}
                    </Typography>
                  )}
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
