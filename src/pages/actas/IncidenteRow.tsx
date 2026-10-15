import { Controller, useFormContext } from "react-hook-form";
import { Box, ButtonBase, Collapse, IconButton, MenuItem, Stack, TextField, Tooltip, Typography } from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ExpandMoreIcon from "@mui/icons-material/ExpandMoreRounded";
import { designTokens } from "@/theme/theme";
import type { IncidentTypeDto } from "@/types/catalog";
import type { ActaFormValues } from "./actaFormSchema";

interface IncidenteRowProps {
  index: number;
  tiposIncidente: IncidentTypeDto[];
  onRemove: () => void;
  open: boolean;
  onToggle: () => void;
}

/**
 * Una fila de "incidente" del acta: tipo (catalogo) + descripcion libre.
 * A diferencia de ProduccionRow, no tiene lista anidada — y a diferencia de
 * producciones, toda la seccion es opcional (no hay "minimo 1 fila").
 *
 * Mismo acordeon que ProduccionRow (`open`/`onToggle` desde ActaFormPage):
 * contraido muestra el tipo y el inicio de la descripcion, para reconocer
 * cada incidente sin abrirlo.
 */
export function IncidenteRow({ index, tiposIncidente, onRemove, open, onToggle }: IncidenteRowProps) {
  const {
    control,
    register,
    watch,
    formState: { errors },
  } = useFormContext<ActaFormValues>();

  const incidenteErrors = errors.incidentes?.[index];
  const hasErrors = !!incidenteErrors;

  // Mismo patron que las categorias duplicadas de ProduccionRow: el select
  // de esta fila oculta los tipos ya elegidos en OTRAS filas del acta — la
  // propia seleccion actual siempre se deja visible para no romper el valor
  // ya elegido.
  const incidentes = watch("incidentes");
  const currentTypeId = incidentes?.[index]?.incidentTypeId;
  const description = incidentes?.[index]?.description ?? "";
  const usedTypeIds = (incidentes ?? [])
    .filter((_, i) => i !== index)
    .map((inc) => inc?.incidentTypeId)
    .filter((id): id is number => !!id);
  const availableTipos = tiposIncidente.filter((tipo) => tipo.id === currentTypeId || !usedTypeIds.includes(tipo.id));
  const typeName = tiposIncidente.find((t) => t.id === currentTypeId)?.name;
  const contentId = `incidente-${index}-contenido`;

  return (
    <Box
      sx={{
        borderRadius: "16px",
        bgcolor: open ? "rgba(15, 23, 42, 0.025)" : "transparent",
        boxShadow: hasErrors
          ? `inset 0 0 0 1px ${designTokens.status.error.border}`
          : "inset 0 0 0 1px rgba(15, 23, 42, 0.08)",
        transition: "background-color 200ms ease",
      }}
    >
      <Stack direction="row" alignItems="center" sx={{ pr: 1 }}>
        <ButtonBase
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={contentId}
          sx={{
            flex: 1,
            minWidth: 0,
            justifyContent: "flex-start",
            gap: 1.5,
            px: 2,
            py: 1.75,
            borderRadius: "16px",
            textAlign: "left",
          }}
        >
          <ExpandMoreIcon
            fontSize="small"
            sx={{
              color: designTokens.textCaption,
              transform: open ? "rotate(0deg)" : "rotate(-90deg)",
              transition: `transform 200ms ${designTokens.easeOut}`,
            }}
          />
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography sx={{ fontWeight: 700, color: "text.primary", fontSize: "0.9375rem" }} noWrap>
              {typeName ?? `Incidente ${index + 1}`}
            </Typography>
            <Typography variant="body2" noWrap>
              {hasErrors ? (
                <Box component="span" sx={{ color: designTokens.status.error.fg, fontWeight: 600 }}>
                  Revisa los campos
                </Box>
              ) : description ? (
                description
              ) : (
                "Sin descripción"
              )}
            </Typography>
          </Box>
        </ButtonBase>
        <Tooltip title="Quitar incidente">
          <IconButton size="small" aria-label={`Quitar incidente ${index + 1}`} onClick={onRemove}>
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>

      <Collapse in={open} id={contentId}>
        <Stack spacing={1.5} sx={{ px: 2, pb: 2.25 }}>
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
                sx={{ "& .MuiOutlinedInput-root": { bgcolor: "#FFFFFF" } }}
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
            sx={{ "& .MuiOutlinedInput-root": { bgcolor: "#FFFFFF" }, "& .MuiInputBase-inputMultiline": { resize: "vertical" } }}
            {...register(`incidentes.${index}.description`)}
          />
        </Stack>
      </Collapse>
    </Box>
  );
}
