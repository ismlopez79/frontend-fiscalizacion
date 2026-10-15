import { Box, Skeleton, Stack, Typography } from "@mui/material";
import { designTokens } from "@/theme/theme";
import { dashboardNumberFormatter as fmt } from "../dashboardFormat";

export interface RankedRow {
  key: string;
  label: string;
  sublabel?: string;
  value: number;
  /** Texto chico a la derecha de la cifra (p. ej. "34 actas"). */
  secondary?: string;
  color: string;
}

interface RankedListProps {
  rows: RankedRow[];
  loading: boolean;
  showRank?: boolean;
  emptyTitle: string;
  emptyHint: string;
  skeletonRows?: number;
}

/**
 * Lista con barra integrada (estilo Tiempo en pantalla de iOS) en lugar de
 * un grafico de barras con ejes: los nombres largos se leen completos, la
 * cifra exacta esta a la vista sin tooltip, y la barra da la proporcion.
 * La barra crece con transform: scaleX — al cambiar el filtro, las barras
 * se reacomodan con una transicion interrumpible en vez de redibujarse.
 */
export function RankedList({ rows, loading, showRank, emptyTitle, emptyHint, skeletonRows = 5 }: RankedListProps) {
  if (loading && rows.length === 0) {
    return (
      <Stack gap={2}>
        {Array.from({ length: skeletonRows }).map((_, i) => (
          <Box key={i}>
            <Skeleton width={`${60 - i * 6}%`} />
            <Skeleton variant="rounded" height={6} sx={{ mt: 0.75, borderRadius: 999 }} />
          </Box>
        ))}
      </Stack>
    );
  }

  if (rows.length === 0) {
    return (
      <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 200, textAlign: "center", px: 2 }}>
        <Typography sx={{ fontWeight: 600, color: "text.primary" }}>{emptyTitle}</Typography>
        <Typography variant="body2">{emptyHint}</Typography>
      </Stack>
    );
  }

  const max = Math.max(...rows.map((r) => r.value), 1);

  return (
    <Stack component="ol" gap={1.75} sx={{ listStyle: "none", m: 0, p: 0, opacity: loading ? 0.6 : 1, transition: "opacity 150ms ease" }}>
      {rows.map((row, index) => (
        <Box component="li" key={row.key}>
          <Stack direction="row" alignItems="baseline" gap={1.25}>
            {showRank && (
              <Typography
                variant="caption"
                sx={{ width: 18, flexShrink: 0, fontVariantNumeric: "tabular-nums", textAlign: "right" }}
              >
                {index + 1}
              </Typography>
            )}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" noWrap sx={{ fontWeight: 600, color: "text.primary" }} title={row.label}>
                {row.label}
                {row.sublabel && (
                  <Box component="span" sx={{ fontWeight: 400, color: designTokens.textCaption, ml: 0.75 }}>
                    {row.sublabel}
                  </Box>
                )}
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
              <Box component="span" sx={{ fontWeight: 700, color: "text.primary" }}>
                {fmt.format(row.value)}
              </Box>
              {row.secondary && (
                <Box component="span" sx={{ color: designTokens.textCaption, ml: 0.75 }}>
                  {row.secondary}
                </Box>
              )}
            </Typography>
          </Stack>
          <Box
            sx={{
              mt: 0.75,
              ml: showRank ? "28px" : 0,
              height: 6,
              borderRadius: 999,
              bgcolor: "rgba(15, 23, 42, 0.05)",
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                height: "100%",
                borderRadius: 999,
                bgcolor: row.color,
                transformOrigin: "left center",
                transform: `scaleX(${row.value / max})`,
                transition: `transform 360ms ${designTokens.easeOut}`,
                "@media (prefers-reduced-motion: reduce)": { transition: "none" },
              }}
            />
          </Box>
        </Box>
      ))}
    </Stack>
  );
}
