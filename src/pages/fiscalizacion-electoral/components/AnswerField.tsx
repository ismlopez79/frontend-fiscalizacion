import { memo, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { Box, ButtonBase, IconButton, MenuItem, Stack, TextField, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/AddRounded";
import CloseIcon from "@mui/icons-material/CloseRounded";
import CheckIcon from "@mui/icons-material/CheckRounded";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { designTokens } from "@/theme/theme";
import { formatPhoneInput } from "@/utils/phone";
import { formatDate } from "@/utils/dateFormat";
import { isEmptyAnswer, optionsFromPresetCode } from "@/types/fiscalizacionFases";
import type { AnswerValue, PartyCount, TemplateComponent, TemplateOption } from "@/types/fiscalizacionFases";
import type { PoliticalPartyDto } from "@/types/catalog";

const TEXT_MAX = 500;
const LONG_TEXT_MAX = 5000;
const LIST_MAX = 50;
/** Hasta aqui las opciones caben como control segmentado; si no, se usa un select. */
const SEGMENTED_MAX_OPTIONS = 4;
const SEGMENTED_MAX_CHARS = 34;

const BOOL_OPTIONS = [
  { value: "SI", label: "Sí" },
  { value: "NO", label: "No" },
];

/** Opciones propias del componente o, si usa un preset, las del catalogo (o derivadas de su codigo). */
export function resolveOptions(
  component: TemplateComponent,
  presets?: Map<string, TemplateOption[]>
): TemplateOption[] {
  if (component.options && component.options.length > 0) return component.options;
  if (!component.optionPreset) return [];
  return presets?.get(component.optionPreset) ?? optionsFromPresetCode(component.optionPreset);
}

export interface AnswerFieldProps {
  fieldKey: string;
  component: TemplateComponent;
  /** Nombre accesible del campo (etiqueta del item, del componente o encabezado de columna). */
  label: string;
  value: AnswerValue | undefined;
  onChange: (key: string, value: AnswerValue) => void;
  error?: string;
  options: TemplateOption[];
  parties: PoliticalPartyDto[];
}

/**
 * Un widget por tipo de componente. Memoizado: al escribir en un campo solo
 * se redibuja ese campo, no la plantilla completa (onChange es estable).
 */
export const AnswerField = memo(function AnswerField({
  fieldKey,
  component,
  label,
  value,
  onChange,
  error,
  options,
  parties,
}: AnswerFieldProps) {
  const set = (next: AnswerValue) => onChange(fieldKey, next);
  const helper = error ?? undefined;
  const common = {
    fullWidth: true,
    size: "small" as const,
    error: !!error,
    helperText: helper,
    inputProps: { "aria-label": label },
  };

  switch (component.type) {
    case "TEXTO":
      return (
        <TextField
          {...common}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => set(e.target.value)}
          inputProps={{ ...common.inputProps, maxLength: TEXT_MAX }}
        />
      );
    case "TEXTO_LARGO":
      return (
        <TextField
          {...common}
          multiline
          minRows={3}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => set(e.target.value)}
          inputProps={{ ...common.inputProps, maxLength: LONG_TEXT_MAX }}
          sx={{ "& .MuiInputBase-inputMultiline": { resize: "vertical" } }}
        />
      );
    case "NUMERO":
      return (
        <TextField
          {...common}
          type="number"
          value={typeof value === "number" ? value : ""}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "") return set(null);
            const n = Math.max(0, Math.floor(Number(raw)));
            set(Number.isFinite(n) ? n : null);
          }}
          inputProps={{ ...common.inputProps, min: 0, step: 1, inputMode: "numeric" }}
          sx={{ maxWidth: 180, "& input": { fontVariantNumeric: "tabular-nums" } }}
        />
      );
    case "TELEFONO":
      return (
        <TextField
          {...common}
          placeholder="7777-8888"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => set(formatPhoneInput(e.target.value))}
          inputProps={{ ...common.inputProps, inputMode: "tel", autoComplete: "off" }}
          sx={{ maxWidth: 200, "& input": { fontVariantNumeric: "tabular-nums" } }}
        />
      );
    case "FECHA":
      return (
        <TextField
          {...common}
          type="date"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => set(e.target.value || null)}
          InputLabelProps={{ shrink: true }}
          sx={{ maxWidth: 200, "& input": { fontVariantNumeric: "tabular-nums" } }}
        />
      );
    case "HORA":
      return (
        <TextField
          {...common}
          type="time"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => set(e.target.value || null)}
          InputLabelProps={{ shrink: true }}
          sx={{ maxWidth: 160, "& input": { fontVariantNumeric: "tabular-nums" } }}
        />
      );
    case "SI_NO":
      return (
        <WithError error={error}>
          <SegmentedControl<string>
            ariaLabel={label}
            options={BOOL_OPTIONS}
            value={value === true ? "SI" : value === false ? "NO" : null}
            onChange={(v) => set(v === "SI")}
          />
        </WithError>
      );
    case "OPCION_UNICA": {
      const fitsSegmented =
        options.length > 0 &&
        options.length <= SEGMENTED_MAX_OPTIONS &&
        options.reduce((n, o) => n + o.label.length, 0) <= SEGMENTED_MAX_CHARS;
      if (fitsSegmented) {
        return (
          <WithError error={error}>
            <SegmentedControl<string>
              ariaLabel={label}
              options={options.map((o) => ({ value: o.code, label: o.label }))}
              value={typeof value === "string" ? value : null}
              onChange={set}
            />
          </WithError>
        );
      }
      return (
        <TextField
          {...common}
          select
          value={typeof value === "string" ? value : ""}
          onChange={(e) => set(e.target.value || null)}
          SelectProps={{ displayEmpty: true }}
          sx={{ maxWidth: 360 }}
        >
          <MenuItem value="">
            <Box component="span" sx={{ color: designTokens.textCaption }}>
              Sin responder
            </Box>
          </MenuItem>
          {options.map((o) => (
            <MenuItem key={o.code} value={o.code}>
              {o.label}
            </MenuItem>
          ))}
        </TextField>
      );
    }
    case "OPCION_MULTIPLE": {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      return (
        <WithError error={error}>
          <Stack direction="row" flexWrap="wrap" gap={0.75} role="group" aria-label={label}>
            {options.map((o) => {
              const on = selected.includes(o.code);
              return (
                <TogglePill
                  key={o.code}
                  label={o.label}
                  on={on}
                  onToggle={() => set(on ? selected.filter((c) => c !== o.code) : [...selected, o.code])}
                />
              );
            })}
          </Stack>
        </WithError>
      );
    }
    case "LISTA_TEXTO":
      return (
        <WithError error={error}>
          <TextListInput label={label} value={Array.isArray(value) ? (value as string[]) : []} onChange={set} />
        </WithError>
      );
    case "CONTEO_POR_PARTIDO":
      return (
        <WithError error={error}>
          <PartyCountInput
            label={label}
            parties={parties}
            value={Array.isArray(value) ? (value as PartyCount[]) : []}
            onChange={set}
          />
        </WithError>
      );
    default:
      return null;
  }
});

function WithError({ error, children }: { error?: string; children: ReactNode }) {
  return (
    <Box>
      {children}
      {error && (
        <Typography variant="caption" component="div" sx={{ color: designTokens.status.error.fg, mt: 0.75 }}>
          {error}
        </Typography>
      )}
    </Box>
  );
}

function TogglePill({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <ButtonBase
      role="checkbox"
      aria-checked={on}
      onClick={onToggle}
      sx={{
        gap: 0.5,
        minHeight: { xs: 36, lg: 32 },
        px: 1.25,
        borderRadius: 999,
        fontSize: "0.8125rem",
        fontWeight: on ? 700 : 600,
        color: on ? designTokens.accentHover : designTokens.textSecondary,
        bgcolor: on ? designTokens.accentSoft : "rgba(15, 23, 42, 0.045)",
        boxShadow: on ? `inset 0 0 0 1px rgba(37, 99, 235, 0.35)` : "inset 0 0 0 1px transparent",
        transition: `background-color 150ms ease, color 150ms ease, box-shadow 150ms ease, transform 140ms ${designTokens.easeOut}`,
        "&:active": { transform: "scale(0.96)" },
        "&.Mui-focusVisible": { boxShadow: designTokens.focusRing },
        "@media (hover: hover) and (pointer: fine)": {
          "&:hover": { color: on ? designTokens.accentHover : "text.primary" },
        },
      }}
    >
      {on && <CheckIcon sx={{ fontSize: 15 }} />}
      {label}
    </ButtonBase>
  );
}

/** Lista de nombres: escribir y Enter (o "Agregar") suma uno; cada uno se quita con su X. */
function TextListInput({ label, value, onChange }: { label: string; value: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const full = value.length >= LIST_MAX;
  const add = () => {
    const text = draft.trim();
    if (!text || full) return;
    onChange([...value, text]);
    setDraft("");
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      add();
    }
  };

  return (
    <Stack spacing={1}>
      {value.length > 0 && (
        <Box component="ol" sx={{ m: 0, p: 0, listStyle: "none", display: "grid", gap: 0.5 }}>
          {value.map((item, i) => (
            <Stack
              key={`${i}-${item}`}
              component="li"
              direction="row"
              alignItems="center"
              gap={1}
              sx={{ pl: 1.25, pr: 0.5, minHeight: 36, borderRadius: "10px", bgcolor: "rgba(15, 23, 42, 0.035)" }}
            >
              <Typography variant="caption" sx={{ minWidth: 18, fontVariantNumeric: "tabular-nums" }}>
                {i + 1}
              </Typography>
              <Typography variant="body2" sx={{ flex: 1, minWidth: 0, color: "text.primary", overflowWrap: "anywhere" }}>
                {item}
              </Typography>
              <IconButton size="small" aria-label={`Quitar ${item}`} onClick={() => onChange(value.filter((_, j) => j !== i))}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Stack>
          ))}
        </Box>
      )}
      <Stack direction="row" gap={1}>
        <TextField
          size="small"
          fullWidth
          placeholder={full ? `Máximo ${LIST_MAX} nombres` : "Escribe un nombre y presiona Enter"}
          value={draft}
          disabled={full}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          inputProps={{ "aria-label": `Agregar a ${label}`, maxLength: TEXT_MAX }}
        />
        <IconButton aria-label="Agregar" onClick={add} disabled={!draft.trim() || full} sx={{ color: designTokens.accent }}>
          <AddIcon />
        </IconButton>
      </Stack>
    </Stack>
  );
}

/** Una fila por partido; solo viajan los partidos con un numero escrito. */
function PartyCountInput({
  label,
  parties,
  value,
  onChange,
}: {
  label: string;
  parties: PoliticalPartyDto[];
  value: PartyCount[];
  onChange: (v: PartyCount[]) => void;
}) {
  const byParty = new Map(value.map((v) => [v.partyId, v.count]));
  const total = value.reduce((n, v) => n + (v.count ?? 0), 0);

  const setCount = (partyId: number, raw: string) => {
    const rest = value.filter((v) => v.partyId !== partyId);
    if (raw === "") return onChange(rest);
    const n = Math.max(0, Math.floor(Number(raw)));
    if (!Number.isFinite(n)) return;
    // Conserva el orden del catalogo de partidos para que el JSON sea estable.
    const next = [...rest, { partyId, count: n }];
    const order = new Map(parties.map((p, i) => [p.id, i]));
    next.sort((a, b) => (order.get(a.partyId) ?? 0) - (order.get(b.partyId) ?? 0));
    onChange(next);
  };

  if (parties.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: designTokens.textCaption }}>
        No hay partidos políticos activos en el catálogo.
      </Typography>
    );
  }

  return (
    <Box role="group" aria-label={label} sx={{ borderRadius: "12px", bgcolor: "rgba(15, 23, 42, 0.03)", p: 0.5 }}>
      {parties.map((p) => (
        <Stack key={p.id} direction="row" alignItems="center" gap={1.5} sx={{ px: 1.25, py: 0.5 }}>
          <Typography variant="body2" sx={{ flex: 1, minWidth: 0, color: "text.primary", fontWeight: 500 }} noWrap>
            {p.name}
          </Typography>
          <TextField
            size="small"
            type="number"
            value={byParty.get(p.id) ?? ""}
            onChange={(e) => setCount(p.id, e.target.value)}
            inputProps={{ min: 0, step: 1, inputMode: "numeric", "aria-label": `${label}: ${p.name}` }}
            sx={{ width: 104, "& input": { fontVariantNumeric: "tabular-nums", textAlign: "right" } }}
          />
        </Stack>
      ))}
      <Stack direction="row" justifyContent="space-between" sx={{ px: 1.25, pt: 1, pb: 0.75, mt: 0.5, borderTop: "1px solid rgba(15, 23, 42, 0.06)" }}>
        <Typography variant="caption">Total</Typography>
        <Typography variant="body2" sx={{ fontWeight: 700, color: "text.primary", fontVariantNumeric: "tabular-nums", pr: 1.5 }}>
          {total}
        </Typography>
      </Stack>
    </Box>
  );
}

// ---------------------------------------------------------------- Solo lectura

/** Valor ya respondido, para el informe enviado: texto legible en vez de campos deshabilitados. */
export function AnswerDisplay({
  component,
  value,
  options,
  parties,
}: {
  component: TemplateComponent;
  value: AnswerValue | undefined;
  options: TemplateOption[];
  parties: PoliticalPartyDto[];
}) {
  if (isEmptyAnswer(value)) {
    return (
      <Typography variant="body2" sx={{ color: designTokens.textDisabled }}>
        Sin responder
      </Typography>
    );
  }
  const strong = { color: "text.primary", fontWeight: 600, overflowWrap: "anywhere" } as const;
  const labelOf = (code: string) => options.find((o) => o.code === code)?.label ?? code;

  switch (component.type) {
    case "SI_NO": {
      const tone = value ? designTokens.status.success : designTokens.status.error;
      return <ValuePill bg={tone.bg} fg={tone.fg} label={value ? "Sí" : "No"} />;
    }
    case "OPCION_UNICA":
      return <ValuePill bg={designTokens.accentSoft} fg={designTokens.accentHover} label={labelOf(String(value))} />;
    case "OPCION_MULTIPLE":
      return (
        <Stack direction="row" flexWrap="wrap" gap={0.5}>
          {(value as string[]).map((code) => (
            <ValuePill key={code} bg={designTokens.accentSoft} fg={designTokens.accentHover} label={labelOf(code)} />
          ))}
        </Stack>
      );
    case "LISTA_TEXTO":
      return (
        <Box component="ol" sx={{ m: 0, pl: 2.5, "& li": { py: 0.125 } }}>
          {(value as string[]).map((name, i) => (
            <Typography key={`${i}-${name}`} component="li" variant="body2" sx={strong}>
              {name}
            </Typography>
          ))}
        </Box>
      );
    case "CONTEO_POR_PARTIDO": {
      const counts = value as PartyCount[];
      const nameOf = (id: number) => parties.find((p) => p.id === id)?.name ?? `Partido ${id}`;
      return (
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr auto", columnGap: 3, rowGap: 0.25, maxWidth: 420 }}>
          {counts.map((c) => (
            <Box key={c.partyId} sx={{ display: "contents" }}>
              <Typography variant="body2">{nameOf(c.partyId)}</Typography>
              <Typography variant="body2" sx={{ ...strong, fontVariantNumeric: "tabular-nums", textAlign: "right" }}>
                {c.count}
              </Typography>
            </Box>
          ))}
        </Box>
      );
    }
    case "FECHA":
      return (
        <Typography variant="body2" sx={{ ...strong, fontVariantNumeric: "tabular-nums" }}>
          {formatDate(String(value))}
        </Typography>
      );
    case "NUMERO":
    case "HORA":
    case "TELEFONO":
      return (
        <Typography variant="body2" sx={{ ...strong, fontVariantNumeric: "tabular-nums" }}>
          {String(value)}
        </Typography>
      );
    default:
      return (
        <Typography variant="body2" sx={{ ...strong, whiteSpace: "pre-line", maxWidth: "70ch" }}>
          {String(value)}
        </Typography>
      );
  }
}

function ValuePill({ bg, fg, label }: { bg: string; fg: string; label: string }) {
  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        height: 26,
        px: 1.25,
        borderRadius: 999,
        bgcolor: bg,
        color: fg,
        fontWeight: 700,
        fontSize: "0.8125rem",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </Box>
  );
}
