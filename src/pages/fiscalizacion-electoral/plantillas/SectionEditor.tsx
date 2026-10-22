import { memo, useState } from "react";
import {
  Box,
  Button,
  ButtonBase,
  Collapse,
  FormControlLabel,
  IconButton,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpwardRounded";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownwardRounded";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMoreRounded";
import ContentCopyIcon from "@mui/icons-material/ContentCopyOutlined";
import AddIcon from "@mui/icons-material/AddRounded";
import CloseIcon from "@mui/icons-material/CloseRounded";
import { surfaceSx } from "@/components/ui/Surface";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { AddRowButton } from "@/components/ui/AddRowButton";
import { designTokens } from "@/theme/theme";
import { COMPONENT_TYPE_LABELS, isOptionType } from "@/types/fiscalizacionFases";
import type { TemplateBuilderCatalog, TemplateComponentType, TemplateLayout } from "@/types/fiscalizacionFases";
import type { EditorComponent, EditorErrors, EditorItem, EditorSection } from "./templateEditorModel";
import { makeOption, moveInArray, newComponent, newItem, newKey, sanitizeCode, toCode } from "./templateEditorModel";

type Updater<T> = (prev: T) => T;

interface SectionEditorProps {
  section: EditorSection;
  index: number;
  total: number;
  errors: EditorErrors;
  catalog: TemplateBuilderCatalog;
  onUpdate: (index: number, updater: Updater<EditorSection>) => void;
  onMove: (index: number, delta: -1 | 1) => void;
  onRemove: (index: number) => void;
}

const iconBtnSx = { color: designTokens.textSecondary } as const;

function hasErrorUnder(errors: EditorErrors, prefix: string): boolean {
  return Object.keys(errors).some((k) => k === prefix || k.startsWith(`${prefix}.`));
}

/**
 * Una seccion del constructor: titulo, layout (ficha/tabla), encabezados de
 * columna si es tabla, y sus filas como acordeon (una abierta a la vez, para
 * que la pagina no se vuelva interminable con plantillas largas).
 */
export const SectionEditor = memo(function SectionEditor({
  section,
  index,
  total,
  errors,
  catalog,
  onUpdate,
  onMove,
  onRemove,
}: SectionEditorProps) {
  const sp = `s${index}`;
  const [openItem, setOpenItem] = useState<string | null>(section.items.length === 1 ? section.items[0]._key : null);
  const update = (fn: Updater<EditorSection>) => onUpdate(index, fn);

  const maxComponents = Math.max(1, ...section.items.map((it) => it.components.length));
  const headers = section.columnHeaders;

  const setLayout = (layout: TemplateLayout) =>
    update((s) => ({ ...s, layout, columnHeaders: layout === "TABLA" ? s.columnHeaders : null }));

  const toggleHeaders = (on: boolean) =>
    update((s) => ({ ...s, columnHeaders: on ? ["", ...Array.from({ length: maxComponents }, () => "")] : null }));

  const setHeader = (i: number, value: string) =>
    update((s) => {
      const next = [...(s.columnHeaders ?? [])];
      while (next.length <= i) next.push("");
      next[i] = value;
      return { ...s, columnHeaders: next };
    });

  const updateItem = (ii: number, fn: Updater<EditorItem>) =>
    update((s) => ({ ...s, items: s.items.map((it, j) => (j === ii ? fn(it) : it)) }));

  const addItem = () => {
    const item = newItem();
    update((s) => ({ ...s, items: [...s.items, item] }));
    setOpenItem(item._key);
  };

  const duplicateItem = (ii: number) => {
    const src = section.items[ii];
    const copy: EditorItem = {
      ...src,
      _key: newKey(),
      code: src.code ? `${src.code}_COPIA`.slice(0, 40) : "",
      label: src.label ? `${src.label} (copia)` : "",
      components: src.components.map((c) => ({ ...c, _key: newKey(), options: c.options ? c.options.map((o) => ({ ...o })) : null })),
    };
    update((s) => ({ ...s, items: [...s.items.slice(0, ii + 1), copy, ...s.items.slice(ii + 1)] }));
    setOpenItem(copy._key);
  };

  return (
    <Box component="section" aria-label={section.title || `Sección ${index + 1}`} sx={{ ...surfaceSx, p: { xs: 2, md: 2.5 } }}>
      <Stack direction="row" alignItems="flex-start" gap={1}>
        <TextField
          value={section.title}
          onChange={(e) => update((s) => ({ ...s, title: e.target.value }))}
          placeholder={`Título de la sección ${index + 1}`}
          variant="standard"
          fullWidth
          error={!!errors[`${sp}.title`]}
          helperText={errors[`${sp}.title`]}
          inputProps={{ "aria-label": "Título de la sección", maxLength: 200 }}
          InputProps={{ disableUnderline: !errors[`${sp}.title`], sx: { fontSize: "1.0625rem", fontWeight: 700, letterSpacing: "-0.01em" } }}
        />
        <Stack direction="row" sx={{ flexShrink: 0 }}>
          <Tooltip title="Subir sección">
            <span>
              <IconButton size="small" aria-label="Subir sección" disabled={index === 0} onClick={() => onMove(index, -1)} sx={iconBtnSx}>
                <ArrowUpwardIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Bajar sección">
            <span>
              <IconButton size="small" aria-label="Bajar sección" disabled={index === total - 1} onClick={() => onMove(index, 1)} sx={iconBtnSx}>
                <ArrowDownwardIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Quitar sección">
            <IconButton size="small" aria-label="Quitar sección" onClick={() => onRemove(index)} sx={{ color: designTokens.status.error.fg }}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      <Stack direction="row" alignItems="center" flexWrap="wrap" gap={1.5} sx={{ mt: 1.5, mb: 2 }}>
        <SegmentedControl<TemplateLayout>
          ariaLabel="Diseño de la sección"
          options={catalog.layouts.map((l) => ({ value: l.code, label: l.label }))}
          value={section.layout}
          onChange={setLayout}
        />
        <Typography variant="caption" sx={{ flex: 1, minWidth: 200 }}>
          {section.layout === "FICHA" ? "Pares de etiqueta y campo." : "Una fila por cada item, con sus respuestas a la derecha."}
        </Typography>
        {section.layout === "TABLA" && (
          <FormControlLabel
            control={<Switch size="small" checked={!!headers} onChange={(e) => toggleHeaders(e.target.checked)} />}
            label={<Typography variant="body2">Encabezados de columna</Typography>}
            sx={{ mr: 0 }}
          />
        )}
      </Stack>

      {section.layout === "TABLA" && headers && (
        <Box sx={{ mb: 2, p: 1.5, borderRadius: "14px", bgcolor: "rgba(15, 23, 42, 0.03)" }}>
          <Typography variant="caption" component="div" sx={{ mb: 1 }}>
            La primera columna lleva la etiqueta de cada fila; luego una columna por respuesta.
          </Typography>
          <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}>
            {Array.from({ length: maxComponents + 1 }, (_, i) => (
              <TextField
                key={i}
                size="small"
                value={headers[i] ?? ""}
                onChange={(e) => setHeader(i, e.target.value)}
                placeholder={i === 0 ? "Ej. Cargo" : `Columna ${i}`}
                inputProps={{ "aria-label": i === 0 ? "Encabezado de las filas" : `Encabezado de la columna ${i}`, maxLength: 80 }}
                sx={{ "& .MuiOutlinedInput-root": { bgcolor: "#FFFFFF" } }}
              />
            ))}
          </Box>
        </Box>
      )}

      {errors[`${sp}.items`] && (
        <Typography variant="caption" component="div" sx={{ color: designTokens.status.error.fg, mb: 1 }}>
          {errors[`${sp}.items`]}
        </Typography>
      )}

      <Stack spacing={1}>
        {section.items.map((item, ii) => (
          <ItemEditor
            key={item._key}
            item={item}
            path={`${sp}.i${ii}`}
            index={ii}
            total={section.items.length}
            open={openItem === item._key}
            onToggle={() => setOpenItem((k) => (k === item._key ? null : item._key))}
            errors={errors}
            catalog={catalog}
            headerFor={(ci) => (section.layout === "TABLA" ? headers?.[ci + 1] : undefined)}
            onUpdate={(fn) => updateItem(ii, fn)}
            onMove={(delta) => update((s) => ({ ...s, items: moveInArray(s.items, ii, ii + delta) }))}
            onDuplicate={() => duplicateItem(ii)}
            onRemove={() => update((s) => ({ ...s, items: s.items.filter((_, j) => j !== ii) }))}
          />
        ))}
        <AddRowButton onClick={addItem}>Agregar fila</AddRowButton>
      </Stack>
    </Box>
  );
});

function componentSummary(item: EditorItem): string {
  return item.components
    .map((c) => `${COMPONENT_TYPE_LABELS[c.type]}${c.required ? " · obligatorio" : ""}`)
    .join("  +  ");
}

function ItemEditor({
  item,
  path,
  index,
  total,
  open,
  onToggle,
  errors,
  catalog,
  headerFor,
  onUpdate,
  onMove,
  onDuplicate,
  onRemove,
}: {
  item: EditorItem;
  path: string;
  index: number;
  total: number;
  open: boolean;
  onToggle: () => void;
  errors: EditorErrors;
  catalog: TemplateBuilderCatalog;
  headerFor: (componentIndex: number) => string | undefined;
  onUpdate: (fn: Updater<EditorItem>) => void;
  onMove: (delta: -1 | 1) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const invalid = hasErrorUnder(errors, path);
  const multi = item.components.length > 1;

  const setLabel = (label: string) =>
    onUpdate((it) => ({
      ...it,
      label,
      // El codigo sigue a la etiqueta mientras nadie lo haya escrito a mano.
      code: !it.code || it.code === toCode(it.label) ? toCode(label) : it.code,
    }));

  const updateComponent = (ci: number, fn: Updater<EditorComponent>) =>
    onUpdate((it) => ({ ...it, components: it.components.map((c, j) => (j === ci ? fn(c) : c)) }));

  const addComponent = () =>
    onUpdate((it) => {
      const used = new Set(it.components.map((c) => c.code));
      let n = it.components.length + 1;
      while (used.has(`VALOR_${n}`)) n++;
      return { ...it, components: [...it.components, newComponent("TEXTO", `VALOR_${n}`)] };
    });

  return (
    <Box
      sx={{
        borderRadius: "14px",
        bgcolor: open ? "rgba(15, 23, 42, 0.025)" : "transparent",
        boxShadow: invalid ? `inset 0 0 0 1px ${designTokens.status.error.fg}55` : "inset 0 0 0 1px rgba(15, 23, 42, 0.08)",
        transition: "background-color 150ms ease, box-shadow 150ms ease",
      }}
    >
      <Stack direction="row" alignItems="center" sx={{ pr: 0.75 }}>
        <ButtonBase
          onClick={onToggle}
          aria-expanded={open}
          sx={{ flex: 1, minWidth: 0, justifyContent: "flex-start", textAlign: "left", gap: 1.25, px: 1.5, py: 1.25, borderRadius: "14px" }}
        >
          <Typography variant="caption" sx={{ minWidth: 18, fontVariantNumeric: "tabular-nums", color: designTokens.textDisabled }}>
            {index + 1}
          </Typography>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              variant="body2"
              noWrap
              sx={{ fontWeight: 600, color: item.label ? "text.primary" : designTokens.textDisabled }}
            >
              {item.label || "Fila sin etiqueta"}
            </Typography>
            <Typography variant="caption" noWrap component="div" sx={{ fontWeight: 500 }}>
              {item.code && (
                <Box component="span" sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
                  {item.code} ·{" "}
                </Box>
              )}
              {componentSummary(item)}
            </Typography>
          </Box>
          {invalid && !open && (
            <Box component="span" sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: designTokens.status.error.fg, flexShrink: 0 }} aria-label="Con errores" />
          )}
          <ExpandMoreIcon
            sx={{
              color: designTokens.textCaption,
              transform: open ? "rotate(180deg)" : "none",
              transition: `transform 200ms ${designTokens.easeOut}`,
            }}
          />
        </ButtonBase>
      </Stack>

      <Collapse in={open} unmountOnExit timeout={200}>
        <Stack spacing={2} sx={{ px: 1.5, pb: 1.5, pt: 0.5 }}>
          <Stack direction={{ xs: "column", sm: "row" }} gap={1.5}>
            <TextField
              size="small"
              label="Etiqueta"
              value={item.label}
              onChange={(e) => setLabel(e.target.value)}
              fullWidth
              autoFocus={!item.label}
              error={!!errors[`${path}.label`]}
              helperText={errors[`${path}.label`]}
              inputProps={{ maxLength: 300 }}
              sx={{ flex: 2, "& .MuiOutlinedInput-root": { bgcolor: "#FFFFFF" } }}
            />
            <TextField
              size="small"
              label="Código"
              value={item.code}
              onChange={(e) => onUpdate((it) => ({ ...it, code: sanitizeCode(e.target.value) }))}
              error={!!errors[`${path}.code`]}
              helperText={errors[`${path}.code`]}
              inputProps={{ maxLength: 40 }}
              sx={{ flex: 1, minWidth: 160, "& .MuiOutlinedInput-root": { bgcolor: "#FFFFFF" }, "& input": { fontVariantNumeric: "tabular-nums" } }}
            />
          </Stack>

          <Stack spacing={1.25}>
            {item.components.map((c, ci) => (
              <ComponentEditor
                key={c._key}
                component={c}
                path={`${path}.c${ci}`}
                multi={multi}
                headerHint={headerFor(ci)}
                errors={errors}
                catalog={catalog}
                onUpdate={(fn) => updateComponent(ci, fn)}
                onRemove={multi ? () => onUpdate((it) => ({ ...it, components: it.components.filter((_, j) => j !== ci) })) : undefined}
              />
            ))}
          </Stack>

          <Stack direction="row" alignItems="center" flexWrap="wrap" gap={1}>
            <Button size="small" startIcon={<AddIcon />} onClick={addComponent}>
              Otra respuesta en esta fila
            </Button>
            <Box sx={{ flex: 1 }} />
            <Tooltip title="Subir fila">
              <span>
                <IconButton size="small" aria-label="Subir fila" disabled={index === 0} onClick={() => onMove(-1)} sx={iconBtnSx}>
                  <ArrowUpwardIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Bajar fila">
              <span>
                <IconButton size="small" aria-label="Bajar fila" disabled={index === total - 1} onClick={() => onMove(1)} sx={iconBtnSx}>
                  <ArrowDownwardIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Duplicar fila">
              <IconButton size="small" aria-label="Duplicar fila" onClick={onDuplicate} sx={iconBtnSx}>
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Quitar fila">
              <IconButton size="small" aria-label="Quitar fila" onClick={onRemove} sx={{ color: designTokens.status.error.fg }}>
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </Collapse>
    </Box>
  );
}

function ComponentEditor({
  component: c,
  path,
  multi,
  headerHint,
  errors,
  catalog,
  onUpdate,
  onRemove,
}: {
  component: EditorComponent;
  path: string;
  multi: boolean;
  headerHint?: string;
  errors: EditorErrors;
  catalog: TemplateBuilderCatalog;
  onUpdate: (fn: Updater<EditorComponent>) => void;
  onRemove?: () => void;
}) {
  const withOptions = isOptionType(c.type);
  const hasPresets = catalog.optionPresets.length > 0;

  const setType = (type: TemplateComponentType) =>
    onUpdate((x) => {
      if (!isOptionType(type)) return { ...x, type, optionPreset: null, options: null };
      if (isOptionType(x.type)) return { ...x, type };
      return hasPresets
        ? { ...x, type, _optionMode: "preset", optionPreset: catalog.optionPresets[0].code, options: null }
        : { ...x, type, _optionMode: "custom", optionPreset: null, options: [] };
    });

  return (
    <Box sx={{ p: 1.5, borderRadius: "12px", bgcolor: "#FFFFFF", boxShadow: "inset 0 0 0 1px rgba(15, 23, 42, 0.07)" }}>
      <Stack direction="row" alignItems="flex-start" gap={1}>
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            display: "grid",
            gap: 1.25,
            gridTemplateColumns: { xs: "1fr", sm: multi ? "1.4fr 1fr 1.1fr" : "1fr 1.1fr" },
          }}
        >
          {multi && (
            <TextField
              size="small"
              label="Etiqueta de la respuesta"
              placeholder={headerHint || "Ej. Teléfono"}
              value={c.label ?? ""}
              onChange={(e) => onUpdate((x) => ({ ...x, label: e.target.value || null }))}
              error={!!errors[`${path}.label`]}
              helperText={errors[`${path}.label`] ?? (headerHint ? `Columna: ${headerHint}` : undefined)}
              inputProps={{ maxLength: 200 }}
            />
          )}
          <TextField
            size="small"
            label="Código"
            value={c.code}
            onChange={(e) => onUpdate((x) => ({ ...x, code: sanitizeCode(e.target.value) }))}
            error={!!errors[`${path}.code`]}
            helperText={errors[`${path}.code`]}
            inputProps={{ maxLength: 40 }}
            sx={{ "& input": { fontVariantNumeric: "tabular-nums" } }}
          />
          <TextField select size="small" label="Tipo de respuesta" value={c.type} onChange={(e) => setType(e.target.value as TemplateComponentType)}>
            {catalog.componentTypes.map((t) => (
              <MenuItem key={t.code} value={t.code}>
                {t.label}
              </MenuItem>
            ))}
          </TextField>
        </Box>
        {onRemove && (
          <Tooltip title="Quitar respuesta">
            <IconButton size="small" aria-label="Quitar respuesta" onClick={onRemove} sx={{ color: designTokens.status.error.fg, mt: 0.25 }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Stack>

      <FormControlLabel
        control={<Switch size="small" checked={c.required} onChange={(e) => onUpdate((x) => ({ ...x, required: e.target.checked }))} />}
        label={<Typography variant="body2">Obligatoria al enviar</Typography>}
        sx={{ mt: 0.75, ml: 0 }}
      />

      {withOptions && (
        <Box sx={{ mt: 1.25, pt: 1.25, borderTop: "1px solid rgba(15, 23, 42, 0.06)" }}>
          {hasPresets && (
            <SegmentedControl<"preset" | "custom">
              ariaLabel="Origen de las opciones"
              options={[
                { value: "preset", label: "Conjunto predefinido" },
                { value: "custom", label: "Opciones propias" },
              ]}
              value={c._optionMode}
              onChange={(mode) =>
                onUpdate((x) =>
                  mode === "preset"
                    ? { ...x, _optionMode: "preset", optionPreset: x.optionPreset ?? catalog.optionPresets[0]?.code ?? null }
                    : { ...x, _optionMode: "custom", options: x.options ?? [] }
                )
              }
            />
          )}
          <Box sx={{ mt: hasPresets ? 1.25 : 0 }}>
            {c._optionMode === "preset" && hasPresets ? (
              <TextField
                select
                size="small"
                fullWidth
                label="Conjunto de opciones"
                value={c.optionPreset ?? ""}
                onChange={(e) => onUpdate((x) => ({ ...x, optionPreset: e.target.value || null }))}
                error={!!errors[`${path}.options`]}
                helperText={errors[`${path}.options`]}
              >
                {catalog.optionPresets.map((p) => (
                  <MenuItem key={p.code} value={p.code}>
                    {p.label}
                  </MenuItem>
                ))}
              </TextField>
            ) : (
              <CustomOptions
                options={c.options ?? []}
                error={errors[`${path}.options`]}
                onChange={(options) => onUpdate((x) => ({ ...x, options }))}
              />
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
}

function CustomOptions({
  options,
  error,
  onChange,
}: {
  options: { code: string; label: string }[];
  error?: string;
  onChange: (options: { code: string; label: string }[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const text = draft.trim();
    if (!text) return;
    onChange([...options, makeOption(text)]);
    setDraft("");
  };
  return (
    <Stack spacing={0.75}>
      {options.map((o, i) => (
        <Stack key={i} direction="row" gap={1} alignItems="center">
          <TextField
            size="small"
            value={o.label}
            onChange={(e) =>
              onChange(
                options.map((x, j) =>
                  j === i ? { label: e.target.value, code: !x.code || x.code === toCode(x.label, 30) ? toCode(e.target.value, 30) : x.code } : x
                )
              )
            }
            inputProps={{ "aria-label": `Opción ${i + 1}`, maxLength: 150 }}
            sx={{ flex: 2 }}
          />
          <TextField
            size="small"
            value={o.code}
            onChange={(e) => onChange(options.map((x, j) => (j === i ? { ...x, code: sanitizeCode(e.target.value) } : x)))}
            inputProps={{ "aria-label": `Código de la opción ${i + 1}`, maxLength: 30 }}
            sx={{ flex: 1, minWidth: 110, "& input": { fontVariantNumeric: "tabular-nums", fontSize: "0.8125rem" } }}
          />
          <IconButton size="small" aria-label={`Quitar opción ${i + 1}`} onClick={() => onChange(options.filter((_, j) => j !== i))}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
      ))}
      <Stack direction="row" gap={1}>
        <TextField
          size="small"
          fullWidth
          placeholder="Nueva opción y Enter"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          inputProps={{ "aria-label": "Nueva opción", maxLength: 150 }}
        />
        <Button size="small" onClick={add} disabled={!draft.trim()} sx={{ flexShrink: 0 }}>
          Agregar
        </Button>
      </Stack>
      {error && (
        <Typography variant="caption" sx={{ color: designTokens.status.error.fg }}>
          {error}
        </Typography>
      )}
    </Stack>
  );
}
