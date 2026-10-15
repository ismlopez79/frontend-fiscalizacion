import { ACCENT_COLOR } from "@/theme/dashboardColors";
import type { DuicentroTopDto } from "@/types/dashboard";
import { dashboardNumberFormatter as fmt } from "../dashboardFormat";
import { RankedList } from "./RankedList";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { SectionHeader, Surface } from "@/components/ui/Surface";

const LIMIT_OPTIONS = [
  { value: 5, label: "Top 5" },
  { value: 10, label: "Top 10" },
  { value: 20, label: "Top 20" },
];

interface DuicentrosTopCardProps {
  data: DuicentroTopDto[] | undefined;
  loading: boolean;
  limit: number;
  onLimitChange: (limit: number) => void;
}

/** Ranking de una sola serie: un solo color, el acento de marca. */
export function DuicentrosTopCard({ data, loading, limit, onLimitChange }: DuicentrosTopCardProps) {
  const rows = (data ?? []).map((d) => ({
    key: String(d.duicentroId),
    label: d.duicentroName,
    sublabel: d.departmentName,
    value: d.totalProduccion,
    secondary: `${fmt.format(d.totalActas)} ${d.totalActas === 1 ? "acta" : "actas"}`,
    color: ACCENT_COLOR.light,
  }));

  return (
    <Surface>
      <SectionHeader
        title="Duicentros con más producción"
        subtitle="En el rango de fechas seleccionado."
        actions={
          <SegmentedControl<number>
            ariaLabel="Cantidad de duicentros"
            options={LIMIT_OPTIONS}
            value={limit}
            onChange={onLimitChange}
          />
        }
      />
      <RankedList
        rows={rows}
        loading={loading}
        showRank
        skeletonRows={Math.min(limit, 8)}
        emptyTitle="Ningún duicentro con producción"
        emptyHint="No hay actas en este rango de fechas."
      />
    </Surface>
  );
}
