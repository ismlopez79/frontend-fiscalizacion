import { Controller, useFieldArray, useFormContext } from "react-hook-form";
import {
  Box,
  Collapse,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AddIcon from "@mui/icons-material/AddRounded";
import RemoveIcon from "@mui/icons-material/RemoveRounded";
import ExpandMoreIcon from "@mui/icons-material/ExpandMoreRounded";
import { numericDataSx } from "@/theme/theme";
import type { ProductionCategoryDto } from "@/types/catalog";
import type { ActaFormValues } from "./actaFormSchema";

interface ProduccionRowProps {
  index: number;
  categorias: ProductionCategoryDto[];
  onRemove: () => void;
  canRemove: boolean;
  open: boolean;
  onToggle: () => void;
}

/**
 * Stepper de cantidad: +/- alrededor de un input numerico centrado. Es solo
 * presentacion — sigue siendo el mismo campo `quantity` del form, con el
 * mismo registro/validacion de siempre (obligatorio, entero, mayor a 0).
 * `value` puede venir undefined (fila recien agregada, todavia sin tocar) —
 * en ese caso el input se muestra vacio en vez de forzar un "0" que el
 * digitador tendria que borrar primero.
 */
function QuantityStepper({
  value,
  onChange,
  hasError,
}: {
  value: number | undefined;
  onChange: (next: number | undefined) => void;
  hasError?: boolean;
}) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      sx={{
        border: "1px solid",
        borderColor: hasError ? "error.main" : "divider",
        borderRadius: "10px",
        height: 40,
        overflow: "hidden",
        bgcolor: "background.paper",
      }}
    >
      <IconButton
        size="small"
        onClick={() => onChange(Math.max(0, (value ?? 0) - 1) || undefined)}
        sx={{ borderRadius: 0, px: 1.25, color: "text.secondary" }}
        aria-label="Disminuir cantidad"
      >
        <RemoveIcon fontSize="small" />
      </IconButton>
      <TextField
        variant="standard"
        value={value ?? ""}
        placeholder="0"
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "");
          onChange(digits === "" ? undefined : Number(digits));
        }}
        InputProps={{ disableUnderline: true }}
        inputProps={{ style: { textAlign: "center", ...numericDataSx }, "aria-label": "Cantidad" }}
        sx={{ width: 52 }}
      />
      <IconButton
        size="small"
        onClick={() => onChange((value ?? 0) + 1)}
        sx={{ borderRadius: 0, px: 1.25, color: "text.secondary" }}
        aria-label="Aumentar cantidad"
      >
        <AddIcon fontSize="small" />
      </IconButton>
    </Stack>
  );
}

/**
 * Una fila de "produccion" del acta (normalmente un dia): fecha + total
 * declarado a mano + su propia lista de valores por categoria. El total
 * calculado NUNCA se manda al backend — solo se muestra como vista previa
 * para que el digitador vea si coincide con lo que escribio en el papel
 * antes de enviar (el backend es quien decide hasDiscrepancy de verdad).
 *
 * Comportamiento de acordeon: `open`/`onToggle` los controla ActaFormPage
 * (un solo indice abierto a la vez) — al agregar una produccion nueva, la
 * anterior se colapsa sola para no acumular scroll vertical; el subtotal
 * sigue visible en el encabezado aunque este colapsada.
 */
export function ProduccionRow({ index, categorias, onRemove, canRemove, open, onToggle }: ProduccionRowProps) {
  const {
    control,
    register,
    watch,
    formState: { errors },
  } = useFormContext<ActaFormValues>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: `producciones.${index}.values`,
  });

  const values = watch(`producciones.${index}.values`);
  const productionDate = watch(`producciones.${index}.productionDate`);
  const subtotal = (values ?? []).reduce((sum, v) => sum + (Number(v?.quantity) || 0), 0);

  const produccionErrors = errors.producciones?.[index];

  const usedCategoryIds = (values ?? []).map((v) => v?.categoryId).filter((id): id is number => !!id);
  const lastValue = values?.[values.length - 1];
  const canAddCategory = !lastValue || (!!lastValue.categoryId && !!lastValue.quantity && lastValue.quantity > 0);

  return (
    <Paper variant="outlined" sx={{ overflow: "hidden" }}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        onClick={onToggle}
        sx={{ p: 2, cursor: "pointer", "&:hover": { bgcolor: "action.hover" } }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              width: 22,
              height: 22,
              borderRadius: "7px",
              bgcolor: "primary.main",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.6875rem",
              fontWeight: 800,
              flexShrink: 0,
            }}
          >
            {index + 1}
          </Box>
          <Typography variant="h4">Producción {index + 1}</Typography>
          {!open && (
            <Typography variant="body2" color="text.secondary">
              {productionDate || "sin fecha"} · subtotal:{" "}
              <Box component="span" sx={numericDataSx}>
                {subtotal}
              </Box>
            </Typography>
          )}
        </Stack>
        <Stack direction="row" spacing={0.5} alignItems="center" onClick={(e) => e.stopPropagation()}>
          <Tooltip title={canRemove ? "Quitar esta producción" : "El acta necesita al menos una"}>
            <span>
              <IconButton size="small" onClick={onRemove} disabled={!canRemove}>
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <IconButton size="small" onClick={onToggle} aria-label={open ? "Colapsar producción" : "Expandir producción"}>
            <ExpandMoreIcon
              fontSize="small"
              sx={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}
            />
          </IconButton>
        </Stack>
      </Stack>

      <Collapse in={open}>
        <Stack spacing={2} sx={{ p: 2.5, pt: 0 }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label="Fecha de producción"
              type="date"
              InputLabelProps={{ shrink: true }}
              error={!!produccionErrors?.productionDate}
              helperText={produccionErrors?.productionDate?.message}
              {...register(`producciones.${index}.productionDate`)}
              sx={{ flex: 1 }}
            />
            <Controller
              name={`producciones.${index}.declaredTotal`}
              control={control}
              render={({ field }) => (
                <TextField
                  label="Total declarado (opcional)"
                  type="number"
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                  helperText="Lo que dice el papel a mano, si aplica."
                  sx={{ flex: 1 }}
                />
              )}
            />
          </Stack>

          <Stack spacing={1.25}>
            {typeof produccionErrors?.values?.message === "string" && (
              <Typography variant="caption" color="error">
                {produccionErrors.values.message}
              </Typography>
            )}

            {fields.map((field, valueIndex) => {
              const valueError = produccionErrors?.values?.[valueIndex];
              const currentCategoryId = values?.[valueIndex]?.categoryId;
              const availableCategorias = categorias.filter(
                (cat) => cat.id === currentCategoryId || !usedCategoryIds.includes(cat.id)
              );
              return (
                <Stack key={field.id} direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }}>
                  <Controller
                    name={`producciones.${index}.values.${valueIndex}.categoryId`}
                    control={control}
                    render={({ field: catField }) => (
                      <TextField
                        select
                        label="Categoría"
                        value={catField.value || ""}
                        onChange={(e) => catField.onChange(Number(e.target.value))}
                        error={!!valueError?.categoryId}
                        helperText={valueError?.categoryId?.message}
                        sx={{ flex: 1.5, minWidth: 180 }}
                      >
                        <MenuItem value="" disabled>
                          Selecciona
                        </MenuItem>
                        {availableCategorias.map((cat) => (
                          <MenuItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </MenuItem>
                        ))}
                      </TextField>
                    )}
                  />

                  <Stack spacing={0.5}>
                    <Controller
                      name={`producciones.${index}.values.${valueIndex}.quantity`}
                      control={control}
                      render={({ field: qtyField }) => (
                        <QuantityStepper
                          value={qtyField.value}
                          onChange={qtyField.onChange}
                          hasError={!!valueError?.quantity}
                        />
                      )}
                    />
                    {valueError?.quantity?.message && (
                      <Typography variant="caption" color="error">
                        {valueError.quantity.message}
                      </Typography>
                    )}
                  </Stack>

                  <Tooltip title="Quitar categoría">
                    <span>
                      <IconButton
                        size="small"
                        onClick={() => remove(valueIndex)}
                        disabled={fields.length <= 1}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Stack>
              );
            })}

            <Box>
              <Tooltip title={canAddCategory ? "" : "Completa la categoría y cantidad anteriores primero"}>
                <span>
                  <IconButton
                    size="small"
                    onClick={() => append({ categoryId: 0, quantity: undefined })}
                    disabled={!canAddCategory}
                    sx={{ border: "1px dashed", borderColor: "divider" }}
                  >
                    <AddIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                Agregar categoría
              </Typography>
            </Box>
          </Stack>

          <Typography variant="body2" color="text.secondary">
            Vista previa del total (el backend siempre recalcula):{" "}
            <Box component="span" sx={numericDataSx}>
              {subtotal}
            </Box>
          </Typography>
        </Stack>
      </Collapse>
    </Paper>
  );
}
