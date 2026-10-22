import { useQuery } from "@tanstack/react-query";
import { Autocomplete, Box, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { catalogApi } from "@/api/catalogApi";
import { territorioApi } from "@/api/territorioApi";
import { designTokens } from "@/theme/theme";
import type { DistrictDto } from "@/types/fiscalizacionFases";

export const DEPARTAMENTOS_QUERY_KEY = ["departamentos", "activos"];

export function useDepartamentos() {
  return useQuery({ queryKey: DEPARTAMENTOS_QUERY_KEY, queryFn: catalogApi.getDepartamentos, staleTime: 10 * 60_000 });
}

export function useDistritos(departmentId: number | null | undefined) {
  return useQuery({
    queryKey: ["departamentos", departmentId, "distritos"],
    queryFn: () => territorioApi.getDistritosDeDepartamento(departmentId!),
    enabled: !!departmentId,
    staleTime: 10 * 60_000,
  });
}

interface TerritorioFieldsProps {
  departmentId: number | null;
  districtId: number | null;
  onChange: (next: { departmentId: number | null; districtId: number | null }) => void;
  errors?: { departmentId?: string; districtId?: string };
  size?: "small" | "medium";
  /** En la barra de filtros: sin etiquetas flotantes, "Todos" en vez de vacio. */
  variant?: "form" | "filter";
}

/**
 * Selector de ubicacion en dos pasos: departamento y luego distrito. El
 * municipio no se pide: cada distrito ya lo trae y se muestra como contexto
 * en la lista para distinguir distritos con el mismo nombre.
 */
export function TerritorioFields({
  departmentId,
  districtId,
  onChange,
  errors,
  size = "medium",
  variant = "form",
}: TerritorioFieldsProps) {
  const departamentos = useDepartamentos();
  const distritos = useDistritos(departmentId);
  const options = distritos.data ?? [];
  const isFilter = variant === "filter";

  return (
    <Stack direction={isFilter ? "row" : { xs: "column", sm: "row" }} gap={isFilter ? 1.25 : 2} sx={{ minWidth: 0 }}>
      <TextField
        select
        size={size}
        label={isFilter ? undefined : "Departamento"}
        aria-label="Departamento"
        value={departmentId ?? ""}
        onChange={(e) => onChange({ departmentId: e.target.value ? Number(e.target.value) : null, districtId: null })}
        SelectProps={{ displayEmpty: isFilter }}
        error={!!errors?.departmentId}
        helperText={errors?.departmentId}
        sx={{ minWidth: isFilter ? 180 : 0, flex: isFilter ? undefined : 1 }}
      >
        {isFilter ? <MenuItem value="">Todos los departamentos</MenuItem> : null}
        {(departamentos.data ?? []).map((d) => (
          <MenuItem key={d.id} value={d.id}>
            {d.name}
          </MenuItem>
        ))}
      </TextField>
      <Autocomplete<DistrictDto>
        size={size}
        options={options}
        disabled={!departmentId}
        loading={distritos.isLoading && !!departmentId}
        value={options.find((d) => d.id === districtId) ?? null}
        onChange={(_, d) => onChange({ departmentId, districtId: d?.id ?? null })}
        getOptionLabel={(d) => d.name}
        isOptionEqualToValue={(a, b) => a.id === b.id}
        groupBy={isFilter ? undefined : (d) => d.municipalityName}
        noOptionsText="Sin distritos"
        loadingText="Cargando distritos…"
        renderOption={(props, d) => (
          <Box component="li" {...props} key={d.id}>
            <Stack sx={{ minWidth: 0 }}>
              <Typography variant="body2" sx={{ color: "text.primary", fontWeight: 600 }}>
                {d.name}
              </Typography>
              {isFilter && (
                <Typography variant="caption" sx={{ color: designTokens.textCaption }}>
                  {d.municipalityName}
                </Typography>
              )}
            </Stack>
          </Box>
        )}
        sx={{ minWidth: isFilter ? 200 : 0, flex: isFilter ? undefined : 1.3 }}
        renderInput={(params) => (
          <TextField
            {...params}
            label={isFilter ? undefined : "Distrito"}
            placeholder={isFilter ? (departmentId ? "Todos los distritos" : "Distrito") : departmentId ? "Busca el distrito" : "Elige primero el departamento"}
            inputProps={{ ...params.inputProps, "aria-label": "Distrito" }}
            error={!!errors?.districtId}
            helperText={errors?.districtId}
          />
        )}
      />
    </Stack>
  );
}
