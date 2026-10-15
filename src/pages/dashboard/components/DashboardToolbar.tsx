import { Box, Stack, TextField, Typography } from "@mui/material";
import { FloatingToolbar, toolbarFieldSx } from "@/components/ui/FloatingToolbar";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { DATE_PRESETS, getMonthRange, getPresetRange, matchMonth, matchPreset } from "../dashboardFormat";
import { MonthPicker } from "./MonthPicker";
import type { DatePreset } from "../dashboardFormat";

interface DashboardToolbarProps {
  from: string;
  to: string;
  onRangeChange: (from: string, to: string) => void;
}

/**
 * Un solo filtro de periodo para todo el panel (fecha del acta fisica, no de
 * digitacion), en la barra flotante de vidrio compartida: rangos rapidos,
 * un mes concreto (para ver meses pasados) o fechas a mano.
 */
export function DashboardToolbar({ from, to, onRangeChange }: DashboardToolbarProps) {
  const preset = matchPreset(from, to);

  return (
    <FloatingToolbar>
      <Stack direction="row" alignItems="center" flexWrap="wrap" gap={1.5}>
        <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary", mr: 0.5 }}>
          Fecha del acta
        </Typography>
        <Box sx={{ maxWidth: "100%", overflowX: "auto" }}>
          <SegmentedControl<DatePreset>
            ariaLabel="Rango rápido de fechas"
            options={DATE_PRESETS}
            value={preset}
            onChange={(value) => {
              const range = getPresetRange(value);
              onRangeChange(range.from, range.to);
            }}
          />
        </Box>
        <MonthPicker
          value={matchMonth(from, to)}
          onChange={(month) => {
            const range = getMonthRange(month);
            onRangeChange(range.from, range.to);
          }}
        />
        <Stack direction="row" alignItems="center" gap={1} sx={{ ml: { md: "auto" } }}>
          <TextField
            type="date"
            size="small"
            aria-label="Desde"
            value={from}
            onChange={(e) => onRangeChange(e.target.value, to)}
            inputProps={{ max: to || undefined }}
            sx={{ width: 150, ...toolbarFieldSx, "& input": { fontVariantNumeric: "tabular-nums" } }}
          />
          <Typography variant="body2" aria-hidden>
            –
          </Typography>
          <TextField
            type="date"
            size="small"
            aria-label="Hasta"
            value={to}
            onChange={(e) => onRangeChange(from, e.target.value)}
            inputProps={{ min: from || undefined }}
            sx={{ width: 150, ...toolbarFieldSx, "& input": { fontVariantNumeric: "tabular-nums" } }}
          />
        </Stack>
      </Stack>
    </FloatingToolbar>
  );
}
