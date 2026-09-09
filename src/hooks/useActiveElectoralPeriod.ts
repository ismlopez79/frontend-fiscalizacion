import { useQuery } from "@tanstack/react-query";
import { electoralPeriodApi } from "@/api/electoralApi";

/**
 * El periodo con active:true (nunca el mas reciente por fecha) es el que se
 * debe ofrecer por defecto al crear delegados/centros nuevos — ver
 * "Fiscalizacion electoral — Periodos" en la doc de API.
 */
export function useActiveElectoralPeriod() {
  const query = useQuery({
    queryKey: ["periodos-electorales"],
    queryFn: electoralPeriodApi.getPeriodos,
  });

  const activePeriod = query.data?.find((p) => p.active) ?? null;

  return { ...query, activePeriod };
}
