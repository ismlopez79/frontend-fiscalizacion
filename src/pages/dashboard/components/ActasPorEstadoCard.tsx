import { Box, Skeleton, Stack, Tooltip, Typography } from "@mui/material";
import { ACTA_STATUS_TOKENS } from "@/theme/statusTokens";
import { ACTA_STATUS_ORDER, getStatusColor } from "@/theme/dashboardColors";
import { designTokens } from "@/theme/theme";
import type { DashboardResumen } from "@/types/dashboard";
import { dashboardNumberFormatter as fmt, formatPercent } from "../dashboardFormat";
import { SectionHeader, Surface } from "@/components/ui/Surface";

interface ActasPorEstadoCardProps {
  resumen: DashboardResumen | undefined;
  loading: boolean;
}

/**
 * Los 7 estados son etapas de un mismo proceso: una barra segmentada fina
 * da la proporcion de un vistazo, y la leyenda debajo da el valor exacto.
 * Color nunca es el unico medio — cada estado lleva icono, nombre y cifra.
 */
export function ActasPorEstadoCard({ resumen, loading }: ActasPorEstadoCardProps) {
  const total = resumen ? Object.values(resumen.actasPorEstado).reduce((a, b) => a + b, 0) : 0;
  const present = ACTA_STATUS_ORDER.filter((s) => (resumen?.actasPorEstado[s] ?? 0) > 0);

  return (
    <Surface>
      <SectionHeader
        title="Actas por estado"
        subtitle={loading ? <Skeleton width={120} /> : `${fmt.format(total)} actas en el sistema`}
      />

      {loading ? (
        <Skeleton variant="rounded" height={10} sx={{ borderRadius: 999 }} />
      ) : total === 0 ? (
        <Typography variant="body2">Aún no hay actas registradas.</Typography>
      ) : (
        <Stack direction="row" gap="3px" sx={{ height: 10 }}>
          {present.map((status) => {
            const count = resumen!.actasPorEstado[status];
            return (
              <Tooltip
                key={status}
                title={`${ACTA_STATUS_TOKENS[status].label}: ${fmt.format(count)} (${formatPercent(count, total)})`}
              >
                <Box
                  sx={{
                    flex: `${count} 1 0`,
                    minWidth: 6,
                    borderRadius: 999,
                    bgcolor: getStatusColor(status, "light"),
                    transition: `flex-grow 320ms ${designTokens.easeOut}`,
                  }}
                />
              </Tooltip>
            );
          })}
        </Stack>
      )}

      <Box
        component="ul"
        sx={{
          listStyle: "none",
          m: 0,
          mt: 2.5,
          p: 0,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
          columnGap: 3,
          rowGap: 1.25,
        }}
      >
        {ACTA_STATUS_ORDER.map((status) => {
          const token = ACTA_STATUS_TOKENS[status];
          const Icon = token.icon;
          const count = resumen?.actasPorEstado[status] ?? 0;
          return (
            <Stack component="li" key={status} direction="row" alignItems="center" gap={1} sx={{ minHeight: 28 }}>
              <Icon sx={{ fontSize: 16, color: getStatusColor(status, "light"), flexShrink: 0 }} />
              <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }} noWrap>
                {token.label}
              </Typography>
              {loading ? (
                <Skeleton width={40} />
              ) : (
                <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                  <Box component="span" sx={{ fontWeight: 700, color: "text.primary" }}>
                    {fmt.format(count)}
                  </Box>
                  <Box component="span" sx={{ color: designTokens.textCaption, ml: 0.75 }}>
                    {formatPercent(count, total)}
                  </Box>
                </Typography>
              )}
            </Stack>
          );
        })}
      </Box>
    </Surface>
  );
}
