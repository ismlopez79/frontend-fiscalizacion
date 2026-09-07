import { Box, Paper, Skeleton, Stack, Typography } from "@mui/material";
import type { SvgIconComponent } from "@mui/icons-material";
import { designTokens, numericDataSx } from "@/theme/theme";

interface StatTileProps {
  label: string;
  value: number | null;
  icon: SvgIconComponent;
  /** Color del icono y su fondo (badge). Cada tile lleva el suyo, fijo — no es semaforo de estado. */
  color: string;
  loading?: boolean;
  /** Posicion en la fila, para escalonar la entrada (30-80ms por tile). */
  index?: number;
}

const numberFormatter = new Intl.NumberFormat("es-SV");

/**
 * Tile numerico simple: la cifra manda, todo lo demas es apoyo. Nada de
 * graficas para representar un solo numero — eso es lo que pide el brief.
 * El badge de color es solo decorativo/identificador del tile, nunca el
 * unico medio para leer el valor (el numero y la etiqueta ya lo dicen).
 */
export function StatTile({ label, value, icon: Icon, color, loading, index = 0 }: StatTileProps) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2.25,
        flex: "1 1 180px",
        minWidth: 170,
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
        "@keyframes statTileIn": {
          from: { opacity: 0, transform: "translateY(6px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
        "@keyframes statTileInReduced": {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
        opacity: 0,
        animation: `statTileIn 250ms ${designTokens.easeOut} ${index * 45}ms both`,
        "@media (prefers-reduced-motion: reduce)": {
          animation: `statTileInReduced 250ms ${designTokens.easeOut} ${index * 45}ms both`,
        },
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.25}>
        <Box
          sx={{
            width: 38,
            height: 38,
            borderRadius: "10px",
            bgcolor: `${color}1F`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon fontSize="small" sx={{ color }} />
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.3 }}>
          {label}
        </Typography>
      </Stack>
      {loading ? (
        <Skeleton variant="text" width={80} height={40} />
      ) : (
        <Typography sx={{ ...numericDataSx, fontSize: "1.75rem", color: "text.primary" }}>
          {value === null ? "—" : numberFormatter.format(value)}
        </Typography>
      )}
    </Paper>
  );
}
