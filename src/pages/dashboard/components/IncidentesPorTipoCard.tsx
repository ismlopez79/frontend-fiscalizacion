import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { catalogApi } from "@/api/catalogApi";
import { OTHERS_CATEGORY_COLOR, getCategoryColor } from "@/theme/dashboardColors";
import type { IncidentePorTipoDto } from "@/types/dashboard";
import { groupWithOthers } from "../dashboardFormat";
import { RankedList } from "./RankedList";
import { SectionHeader, Surface } from "@/components/ui/Surface";

const MAX_INDIVIDUAL_TYPES = 7;

interface IncidentesPorTipoCardProps {
  data: IncidentePorTipoDto[] | undefined;
  loading: boolean;
}

/** Mismo criterio de color que categorias: posicion fija en el catalogo tipos-incidente. */
export function IncidentesPorTipoCard({ data, loading }: IncidentesPorTipoCardProps) {
  const tiposQuery = useQuery({
    queryKey: ["tipos-incidente"],
    queryFn: catalogApi.getTiposIncidente,
  });

  const rows = useMemo(() => {
    const catalogIndex = new Map<string, number>();
    (tiposQuery.data ?? [])
      .slice()
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .forEach((tipo, index) => catalogIndex.set(tipo.name, index));

    return groupWithOthers(data ?? [], MAX_INDIVIDUAL_TYPES, (total) => ({ typeName: "Otras", total })).map((row) => ({
      key: row.typeName,
      label: row.typeName,
      value: row.total,
      color:
        row.typeName === "Otras" && !catalogIndex.has("Otras")
          ? OTHERS_CATEGORY_COLOR.light
          : getCategoryColor(catalogIndex.get(row.typeName) ?? 0, "light"),
    }));
  }, [data, tiposQuery.data]);

  return (
    <Surface>
      <SectionHeader title="Incidentes por tipo" subtitle="Registrados en el rango de fechas." />
      <RankedList
        rows={rows}
        loading={loading || tiposQuery.isLoading}
        emptyTitle="Sin incidentes en este rango"
        emptyHint="Ningún incidente registrado entre estas fechas."
      />
    </Surface>
  );
}
