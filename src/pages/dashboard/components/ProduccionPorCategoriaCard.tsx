import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { catalogApi } from "@/api/catalogApi";
import { OTHERS_CATEGORY_COLOR, getCategoryColor } from "@/theme/dashboardColors";
import type { CategoriaProduccionDto } from "@/types/dashboard";
import { groupWithOthers } from "../dashboardFormat";
import { RankedList } from "./RankedList";
import { SectionHeader, Surface } from "@/components/ui/Surface";

const MAX_INDIVIDUAL_CATEGORIES = 7;

interface ProduccionPorCategoriaCardProps {
  data: CategoriaProduccionDto[] | undefined;
  loading: boolean;
}

/**
 * Un color por categoria, asignado por su posicion FIJA en el catalogo
 * (displayOrder) — no por su posicion en este array, que cambia segun el
 * filtro. Mas de 7 categorias se agrupan en "Otras".
 */
export function ProduccionPorCategoriaCard({ data, loading }: ProduccionPorCategoriaCardProps) {
  const categoriasQuery = useQuery({
    queryKey: ["categorias"],
    queryFn: catalogApi.getCategorias,
  });

  const rows = useMemo(() => {
    const catalogIndex = new Map<string, number>();
    (categoriasQuery.data ?? [])
      .slice()
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .forEach((cat, index) => catalogIndex.set(cat.name, index));

    return groupWithOthers(data ?? [], MAX_INDIVIDUAL_CATEGORIES, (total) => ({ categoryName: "Otras", total })).map(
      (row) => ({
        key: row.categoryName,
        label: row.categoryName,
        value: row.total,
        color:
          row.categoryName === "Otras" && !catalogIndex.has("Otras")
            ? OTHERS_CATEGORY_COLOR.light
            : getCategoryColor(catalogIndex.get(row.categoryName) ?? 0, "light"),
      })
    );
  }, [data, categoriasQuery.data]);

  return (
    <Surface>
      <SectionHeader title="Producción por categoría" subtitle="Cantidades declaradas en el rango." />
      <RankedList
        rows={rows}
        loading={loading || categoriasQuery.isLoading}
        emptyTitle="Sin producción en este rango"
        emptyHint="Ninguna acta declara cantidades entre estas fechas."
      />
    </Surface>
  );
}
