import { Controller, useFormContext } from "react-hook-form";
import { IconButton, MenuItem, Stack, TextField, Tooltip } from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import type { IncidentTypeDto } from "@/types/catalog";
import type { ActaFormValues } from "./actaFormSchema";

interface IncidenteRowProps {
  index: number;
  tiposIncidente: IncidentTypeDto[];
  onRemove: () => void;
}

/**
 * Una fila de "incidente" del acta: tipo (catalogo) + descripcion libre.
 * A diferencia de ProduccionRow, no tiene lista anidada — y a diferencia de
 * producciones, toda la seccion es opcional (no hay "minimo 1 fila").
 */
export function IncidenteRow({ index, tiposIncidente, onRemove }: IncidenteRowProps) {
  const {
    control,
    register,
    watch,
    formState: { errors },
  } = useFormContext<ActaFormValues>();

  const incidenteErrors = errors.incidentes?.[index];

  // Mismo patron que las categorias duplicadas de ProduccionRow: el select
  // de esta fila oculta los tipos ya elegidos en OTRAS filas del acta — la
  // propia seleccion actual siempre se deja visible para no romper el valor
  // ya elegido.
  const incidentes = watch("incidentes");
  const currentTypeId = incidentes?.[index]?.incidentTypeId;
  const usedTypeIds = (incidentes ?? [])
    .filter((_, i) => i !== index)
    .map((inc) => inc?.incidentTypeId)
    .filter((id): id is number => !!id);
  const availableTipos = tiposIncidente.filter((tipo) => tipo.id === currentTypeId || !usedTypeIds.includes(tipo.id));

  return (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "flex-start" }}>
      <Controller
        name={`incidentes.${index}.incidentTypeId`}
        control={control}
        render={({ field }) => (
          <TextField
            select
            label="Tipo de incidente"
            value={field.value || ""}
            onChange={(e) => field.onChange(Number(e.target.value))}
            error={!!incidenteErrors?.incidentTypeId}
            helperText={incidenteErrors?.incidentTypeId?.message}
            sx={{ flex: 1, minWidth: 200 }}
          >
            <MenuItem value="" disabled>
              Selecciona
            </MenuItem>
            {availableTipos.map((tipo) => (
              <MenuItem key={tipo.id} value={tipo.id}>
                {tipo.name}
              </MenuItem>
            ))}
          </TextField>
        )}
      />

      <TextField
        label="Descripción"
        placeholder="Qué pasó exactamente (si elegiste 'Otro', descríbelo aquí)"
        multiline
        minRows={3}
        error={!!incidenteErrors?.description}
        helperText={incidenteErrors?.description?.message}
        sx={{ flex: 2, "& .MuiInputBase-inputMultiline": { resize: "vertical" } }}
        {...register(`incidentes.${index}.description`)}
      />

      <Tooltip title="Quitar incidente">
        <IconButton size="small" onClick={onRemove} sx={{ mt: { sm: 1 } }}>
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}
