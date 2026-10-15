import { Controller, useFieldArray, useFormContext } from "react-hook-form";
import { Box, Button, ButtonBase, Collapse, IconButton, MenuItem, Stack, TextField, Tooltip, Typography } from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AddIcon from "@mui/icons-material/AddRounded";
import RemoveIcon from "@mui/icons-material/RemoveRounded";
import ExpandMoreIcon from "@mui/icons-material/ExpandMoreRounded";
import { designTokens } from "@/theme/theme";
import type { ProductionCategoryDto } from "@/types/catalog";
import type { ActaFormValues } from "./actaFormSchema";
import { actaNumberFormatter as fmt, formatActaDate } from "./actaUi";

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
  const stepSx = {
    width: 36,
    height: 36,
    // Dedo, no cursor: en pantallas tactiles el objetivo sube a 44px (minimo de Apple/WCAG).
    "@media (pointer: coarse)": { width: 44, height: 44 },
    color: "text.primary",
    bgcolor: "#FFFFFF",
    boxShadow: "0 0 0 1px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(15, 23, 42, 0.06)",
    "@media (hover: hover) and (pointer: fine)": { "&:hover": { bgcolor: "#FFFFFF", color: designTokens.accent } },
  };
  return (
    <Stack
      direction="row"
      alignItems="center"
      gap={0.5}
      sx={{
        p: "3px",
        borderRadius: 999,
        bgcolor: hasError ? designTokens.status.error.bg : "rgba(15, 23, 42, 0.05)",
        boxShadow: hasError ? `inset 0 0 0 1px ${designTokens.status.error.fg}` : "none",
        flexShrink: 0,
      }}
    >
      <IconButton
        size="small"
        onClick={() => onChange(Math.max(0, (value ?? 0) - 1) || undefined)}
        sx={stepSx}
        aria-label="Disminuir cantidad"
      >
        <RemoveIcon fontSize="small" />
      </IconButton>
      <Box
        component="input"
        inputMode="numeric"
        value={value ?? ""}
        placeholder="0"
        aria-label="Cantidad"
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          const digits = e.target.value.replace(/\D/g, "");
          onChange(digits === "" ? undefined : Number(digits));
        }}
        sx={{
          width: 56,
          border: "none",
          outline: "none",
          bgcolor: "transparent",
          textAlign: "center",
          font: "inherit",
          fontSize: "1.0625rem",
          fontWeight: 700,
          fontVariantNumeric: "tabular-nums",
          color: "text.primary",
          "&::placeholder": { color: designTokens.textDisabled },
        }}
      />
      <IconButton size="small" onClick={() => onChange((value ?? 0) + 1)} sx={stepSx} aria-label="Aumentar cantidad">
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
  const hasErrors = !!produccionErrors;

  const usedCategoryIds = (values ?? []).map((v) => v?.categoryId).filter((id): id is number => !!id);
  const lastValue = values?.[values.length - 1];
  const canAddCategory = !lastValue || (!!lastValue.categoryId && !!lastValue.quantity && lastValue.quantity > 0);
  const contentId = `produccion-${index}-contenido`;

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
            <Typography sx={{ fontWeight: 700, color: "text.primary", fontSize: "0.9375rem" }}>
              Producción {index + 1}
            </Typography>
            <Typography variant="body2" noWrap sx={{ fontVariantNumeric: "tabular-nums" }}>
              {productionDate ? formatActaDate(productionDate) : "Sin fecha"}
              {hasErrors && (
                <Box component="span" sx={{ color: designTokens.status.error.fg, fontWeight: 600, ml: 1 }}>
                  · Revisa los campos
                </Box>
              )}
            </Typography>
          </Box>
          <Box sx={{ textAlign: "right", flexShrink: 0 }}>
            <Typography sx={{ fontWeight: 700, fontSize: "1.0625rem", color: "text.primary", fontVariantNumeric: "tabular-nums" }}>
              {fmt.format(subtotal)}
            </Typography>
            <Typography variant="caption">subtotal</Typography>
          </Box>
        </ButtonBase>
        <Tooltip title={canRemove ? "Quitar esta producción" : "El acta necesita al menos una"}>
          <span>
            <IconButton size="small" onClick={onRemove} disabled={!canRemove} aria-label={`Quitar producción ${index + 1}`}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>

      <Collapse in={open} id={contentId}>
        <Stack spacing={2} sx={{ px: 2, pb: 2.25 }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <TextField
              label="Fecha de producción"
              type="date"
              InputLabelProps={{ shrink: true }}
              error={!!produccionErrors?.productionDate}
              helperText={produccionErrors?.productionDate?.message}
              {...register(`producciones.${index}.productionDate`)}
              sx={{ flex: 1, "& .MuiOutlinedInput-root": { bgcolor: "#FFFFFF" } }}
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
                  sx={{ flex: 1, "& .MuiOutlinedInput-root": { bgcolor: "#FFFFFF" } }}
                />
              )}
            />
          </Stack>

          <Box>
            <Typography variant="caption" component="div" sx={{ mb: 1 }}>
              Categorías
            </Typography>
            {typeof produccionErrors?.values?.message === "string" && (
              <Typography variant="caption" color="error" component="div" sx={{ mb: 1 }}>
                {produccionErrors.values.message}
              </Typography>
            )}

            <Stack spacing={{ xs: 1.5, sm: 1 }}>
              {fields.map((field, valueIndex) => {
                const valueError = produccionErrors?.values?.[valueIndex];
                const currentCategoryId = values?.[valueIndex]?.categoryId;
                const availableCategorias = categorias.filter(
                  (cat) => cat.id === currentCategoryId || !usedCategoryIds.includes(cat.id)
                );
                return (
                  <Box key={field.id}>
                    <Stack direction="row" gap={1.25} alignItems="center" flexWrap={{ xs: "wrap", sm: "nowrap" }}>
                      <Controller
                        name={`producciones.${index}.values.${valueIndex}.categoryId`}
                        control={control}
                        render={({ field: catField }) => (
                          <TextField
                            select
                            aria-label="Categoría"
                            value={catField.value || ""}
                            onChange={(e) => catField.onChange(Number(e.target.value))}
                            error={!!valueError?.categoryId}
                            SelectProps={{ displayEmpty: true }}
                            sx={{ flex: 1, minWidth: { xs: "100%", sm: 180 }, "& .MuiOutlinedInput-root": { bgcolor: "#FFFFFF" } }}
                          >
                            <MenuItem value="" disabled>
                              Elige una categoría
                            </MenuItem>
                            {availableCategorias.map((cat) => (
                              <MenuItem key={cat.id} value={cat.id}>
                                {cat.name}
                              </MenuItem>
                            ))}
                          </TextField>
                        )}
                      />

                      <Controller
                        name={`producciones.${index}.values.${valueIndex}.quantity`}
                        control={control}
                        render={({ field: qtyField }) => (
                          <QuantityStepper value={qtyField.value} onChange={qtyField.onChange} hasError={!!valueError?.quantity} />
                        )}
                      />

                      <Tooltip title="Quitar categoría">
                        <Box component="span" sx={{ ml: { xs: "auto", sm: 0 } }}>
                          <IconButton
                            size="small"
                            aria-label="Quitar categoría"
                            onClick={() => remove(valueIndex)}
                            disabled={fields.length <= 1}
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Tooltip>
                    </Stack>
                    {(valueError?.categoryId?.message || valueError?.quantity?.message) && (
                      <Typography variant="caption" color="error" component="div" sx={{ mt: 0.5 }}>
                        {valueError?.categoryId?.message ?? valueError?.quantity?.message}
                      </Typography>
                    )}
                  </Box>
                );
              })}
            </Stack>

            <Tooltip title={canAddCategory ? "" : "Completa la categoría y cantidad anteriores primero"}>
              <span>
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => append({ categoryId: 0, quantity: undefined })}
                  disabled={!canAddCategory}
                  sx={{ mt: 1.25 }}
                >
                  Agregar categoría
                </Button>
              </span>
            </Tooltip>
          </Box>
        </Stack>
      </Collapse>
    </Box>
  );
}
