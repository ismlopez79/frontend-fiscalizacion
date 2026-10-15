import { useRef } from "react";
import type { KeyboardEvent } from "react";
import { Box, ButtonBase } from "@mui/material";
import { designTokens } from "@/theme/theme";

export interface SegmentedOption<T extends string | number> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string | number> {
  options: SegmentedOption<T>[];
  /** null = ningun segmento activo (p. ej. un rango de fechas personalizado). */
  value: T | null;
  onChange: (value: T) => void;
  ariaLabel: string;
}

/**
 * Control segmentado estilo iOS. Los segmentos tienen el mismo ancho, asi
 * que el "pulgar" blanco se mueve solo con transform (translateX por
 * porcentaje de su propio ancho): corre en el compositor y, al ser una
 * transicion CSS, se re-dirige sin saltos si el usuario cambia de opcion a
 * media animacion. Flechas izquierda/derecha navegan como un radiogroup.
 */
export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  ariaLabel,
}: SegmentedControlProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const activeIndex = options.findIndex((o) => o.value === value);

  const handleKeyDown = (event: KeyboardEvent, index: number) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const delta = event.key === "ArrowRight" ? 1 : -1;
    const next = (index + delta + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  };

  return (
    <Box
      role="radiogroup"
      aria-label={ariaLabel}
      sx={{
        position: "relative",
        display: "inline-grid",
        gridAutoFlow: "column",
        gridAutoColumns: "1fr",
        p: "3px",
        borderRadius: "11px",
        bgcolor: "rgba(15, 23, 42, 0.055)",
        flexShrink: 0,
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          top: 3,
          bottom: 3,
          left: 3,
          width: `calc((100% - 6px) / ${options.length})`,
          borderRadius: "8px",
          bgcolor: "#FFFFFF",
          boxShadow: "0 1px 2px rgba(15, 23, 42, 0.08), 0 3px 8px rgba(15, 23, 42, 0.06)",
          opacity: activeIndex === -1 ? 0 : 1,
          transform: `translateX(${Math.max(activeIndex, 0) * 100}%)`,
          transition: `transform 240ms ${designTokens.easeOut}, opacity 150ms ease`,
          "@media (prefers-reduced-motion: reduce)": { transition: "opacity 150ms ease" },
        }}
      />
      {options.map((option, index) => {
        const selected = index === activeIndex;
        return (
          <ButtonBase
            key={String(option.value)}
            ref={(el) => (refs.current[index] = el)}
            role="radio"
            aria-checked={selected}
            tabIndex={selected || (activeIndex === -1 && index === 0) ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            sx={{
              position: "relative",
              zIndex: 1,
              px: 1.5,
              minHeight: { xs: 36, lg: 30 },
              borderRadius: "8px",
              fontSize: "0.8125rem",
              fontWeight: selected ? 700 : 600,
              whiteSpace: "nowrap",
              color: selected ? "text.primary" : designTokens.textSecondary,
              transition: `color 150ms ease, transform 140ms ${designTokens.easeOut}`,
              "&:active": { transform: "scale(0.96)" },
              "@media (hover: hover) and (pointer: fine)": {
                "&:hover": { color: "text.primary" },
              },
            }}
          >
            {option.label}
          </ButtonBase>
        );
      })}
    </Box>
  );
}
