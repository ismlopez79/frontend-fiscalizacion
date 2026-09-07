import { Button, Paper, Stack, TextField, Typography } from "@mui/material";
import FilterAltOffOutlinedIcon from "@mui/icons-material/FilterAltOffOutlined";

interface DashboardDateFilterProps {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onClear: () => void;
}

/**
 * Un solo filtro de rango de fechas, compartido por duicentros-top,
 * produccion-por-categoria y produccion-por-fecha — nunca uno repetido por
 * grafica. Filtra sobre la fecha del acta fisica (actaDate), no sobre
 * cuando se digito.
 */
export function DashboardDateFilter({ from, to, onFromChange, onToChange, onClear }: DashboardDateFilterProps) {
  const hasFilter = !!from || !!to;

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" rowGap={1.5}>
        <Typography variant="body2" color="text.secondary" sx={{ mr: 0.5 }}>
          Rango de fechas del acta:
        </Typography>
        <TextField
          label="Desde"
          type="date"
          size="small"
          InputLabelProps={{ shrink: true }}
          value={from}
          onChange={(e) => onFromChange(e.target.value)}
        />
        <TextField
          label="Hasta"
          type="date"
          size="small"
          InputLabelProps={{ shrink: true }}
          value={to}
          onChange={(e) => onToChange(e.target.value)}
        />
        <Button
          size="small"
          color="inherit"
          startIcon={<FilterAltOffOutlinedIcon />}
          onClick={onClear}
          disabled={!hasFilter}
        >
          Limpiar
        </Button>
      </Stack>
    </Paper>
  );
}
