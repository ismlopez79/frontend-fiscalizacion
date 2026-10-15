import { forwardRef } from "react";
import type { Ref } from "react";
import { Box, Stack, TextField, Typography } from "@mui/material";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import { designTokens } from "@/theme/theme";
import { OBSERVATIONS_MIN_WORDS, countWords } from "@/utils/words";

interface WordCountTextFieldProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  /** Ref del <textarea>, para que el formulario pueda enfocarlo al validar. */
  inputRef?: Ref<HTMLTextAreaElement>;
  error?: string;
  placeholder?: string;
  minWords?: number;
}

/**
 * Area de texto con minimo de palabras y contador en vivo ("20 / 30
 * palabras", verde con check al cumplir). Se usa dentro de un Controller:
 * solo este campo se redibuja al escribir, no el formulario completo.
 * El ref externo apunta al contenedor, para poder desplazar la pagina
 * hasta el campo cuando falta completarlo.
 */
export const WordCountTextField = forwardRef<HTMLDivElement, WordCountTextFieldProps>(function WordCountTextField(
  { id, value, onChange, onBlur, inputRef, error, placeholder, minWords = OBSERVATIONS_MIN_WORDS },
  ref
) {
  const words = countWords(value);
  const done = words >= minWords;

  return (
    <Box ref={ref} sx={{ scrollMarginTop: 96 }}>
      <TextField
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        inputRef={inputRef}
        aria-label="Observaciones"
        aria-describedby={`${id}-contador`}
        placeholder={placeholder}
        fullWidth
        multiline
        minRows={4}
        error={!!error}
        sx={{ "& .MuiInputBase-inputMultiline": { resize: "vertical" } }}
      />
      <Stack
        id={`${id}-contador`}
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        gap={1}
        sx={{ mt: 0.75, px: 0.25 }}
        aria-live="polite"
      >
        <Typography
          variant="caption"
          sx={{ color: error ? designTokens.status.error.fg : designTokens.textCaption, fontWeight: error ? 600 : 500 }}
        >
          {error ?? `Mínimo ${minWords} palabras.`}
        </Typography>
        <Stack direction="row" alignItems="center" gap={0.5} sx={{ flexShrink: 0 }}>
          {done && <CheckCircleRoundedIcon sx={{ fontSize: 14, color: designTokens.status.success.fg }} />}
          <Typography
            variant="caption"
            sx={{
              fontVariantNumeric: "tabular-nums",
              fontWeight: 700,
              color: done ? designTokens.status.success.fg : error ? designTokens.status.error.fg : designTokens.textSecondary,
              transition: "color 150ms ease",
            }}
          >
            {words} / {minWords} palabras
          </Typography>
        </Stack>
      </Stack>
    </Box>
  );
});
