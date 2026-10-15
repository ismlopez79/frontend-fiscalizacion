import { useState } from "react";
import { Box, ButtonBase, Popover, Stack, Typography } from "@mui/material";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import { designTokens } from "@/theme/theme";
import { glassShadow, glassSx } from "@/components/ui/glass";
import { MONTH_SHORT_LABELS, currentMonth, formatMonthLabel, shiftMonth } from "../dashboardFormat";

interface MonthPickerProps {
  /** "YYYY-MM" cuando el rango activo es un mes calendario; null si no. */
  value: string | null;
  onChange: (month: string) => void;
}

const stepSx = {
  width: { xs: 36, lg: 30 },
  minHeight: { xs: 36, lg: 30 },
  borderRadius: "8px",
  color: designTokens.textSecondary,
  transition: `color 150ms ease, transform 140ms ${designTokens.easeOut}`,
  "&:active": { transform: "scale(0.94)" },
  "&.Mui-disabled": { color: designTokens.textDisabled },
  "&.Mui-focusVisible": { boxShadow: designTokens.focusRing },
  "@media (hover: hover) and (pointer: fine)": {
    "&:hover": { color: "text.primary" },
  },
} as const;

/**
 * Selector de mes para ver datos pasados: flechas para ir mes a mes y, al
 * tocar el nombre, una rejilla de 12 meses por año. Misma bandeja que el
 * SegmentedControl para que se lean como una sola familia de controles.
 * Los meses futuros no se pueden elegir.
 */
export function MonthPicker({ value, onChange }: MonthPickerProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const thisMonth = currentMonth();
  const [viewYear, setViewYear] = useState(() => Number((value ?? thisMonth).slice(0, 4)));
  const thisYear = Number(thisMonth.slice(0, 4));

  const base = value ?? thisMonth;
  const label = value ? formatMonthLabel(value) : "Elegir mes";

  return (
    <>
      <Box
        role="group"
        aria-label="Mes"
        sx={{
          display: "inline-flex",
          alignItems: "center",
          p: "3px",
          borderRadius: "11px",
          bgcolor: "rgba(15, 23, 42, 0.055)",
          flexShrink: 0,
        }}
      >
        <ButtonBase aria-label="Mes anterior" onClick={() => onChange(shiftMonth(base, -1))} sx={stepSx}>
          <ChevronLeftRoundedIcon sx={{ fontSize: 20 }} />
        </ButtonBase>
        <ButtonBase
          aria-haspopup="dialog"
          aria-expanded={Boolean(anchor)}
          onClick={(e) => {
            setViewYear(Number(base.slice(0, 4)));
            setAnchor(e.currentTarget);
          }}
          sx={{
            gap: 0.75,
            px: 1.25,
            minWidth: 148,
            minHeight: { xs: 36, lg: 30 },
            borderRadius: "8px",
            fontSize: "0.8125rem",
            fontWeight: value ? 700 : 600,
            whiteSpace: "nowrap",
            color: value ? "text.primary" : designTokens.textSecondary,
            bgcolor: value ? "#FFFFFF" : "transparent",
            boxShadow: value ? "0 1px 2px rgba(15, 23, 42, 0.08), 0 3px 8px rgba(15, 23, 42, 0.06)" : "none",
            transition: `background-color 150ms ease, box-shadow 150ms ease, color 150ms ease, transform 140ms ${designTokens.easeOut}`,
            "&:active": { transform: "scale(0.97)" },
            "&.Mui-focusVisible": { boxShadow: designTokens.focusRing },
            "@media (hover: hover) and (pointer: fine)": {
              "&:hover": { color: "text.primary" },
            },
          }}
        >
          <CalendarMonthOutlinedIcon sx={{ fontSize: 16, color: value ? designTokens.accent : "inherit" }} />
          <Box component="span" sx={{ display: "inline-block", "&::first-letter": { textTransform: "uppercase" } }}>
            {label}
          </Box>
        </ButtonBase>
        <ButtonBase
          aria-label="Mes siguiente"
          disabled={!value || value >= thisMonth}
          onClick={() => onChange(shiftMonth(base, 1))}
          sx={stepSx}
        >
          <ChevronRightRoundedIcon sx={{ fontSize: 20 }} />
        </ButtonBase>
      </Box>

      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        transformOrigin={{ vertical: "top", horizontal: "center" }}
        slotProps={{
          paper: {
            role: "dialog",
            "aria-label": "Elegir mes",
            sx: {
              mt: 1,
              p: 1.5,
              width: 264,
              borderRadius: "16px",
              ...glassSx("thick"),
              boxShadow: glassShadow.floating,
            },
          },
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <ButtonBase aria-label="Año anterior" onClick={() => setViewYear((y) => y - 1)} sx={stepSx}>
            <ChevronLeftRoundedIcon sx={{ fontSize: 20 }} />
          </ButtonBase>
          <Typography
            aria-live="polite"
            sx={{ fontSize: "0.875rem", fontWeight: 700, color: "text.primary", fontVariantNumeric: "tabular-nums" }}
          >
            {viewYear}
          </Typography>
          <ButtonBase
            aria-label="Año siguiente"
            disabled={viewYear >= thisYear}
            onClick={() => setViewYear((y) => y + 1)}
            sx={stepSx}
          >
            <ChevronRightRoundedIcon sx={{ fontSize: 20 }} />
          </ButtonBase>
        </Stack>
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0.5 }}>
          {MONTH_SHORT_LABELS.map((monthLabel, index) => {
            const month = `${viewYear}-${String(index + 1).padStart(2, "0")}`;
            const selected = month === value;
            const isCurrent = month === thisMonth;
            return (
              <ButtonBase
                key={month}
                disabled={month > thisMonth}
                aria-pressed={selected}
                aria-label={formatMonthLabel(month)}
                onClick={() => {
                  onChange(month);
                  setAnchor(null);
                }}
                sx={{
                  minHeight: 40,
                  borderRadius: "10px",
                  fontSize: "0.8125rem",
                  fontWeight: selected || isCurrent ? 700 : 600,
                  textTransform: "capitalize",
                  color: selected ? "#FFFFFF" : isCurrent ? designTokens.accent : "text.primary",
                  bgcolor: selected ? designTokens.accent : "transparent",
                  transition: `background-color 150ms ease, transform 140ms ${designTokens.easeOut}`,
                  "&:active": { transform: "scale(0.95)" },
                  "&.Mui-disabled": { color: designTokens.textDisabled },
                  "&.Mui-focusVisible": { boxShadow: designTokens.focusRing },
                  "@media (hover: hover) and (pointer: fine)": {
                    "&:hover": { bgcolor: selected ? designTokens.accentHover : "rgba(15, 23, 42, 0.06)" },
                  },
                }}
              >
                {monthLabel}
              </ButtonBase>
            );
          })}
        </Box>
      </Popover>
    </>
  );
}
