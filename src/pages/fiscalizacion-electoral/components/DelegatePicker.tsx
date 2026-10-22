import { useQuery } from "@tanstack/react-query";
import { Autocomplete, Box, Stack, TextField, Typography } from "@mui/material";
import { activityApi } from "@/api/fiscalizacionFasesApi";
import { designTokens } from "@/theme/theme";
import type { DelegateAvailabilityDto } from "@/types/fiscalizacionFases";
import { DelegateAvatar } from "../fiscalizacionFasesUi";

/** Llave unica de un delegado entre las dos fuentes (temporal / permanente). */
export const delegateKey = (d: { delegateType: string; delegateId: number }) => `${d.delegateType}:${d.delegateId}`;

export function busyText(d: DelegateAvailabilityDto): string | null {
  if (d.available || !d.busyIn) return null;
  return `Ocupado en: ${d.busyIn.phaseName}, ${d.busyIn.placeName} (${d.busyIn.districtName})`;
}

/** Disponibilidad de todos los delegados asignables en una fecha. Solo admin (ASSIGNMENT_MANAGE). */
export function useDelegadosDisponibles(periodId: number | null | undefined, fecha: string | null | undefined) {
  return useQuery({
    queryKey: ["actividades", "delegados-disponibles", periodId ?? null, fecha ?? null],
    queryFn: () => activityApi.getDelegadosDisponibles(periodId!, fecha!),
    enabled: !!periodId && !!fecha,
  });
}

/** Libres primero (por nombre); los ocupados al final, deshabilitados. */
function sortOptions(list: DelegateAvailabilityDto[]): DelegateAvailabilityDto[] {
  return [...list].sort((a, b) => Number(b.available) - Number(a.available) || a.fullName.localeCompare(b.fullName));
}

function Option({ d }: { d: DelegateAvailabilityDto }) {
  const busy = busyText(d);
  return (
    <Stack direction="row" alignItems="center" gap={1.25} sx={{ minWidth: 0, py: 0.25 }}>
      <Box sx={{ opacity: busy ? 0.55 : 1, display: "flex" }}>
        <DelegateAvatar name={d.fullName} size={28} />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" sx={{ color: busy ? designTokens.textSecondary : "text.primary", fontWeight: 600 }}>
          {d.fullName}
        </Typography>
        {busy && (
          <Typography variant="caption" component="div" sx={{ color: designTokens.status.warning.fg, whiteSpace: "normal" }}>
            {busy}
          </Typography>
        )}
      </Box>
    </Stack>
  );
}

interface BaseProps {
  options: DelegateAvailabilityDto[];
  loading?: boolean;
  /** Sin fecha todavia: no se sabe quien esta libre. */
  disabledHint?: string;
  label?: string;
  placeholder?: string;
  helperText?: string;
  error?: boolean;
  size?: "small" | "medium";
}

const noOptions = "No hay delegados para asignar";

/** Varios delegados (crear actividad). Los ocupados se ven pero no se pueden elegir. */
export function DelegateMultiPicker({
  options,
  value,
  onChange,
  loading,
  disabledHint,
  label = "Delegados",
  placeholder = "Busca por nombre",
  helperText,
  error,
}: BaseProps & { value: string[]; onChange: (keys: string[]) => void }) {
  const sorted = sortOptions(options);
  return (
    <Autocomplete<DelegateAvailabilityDto, true>
      multiple
      options={sorted}
      loading={loading}
      disabled={!!disabledHint}
      value={sorted.filter((d) => value.includes(delegateKey(d)))}
      onChange={(_, list) => onChange(list.map(delegateKey))}
      getOptionLabel={(d) => d.fullName}
      getOptionDisabled={(d) => !d.available}
      isOptionEqualToValue={(a, b) => delegateKey(a) === delegateKey(b)}
      groupBy={(d) => (d.available ? "Libres ese día" : "Ocupados ese día")}
      filterSelectedOptions
      disableCloseOnSelect
      noOptionsText={noOptions}
      loadingText="Revisando disponibilidad…"
      ChipProps={{ size: "small" }}
      renderOption={(props, d) => (
        <Box component="li" {...props} key={delegateKey(d)}>
          <Option d={d} />
        </Box>
      )}
      renderInput={(params) => (
        <TextField {...params} label={label} placeholder={disabledHint ? undefined : placeholder} error={error} helperText={disabledHint ?? helperText} />
      )}
    />
  );
}

/** Un delegado (agregar al equipo de una actividad ya creada). */
export function DelegateSinglePicker({
  options,
  value,
  onChange,
  loading,
  disabledHint,
  placeholder = "Busca por nombre",
  size = "small",
}: BaseProps & { value: DelegateAvailabilityDto | null; onChange: (d: DelegateAvailabilityDto | null) => void }) {
  const sorted = sortOptions(options);
  return (
    <Autocomplete<DelegateAvailabilityDto>
      size={size}
      options={sorted}
      loading={loading}
      disabled={!!disabledHint}
      value={value}
      onChange={(_, d) => onChange(d)}
      getOptionLabel={(d) => d.fullName}
      getOptionDisabled={(d) => !d.available}
      isOptionEqualToValue={(a, b) => delegateKey(a) === delegateKey(b)}
      groupBy={(d) => (d.available ? "Libres ese día" : "Ocupados ese día")}
      noOptionsText={noOptions}
      loadingText="Revisando disponibilidad…"
      sx={{ flex: 1, minWidth: 0 }}
      renderOption={(props, d) => (
        <Box component="li" {...props} key={delegateKey(d)}>
          <Option d={d} />
        </Box>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder={disabledHint ?? placeholder}
          inputProps={{ ...params.inputProps, "aria-label": "Delegado" }}
        />
      )}
    />
  );
}
