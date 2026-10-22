import { useMemo } from "react";
import type { ReactNode } from "react";
import { Box, Stack, Typography } from "@mui/material";
import { SectionHeader, Surface } from "@/components/ui/Surface";
import { designTokens } from "@/theme/theme";
import { answerKey, isEmptyAnswer } from "@/types/fiscalizacionFases";
import type {
  AnswerValue,
  Answers,
  FormTemplateDto,
  TemplateComponent,
  TemplateItem,
  TemplateOption,
  TemplateSection,
} from "@/types/fiscalizacionFases";
import type { PoliticalPartyDto } from "@/types/catalog";
import { AnswerDisplay, AnswerField, resolveOptions } from "./AnswerField";

/** id del contenedor de un campo, para llevar a la persona a el desde un error. */
export function fieldDomId(key: string): string {
  return `campo-${key.replace(/[^A-Za-z0-9_-]/g, "-")}`;
}

interface TemplateRendererProps {
  template: Pick<FormTemplateDto, "sections">;
  answers: Answers;
  /** Sin onChange (o readOnly) se pinta como lectura: valores, no campos. */
  onChange?: (key: string, value: AnswerValue) => void;
  readOnly?: boolean;
  /** Errores por llave ITEM.COMPONENTE (validacion del backend al enviar). */
  errors?: Record<string, string>;
  parties: PoliticalPartyDto[];
  /** Presets del catalogo del constructor, si ya se tienen (solo admin). */
  presets?: Map<string, TemplateOption[]>;
}

interface Ctx {
  answers: Answers;
  onChange?: (key: string, value: AnswerValue) => void;
  readOnly: boolean;
  errors: Record<string, string>;
  parties: PoliticalPartyDto[];
  optionsByKey: Map<string, TemplateOption[]>;
}

/**
 * Un solo componente pinta cualquier plantilla: secciones -> items (filas)
 * -> componentes (respuestas). No hay pantallas por formato.
 *  - FICHA: pares etiqueta/campo en una rejilla que se abre a dos columnas
 *    cuando el ancho real del contenedor lo permite (container query).
 *  - TABLA sin encabezados: lista de filas, pregunta a la izquierda y
 *    respuesta a la derecha (como un checklist).
 *  - TABLA con columnHeaders: tabla real; en angosto cada fila se vuelve una
 *    tarjeta y cada celda muestra su encabezado arriba (un solo DOM).
 */
export function TemplateRenderer({
  template,
  answers,
  onChange,
  readOnly = !onChange,
  errors = {},
  parties,
  presets,
}: TemplateRendererProps) {
  // Opciones resueltas una sola vez por plantilla: arreglos estables para que
  // los campos memoizados no se redibujen en cada tecla.
  const optionsByKey = useMemo(() => {
    const map = new Map<string, TemplateOption[]>();
    for (const section of template.sections) {
      for (const item of section.items) {
        for (const c of item.components) map.set(answerKey(item.code, c.code), resolveOptions(c, presets));
      }
    }
    return map;
  }, [template, presets]);

  const ctx: Ctx = { answers, onChange, readOnly, errors, parties, optionsByKey };

  return (
    <Stack spacing={{ xs: 2, md: 2.5 }}>
      {template.sections.map((section, i) => (
        <SectionBlock key={section.id ?? `${i}-${section.title}`} section={section} ctx={ctx} />
      ))}
    </Stack>
  );
}

function sectionProgress(section: TemplateSection, answers: Answers) {
  let total = 0;
  let done = 0;
  for (const item of section.items) {
    for (const c of item.components) {
      total += 1;
      if (!isEmptyAnswer(answers[answerKey(item.code, c.code)])) done += 1;
    }
  }
  return { total, done };
}

function SectionBlock({ section, ctx }: { section: TemplateSection; ctx: Ctx }) {
  const { total, done } = sectionProgress(section, ctx.answers);
  const complete = total > 0 && done === total;
  const isTable = section.layout === "TABLA";
  const hasHeaders = isTable && !!section.columnHeaders && section.columnHeaders.length > 0;

  return (
    <Surface sx={{ containerType: "inline-size" }}>
      <SectionHeader
        title={section.title}
        actions={
          !ctx.readOnly && total > 0 ? (
            <Typography
              variant="caption"
              sx={{
                fontVariantNumeric: "tabular-nums",
                color: complete ? designTokens.status.success.fg : designTokens.textCaption,
                transition: "color 150ms ease",
              }}
            >
              {done}/{total}
            </Typography>
          ) : undefined
        }
      />
      {section.items.length === 0 ? (
        <Typography variant="body2">Esta sección no tiene filas.</Typography>
      ) : hasHeaders ? (
        <HeaderTable section={section} ctx={ctx} />
      ) : isTable ? (
        <RowList section={section} ctx={ctx} />
      ) : (
        <Ficha section={section} ctx={ctx} />
      )}
    </Surface>
  );
}

/** Campo (o valor, en lectura) de un componente concreto. */
function Cell({ item, component, label, ctx }: { item: TemplateItem; component: TemplateComponent; label: string; ctx: Ctx }) {
  const key = answerKey(item.code, component.code);
  const options = ctx.optionsByKey.get(key) ?? [];
  if (ctx.readOnly || !ctx.onChange) {
    return <AnswerDisplay component={component} value={ctx.answers[key]} options={options} parties={ctx.parties} />;
  }
  return (
    <AnswerField
      fieldKey={key}
      component={component}
      label={label}
      value={ctx.answers[key]}
      onChange={ctx.onChange}
      error={ctx.errors[key]}
      options={options}
      parties={ctx.parties}
    />
  );
}

function FieldLabel({ children, required, htmlFor }: { children: ReactNode; required?: boolean; htmlFor?: string }) {
  return (
    <Typography
      component={htmlFor ? "label" : "div"}
      htmlFor={htmlFor}
      variant="body2"
      sx={{ color: "text.primary", fontWeight: 600, mb: 0.75, textWrap: "pretty" }}
    >
      {children}
      {required && (
        <Box component="span" aria-label="obligatorio" sx={{ color: designTokens.status.error.fg, ml: 0.375 }}>
          *
        </Box>
      )}
    </Typography>
  );
}

/** Componentes de ancho completo: no conviene ponerlos en media columna. */
function isWide(c: TemplateComponent): boolean {
  return c.type === "TEXTO_LARGO" || c.type === "LISTA_TEXTO" || c.type === "CONTEO_POR_PARTIDO" || c.type === "OPCION_MULTIPLE";
}

function Ficha({ section, ctx }: { section: TemplateSection; ctx: Ctx }) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "1fr",
        columnGap: 3,
        rowGap: 2.25,
        "@container (min-width: 640px)": { gridTemplateColumns: "1fr 1fr" },
      }}
    >
      {section.items.flatMap((item) => {
        if (item.components.length === 1) {
          const c = item.components[0];
          const key = answerKey(item.code, c.code);
          return [
            <Box key={key} id={fieldDomId(key)} sx={{ minWidth: 0, scrollMarginTop: 120, gridColumn: isWide(c) ? "1 / -1" : undefined }}>
              <FieldLabel required={!ctx.readOnly && c.required}>{item.label}</FieldLabel>
              <Cell item={item} component={c} label={item.label} ctx={ctx} />
            </Box>,
          ];
        }
        // Item con varios componentes: el item titula un grupo y cada componente lleva su etiqueta.
        return [
          <Box key={item.code} sx={{ gridColumn: "1 / -1", minWidth: 0 }}>
            <Typography variant="caption" component="div" sx={{ mb: 1.25, letterSpacing: "0.01em" }}>
              {item.label}
            </Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "1fr",
                columnGap: 3,
                rowGap: 2,
                "@container (min-width: 640px)": { gridTemplateColumns: "1fr 1fr" },
              }}
            >
              {item.components.map((c) => {
                const key = answerKey(item.code, c.code);
                const label = c.label ?? item.label;
                return (
                  <Box key={key} id={fieldDomId(key)} sx={{ minWidth: 0, scrollMarginTop: 120, gridColumn: isWide(c) ? "1 / -1" : undefined }}>
                    <FieldLabel required={!ctx.readOnly && c.required}>{label}</FieldLabel>
                    <Cell item={item} component={c} label={`${item.label}: ${label}`} ctx={ctx} />
                  </Box>
                );
              })}
            </Box>
          </Box>,
        ];
      })}
    </Box>
  );
}

const rowDivider = { borderTop: "1px solid rgba(15, 23, 42, 0.06)", "&:first-of-type": { borderTop: "none", pt: 0 } };

/** TABLA sin encabezados: pregunta a la izquierda, respuesta a la derecha; abajo en angosto o si es larga. */
function RowList({ section, ctx }: { section: TemplateSection; ctx: Ctx }) {
  return (
    <Box component="ol" sx={{ listStyle: "none", m: 0, p: 0 }}>
      {section.items.map((item, i) => {
        const anyWide = item.components.some(isWide) || item.components.length > 1;
        const firstKey = answerKey(item.code, item.components[0]?.code ?? "");
        const required = item.components.some((c) => c.required);
        const answered = item.components.every((c) => !isEmptyAnswer(ctx.answers[answerKey(item.code, c.code)]));
        return (
          <Box key={item.code} component="li" id={fieldDomId(firstKey)} sx={{ py: 1.75, scrollMarginTop: 120, ...rowDivider }}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "1fr",
                gap: 1.25,
                alignItems: "center",
                ...(anyWide ? {} : { "@container (min-width: 560px)": { gridTemplateColumns: "minmax(0, 1fr) auto" } }),
              }}
            >
              <Stack direction="row" gap={1.25} sx={{ minWidth: 0 }}>
                <Typography
                  variant="body2"
                  aria-hidden
                  sx={{
                    color: !ctx.readOnly && answered ? designTokens.status.success.fg : designTokens.textDisabled,
                    fontWeight: 700,
                    fontVariantNumeric: "tabular-nums",
                    minWidth: 20,
                    transition: "color 150ms ease",
                  }}
                >
                  {i + 1}
                </Typography>
                <Typography variant="body2" sx={{ color: "text.primary", fontWeight: 500, textWrap: "pretty" }}>
                  {item.label}
                  {!ctx.readOnly && required && (
                    <Box component="span" aria-label="obligatorio" sx={{ color: designTokens.status.error.fg, ml: 0.375 }}>
                      *
                    </Box>
                  )}
                </Typography>
              </Stack>
              <Stack spacing={1.5} sx={{ pl: "32px", minWidth: 0, "@container (min-width: 560px)": anyWide ? {} : { pl: 0 } }}>
                {item.components.map((c) => {
                  const key = answerKey(item.code, c.code);
                  const label = c.label ?? item.label;
                  return (
                    <Box key={key} id={item.components.length > 1 ? fieldDomId(key) : undefined} sx={{ scrollMarginTop: 120 }}>
                      {item.components.length > 1 && (
                        <Typography variant="caption" component="div" sx={{ mb: 0.5 }}>
                          {label}
                        </Typography>
                      )}
                      <Cell item={item} component={c} label={item.components.length > 1 ? `${item.label}: ${label}` : item.label} ctx={ctx} />
                    </Box>
                  );
                })}
              </Stack>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

/**
 * TABLA con encabezados. Encabezado 0 = etiqueta del item; los demas, uno
 * por componente. Si faltan encabezados se usa la etiqueta del componente.
 */
function HeaderTable({ section, ctx }: { section: TemplateSection; ctx: Ctx }) {
  const headers = section.columnHeaders ?? [];
  const columnCount = Math.max(...section.items.map((it) => it.components.length), headers.length - 1, 1);
  const headerFor = (i: number, c?: TemplateComponent) => headers[i + 1] ?? c?.label ?? "";
  const template = `minmax(140px, 1.1fr) repeat(${columnCount}, minmax(0, 1fr))`;
  const wide = "@container (min-width: 720px)";

  return (
    <Box role="table" aria-label={section.title}>
      <Box
        role="row"
        sx={{
          display: "none",
          [wide]: {
            display: "grid",
            gridTemplateColumns: template,
            columnGap: 2,
            pb: 1,
            borderBottom: "1px solid rgba(15, 23, 42, 0.08)",
          },
        }}
      >
        {[headers[0] ?? "", ...Array.from({ length: columnCount }, (_, i) => headerFor(i))].map((h, i) => (
          <Typography key={i} role="columnheader" variant="caption" sx={{ textTransform: "uppercase", letterSpacing: "0.04em" }}>
            {h}
          </Typography>
        ))}
      </Box>
      {section.items.map((item, rowIndex) => (
        <Box
          key={item.code}
          role="row"
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: 1.25,
            py: 1.75,
            // La fila de encabezados se oculta en angosto: la primera fila de datos no lleva linea arriba.
            borderTop: rowIndex === 0 ? "none" : "1px solid rgba(15, 23, 42, 0.06)",
            pt: rowIndex === 0 ? 0 : 1.75,
            [wide]: { gridTemplateColumns: template, columnGap: 2, alignItems: "start", pt: 1.75 },
          }}
        >
          <Typography role="rowheader" variant="body2" sx={{ color: "text.primary", fontWeight: 600, pt: { xs: 0 }, [wide]: { pt: 1 } }}>
            {item.label}
          </Typography>
          {item.components.map((c, i) => {
            const key = answerKey(item.code, c.code);
            const header = headerFor(i, c);
            return (
              <Box key={key} role="cell" id={fieldDomId(key)} sx={{ minWidth: 0, scrollMarginTop: 120 }}>
                <Typography variant="caption" component="div" sx={{ mb: 0.5, [wide]: { display: "none" } }}>
                  {header}
                  {!ctx.readOnly && c.required && (
                    <Box component="span" sx={{ color: designTokens.status.error.fg, ml: 0.375 }}>
                      *
                    </Box>
                  )}
                </Typography>
                <Cell item={item} component={c} label={`${item.label}: ${header}`} ctx={ctx} />
              </Box>
            );
          })}
        </Box>
      ))}
    </Box>
  );
}
