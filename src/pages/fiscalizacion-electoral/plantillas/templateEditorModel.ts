import { isOptionType } from "@/types/fiscalizacionFases";
import type {
  FormTemplateDto,
  FormTemplateRequest,
  TemplateComponent,
  TemplateComponentType,
  TemplateItem,
  TemplateLayout,
  TemplateOption,
  TemplateSection,
} from "@/types/fiscalizacionFases";

/**
 * Modelo local del constructor. Cada pieza lleva una _key estable solo
 * para React (reordenar sin perder el foco ni el acordeon abierto); se
 * quita antes de mandar el body al backend.
 */
export interface EditorComponent extends Omit<TemplateComponent, "id"> {
  _key: string;
  /** Modo de opciones mientras se edita: un preset del catalogo o una lista propia. */
  _optionMode: "preset" | "custom";
}
export interface EditorItem extends Omit<TemplateItem, "id" | "components"> {
  _key: string;
  components: EditorComponent[];
}
export interface EditorSection extends Omit<TemplateSection, "id" | "items"> {
  _key: string;
  items: EditorItem[];
}
export interface EditorDraft {
  code: string;
  name: string;
  formatCode: string;
  description: string;
  sections: EditorSection[];
}

let seq = 0;
export const newKey = () => `k${++seq}`;

export const CODE_REGEX = /^[A-Z0-9_]+$/;

/** "Nombre del coordinador(a)" -> "NOMBRE_DEL_COORDINADOR_A". */
export function toCode(text: string, max = 40): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, max)
    .replace(/_+$/g, "");
}

/** Normaliza lo que la persona escribe en un campo de codigo. */
export function sanitizeCode(text: string): string {
  return text.toUpperCase().replace(/[^A-Z0-9_]/g, "_");
}

export function newComponent(type: TemplateComponentType = "TEXTO", code = "VALOR"): EditorComponent {
  return { _key: newKey(), _optionMode: "preset", code, label: null, type, required: false, optionPreset: null, options: null };
}

export function newItem(): EditorItem {
  return { _key: newKey(), code: "", label: "", components: [newComponent()] };
}

export function newSection(layout: TemplateLayout = "FICHA"): EditorSection {
  return { _key: newKey(), title: "", layout, columnHeaders: null, items: [newItem()] };
}

export function emptyDraft(): EditorDraft {
  return { code: "", name: "", formatCode: "", description: "", sections: [newSection()] };
}

export function fromTemplate(t: FormTemplateDto): EditorDraft {
  return {
    code: t.code,
    name: t.name,
    formatCode: t.formatCode ?? "",
    description: t.description ?? "",
    sections: t.sections.map((s) => ({
      _key: newKey(),
      title: s.title,
      layout: s.layout,
      columnHeaders: s.columnHeaders && s.columnHeaders.length > 0 ? [...s.columnHeaders] : null,
      items: s.items.map((it) => ({
        _key: newKey(),
        code: it.code,
        label: it.label,
        components: it.components.map((c) => ({
          _key: newKey(),
          _optionMode: c.options && c.options.length > 0 && !c.optionPreset ? "custom" : "preset",
          code: c.code,
          label: c.label,
          type: c.type,
          required: c.required,
          optionPreset: c.optionPreset ?? null,
          options: c.optionPreset ? null : c.options ?? null,
        })),
      })),
    })),
  };
}

/** Body para POST/PUT: sin _keys y con opciones solo en la forma elegida (preset XOR lista). */
export function toRequest(d: EditorDraft): FormTemplateRequest {
  return {
    code: d.code.trim(),
    name: d.name.trim(),
    formatCode: d.formatCode.trim() || null,
    description: d.description.trim() || null,
    sections: d.sections.map((s) => ({
      title: s.title.trim(),
      layout: s.layout,
      columnHeaders: s.layout === "TABLA" && s.columnHeaders ? s.columnHeaders.map((h) => h.trim()) : null,
      items: s.items.map((it) => ({
        code: it.code,
        label: it.label.trim(),
        components: it.components.map((c) => {
          const withOptions = isOptionType(c.type);
          return {
            code: c.code,
            label: c.label?.trim() || null,
            type: c.type,
            required: c.required,
            optionPreset: withOptions && c._optionMode === "preset" ? c.optionPreset ?? null : null,
            options:
              withOptions && c._optionMode === "custom"
                ? (c.options ?? []).map((o) => ({ code: o.code, label: o.label.trim() }))
                : null,
          };
        }),
      })),
    })),
  };
}

/** Lo mismo que vera el delegado, para la vista previa (con las opciones resueltas). */
export function toPreview(d: EditorDraft): { sections: TemplateSection[] } {
  return { sections: toRequest(d).sections };
}

export type EditorErrors = Record<string, string>;

/** Rutas de error: "name", "s0.title", "s0.i1.code", "s0.i1.c0.options"... */
export function validateDraft(d: EditorDraft, isNew: boolean): EditorErrors {
  const e: EditorErrors = {};
  if (!d.name.trim()) e.name = "Escribe el nombre";
  if (isNew) {
    if (!d.code) e.code = "Escribe el código";
    else if (!CODE_REGEX.test(d.code)) e.code = "Solo mayúsculas, números y _";
  }
  if (d.sections.length === 0) e.sections = "Agrega al menos una sección";

  const itemCodes = new Map<string, string>();
  d.sections.forEach((s, si) => {
    const sp = `s${si}`;
    if (!s.title.trim()) e[`${sp}.title`] = "Escribe el título de la sección";
    if (s.items.length === 0) e[`${sp}.items`] = "Agrega al menos una fila";
    s.items.forEach((it, ii) => {
      const ip = `${sp}.i${ii}`;
      if (!it.label.trim()) e[`${ip}.label`] = "Escribe la etiqueta";
      if (!it.code) e[`${ip}.code`] = "Falta el código";
      else if (!CODE_REGEX.test(it.code)) e[`${ip}.code`] = "Solo mayúsculas, números y _";
      else if (itemCodes.has(it.code)) e[`${ip}.code`] = "Código repetido en la plantilla";
      else itemCodes.set(it.code, ip);
      if (it.components.length === 0) e[`${ip}.components`] = "Agrega al menos una respuesta";

      const compCodes = new Set<string>();
      it.components.forEach((c, ci) => {
        const cp = `${ip}.c${ci}`;
        if (!c.code) e[`${cp}.code`] = "Falta el código";
        else if (!CODE_REGEX.test(c.code)) e[`${cp}.code`] = "Solo mayúsculas, números y _";
        else if (compCodes.has(c.code)) e[`${cp}.code`] = "Código repetido en la fila";
        compCodes.add(c.code);
        if (it.components.length > 1 && !c.label?.trim() && !(s.layout === "TABLA" && s.columnHeaders?.[ci + 1]?.trim())) {
          e[`${cp}.label`] = "Con varias respuestas, cada una lleva su etiqueta";
        }
        if (isOptionType(c.type)) {
          if (c._optionMode === "preset") {
            if (!c.optionPreset) e[`${cp}.options`] = "Elige un conjunto de opciones";
          } else {
            const opts = c.options ?? [];
            const codes = new Set<string>();
            if (opts.length < 2) e[`${cp}.options`] = "Agrega al menos 2 opciones";
            else if (opts.some((o) => !o.label.trim())) e[`${cp}.options`] = "Hay opciones sin texto";
            else if (opts.some((o) => !CODE_REGEX.test(o.code) || codes.size === codes.add(o.code).size)) {
              e[`${cp}.options`] = "Revisa los códigos de las opciones (únicos, mayúsculas)";
            }
          }
        }
      });
    });
  });
  return e;
}

/** Nueva opcion propia con codigo derivado del texto. */
export function makeOption(label: string): TemplateOption {
  return { label, code: toCode(label, 30) };
}

export function moveInArray<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [x] = next.splice(from, 1);
  next.splice(to, 0, x);
  return next;
}
