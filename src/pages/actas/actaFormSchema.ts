import { z } from "zod";
import type { ProductionCategoryDto } from "@/types/catalog";
import type { ActaDraftContent, ActaDraftSnapshot } from "@/types/acta";

const valueSchema = z.object({
  categoryId: z.number().min(1, "Selecciona una categoría"),
  // Sin valor por defecto: el input arranca vacio (sin placeholder en "0")
  // hasta que el digitador escribe algo, ver EMPTY_VALUE. Por eso queda
  // opcional aqui — la regla real de "obligatorio y mayor a 0" vive en el
  // superRefine de produccionSchema (necesita ver el array completo para
  // ademas detectar categorias duplicadas en el mismo golpe).
  quantity: z.number().int("Debe ser un número entero").min(1, "Debe ser mayor a 0").optional(),
});

const produccionSchema = z
  .object({
    productionDate: z.string().min(1, "La fecha es obligatoria"),
    declaredTotal: z.number().optional(),
    values: z.array(valueSchema).min(1, "Agrega al menos una categoría con cantidad"),
  })
  .superRefine((data, ctx) => {
    const seenCategoryIds = new Set<number>();
    data.values.forEach((value, index) => {
      if (value.quantity === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Ingresa una cantidad",
          path: ["values", index, "quantity"],
        });
      }
      if (value.categoryId > 0 && seenCategoryIds.has(value.categoryId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Esta categoría ya fue agregada en esta producción",
          path: ["values", index, "categoryId"],
        });
      }
      seenCategoryIds.add(value.categoryId);
    });
  });

const incidenteSchema = z.object({
  incidentTypeId: z.number().min(1, "Selecciona un tipo de incidente"),
  description: z.string().min(1, "La descripción es obligatoria"),
});

// El filtro en tiempo real del <select> (ver IncidenteRow) ya evita elegir
// un tipo repetido, esto es la red de seguridad a nivel de schema.
const incidentesArraySchema = z.array(incidenteSchema).superRefine((incidentes, ctx) => {
  const seenTypeIds = new Set<number>();
  incidentes.forEach((incidente, index) => {
    if (incidente.incidentTypeId > 0 && seenTypeIds.has(incidente.incidentTypeId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Este tipo de incidente ya fue agregado en esta acta",
        path: [index, "incidentTypeId"],
      });
    }
    seenTypeIds.add(incidente.incidentTypeId);
  });
});

export const actaFormSchema = z.object({
  departmentId: z.number().min(1, "Selecciona un departamento"),
  duicentroId: z.number().min(1, "Selecciona un duicentro"),
  actaDate: z.string().min(1, "La fecha del acta es obligatoria"),
  arrivalTime: z.string().optional(),
  departureTime: z.string().optional(),
  jveDelegateId: z.number().optional(),
  rnpnDelegateName: z.string().optional(),
  duicentroChiefName: z.string().optional(),
  observations: z.string().optional(),
  declaredTotal: z.number().optional(),
  producciones: z.array(produccionSchema).min(1, "Agrega al menos una producción"),
  // Opcional: el acta puede no tener ningun incidente (defaultValues arranca
  // en []). Cada fila que exista si exige ambos campos (misma regla que
  // produccionSchema.values), y no puede repetir el tipo de otra fila.
  incidentes: incidentesArraySchema,
});

export type ActaFormValues = z.infer<typeof actaFormSchema>;

export const EMPTY_VALUE: { categoryId: number; quantity: number | undefined } = {
  categoryId: 0,
  quantity: undefined,
};

export const EMPTY_PRODUCCION = {
  productionDate: "",
  declaredTotal: undefined,
  values: [EMPTY_VALUE],
};

export const EMPTY_INCIDENTE = { incidentTypeId: 0, description: "" };

/**
 * Las 4 categorías que casi siempre aplican a una producción. Se agregan
 * automáticamente como filas precargadas (cantidad vacía) al crear una
 * producción nueva, para que el digitador solo tenga que llenar el número
 * en vez de tener que buscarlas una por una en el select. Siguen siendo
 * filas normales del array `values` — cada una exige su cantidad antes de
 * poder guardar (ver valueSchema); la que no aplique se debe borrar, no
 * dejar en blanco. Tambien se puede agregar cualquier otra categoría del
 * catálogo con "Agregar categoría".
 */
export const DEFAULT_CATEGORY_NAMES = ["Primera vez", "Modificaciones", "Reposiciones", "Renovaciones"];

/**
 * Arma las filas iniciales de `values` para una producción nueva, resolviendo
 * el id real de cada categoría por nombre contra el catálogo ya cargado
 * (los ids nunca se hardcodean — el backend es quien los asigna). Si el
 * catálogo todavía no ha cargado o ninguna coincide, cae de vuelta a una
 * sola fila vacía para que el formulario siga siendo usable.
 */
export function buildDefaultProductionValues(categorias: ProductionCategoryDto[]) {
  const rows = DEFAULT_CATEGORY_NAMES.map((name) =>
    categorias.find((c) => c.name.trim().toLowerCase() === name.toLowerCase())
  )
    .filter((c): c is ProductionCategoryDto => !!c)
    .map((c) => ({ categoryId: c.id, quantity: undefined }));

  return rows.length > 0 ? rows : [{ ...EMPTY_VALUE }];
}

/**
 * Flags de UI necesarios para mapear ActaFormValues <-> el content del
 * borrador — no viajan tal cual al backend, ver ActaDraftSnapshot.
 */
interface DraftMappingOptions {
  puedeElegirJve: boolean;
}

/**
 * Arma el `content` del autoguardado (POST/PATCH borrador) a partir de los
 * valores actuales del formulario. Misma logica de "DIGITADOR nunca elige
 * jveDelegateId" que ya usa el submit de ActaFormPage — el backend no valida
 * nada de esto hasta /finalizar, pero mandar el shape ya limpio evita
 * sorpresas ahi. RNPN y Jefe de duicentro siempre viajan como nombre libre
 * (nunca id): el catalogo de delegados solo se usa para el Delegado JVE.
 */
export function buildDraftContent(values: ActaFormValues, opts: DraftMappingOptions): ActaDraftContent {
  return {
    arrivalTime: values.arrivalTime || null,
    departureTime: values.departureTime || null,
    jveDelegateId: opts.puedeElegirJve ? values.jveDelegateId ?? null : null,
    rnpnDelegateName: values.rnpnDelegateName || null,
    duicentroChiefName: values.duicentroChiefName || null,
    observations: values.observations || null,
    declaredTotal: values.declaredTotal ?? null,
    producciones: values.producciones.map((p) => ({
      productionDate: p.productionDate,
      declaredTotal: p.declaredTotal,
      // needsVerification ya no es un campo del formulario (ver Punto 2) —
      // el backend lo sigue exigiendo en el shape, se manda fijo en false.
      // quantity puede venir undefined mientras el digitador todavia esta
      // llenando la produccion (el borrador no se valida hasta /finalizar).
      values: p.values.map((v) => ({
        categoryId: v.categoryId,
        quantity: v.quantity ?? 0,
        needsVerification: false,
      })),
    })),
    incidentes: values.incidentes.map((i) => ({
      incidentTypeId: i.incidentTypeId,
      description: i.description,
    })),
  };
}

/** Instantanea completa (content + los 3 campos minimos) para mandar a useActaDraftAutosave en cada cambio. */
export function buildDraftSnapshot(values: ActaFormValues, opts: DraftMappingOptions): ActaDraftSnapshot {
  return {
    departmentId: values.departmentId,
    duicentroId: values.duicentroId,
    actaDate: values.actaDate,
    content: buildDraftContent(values, opts),
  };
}

/**
 * Camino inverso: reconstruye ActaFormValues a partir de un borrador
 * recuperado (backend o LocalStorage), para pasarselo a methods.reset().
 * El content del borrador no esta validado — values/producciones pueden
 * venir vacios, por eso cae de vuelta a las mismas filas placeholder que
 * usa el formulario en blanco.
 */
export function mapDraftSnapshotToFormValues(snapshot: ActaDraftSnapshot): ActaFormValues {
  const c = snapshot.content ?? {};
  return {
    departmentId: snapshot.departmentId,
    duicentroId: snapshot.duicentroId,
    actaDate: snapshot.actaDate,
    arrivalTime: c.arrivalTime ?? "",
    departureTime: c.departureTime ?? "",
    jveDelegateId: c.jveDelegateId ?? undefined,
    rnpnDelegateName: c.rnpnDelegateName ?? "",
    duicentroChiefName: c.duicentroChiefName ?? "",
    observations: c.observations ?? "",
    declaredTotal: c.declaredTotal ?? undefined,
    producciones:
      c.producciones && c.producciones.length > 0
        ? c.producciones.map((p) => ({
            productionDate: p.productionDate,
            declaredTotal: p.declaredTotal,
            values:
              p.values.length > 0
                ? p.values.map((v) => ({ categoryId: v.categoryId, quantity: v.quantity }))
                : [{ ...EMPTY_VALUE }],
          }))
        : [{ ...EMPTY_PRODUCCION }],
    incidentes: c.incidentes ?? [],
  };
}
