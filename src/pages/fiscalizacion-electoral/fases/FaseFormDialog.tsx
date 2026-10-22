import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { phaseApi } from "@/api/fiscalizacionFasesApi";
import { getApiErrorMessage } from "@/utils/apiError";
import type { FormTemplateSummary, PhaseDto } from "@/types/fiscalizacionFases";

const CODE_REGEX = /^[A-Z0-9_]+$/;

const schema = z.object({
  code: z.string().trim(),
  name: z.string().trim().min(1, "Escribe el nombre").max(150, "Máximo 150 caracteres"),
  formTemplateCode: z.string().min(1, "Elige la plantilla"),
  requiresElectionType: z.boolean(),
  displayOrder: z.number({ invalid_type_error: "Escribe un número" }).int("Sin decimales").min(0, "Mínimo 0"),
  active: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface FaseFormDialogProps {
  open: boolean;
  periodId: number;
  /** null = crear. */
  phase: PhaseDto | null;
  templates: FormTemplateSummary[];
  nextOrder: number;
  onClose: () => void;
  onSaved: (phase: PhaseDto, created: boolean) => void;
}

/** Crear o ajustar una fase. El codigo solo se elige al crear; para retirar una fase se desactiva (no hay DELETE). */
export function FaseFormDialog({ open, periodId, phase, templates, nextOrder, onClose, onSaved }: FaseFormDialogProps) {
  const isEdit = !!phase;
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { control, handleSubmit, reset, setError, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (!open) return;
    setSubmitError(null);
    reset(
      phase
        ? {
            code: phase.code,
            name: phase.name,
            formTemplateCode: phase.formTemplateCode,
            requiresElectionType: phase.requiresElectionType,
            displayOrder: phase.displayOrder,
            active: phase.active,
          }
        : { code: "", name: "", formTemplateCode: "", requiresElectionType: false, displayOrder: nextOrder, active: true }
    );
  }, [open, phase, nextOrder, reset]);

  const mutation = useMutation({
    mutationFn: (v: FormValues) =>
      phase
        ? phaseApi.actualizarFase(phase.id, {
            name: v.name,
            formTemplateCode: v.formTemplateCode,
            requiresElectionType: v.requiresElectionType,
            displayOrder: v.displayOrder,
            active: v.active,
          })
        : phaseApi.crearFase(periodId, {
            code: v.code,
            name: v.name,
            formTemplateCode: v.formTemplateCode,
            requiresElectionType: v.requiresElectionType,
            displayOrder: v.displayOrder,
          }),
    onSuccess: (saved) => onSaved(saved, !isEdit),
    onError: (error) => setSubmitError(getApiErrorMessage(error, "No se pudo guardar la fase.")),
  });

  const onSubmit = handleSubmit((v) => {
    if (!isEdit && !CODE_REGEX.test(v.code)) {
      setError("code", { message: v.code ? "Solo mayúsculas, números y _" : "Escribe el código" });
      return;
    }
    setSubmitError(null);
    mutation.mutate(v);
  });

  // Codigos de plantilla unicos (el listado puede traer varias versiones del mismo codigo).
  const templateOptions = [...new Map(templates.map((t) => [t.code, t])).values()];
  if (phase && !templateOptions.some((t) => t.code === phase.formTemplateCode)) {
    templateOptions.unshift({ code: phase.formTemplateCode, name: phase.formTemplateName ?? phase.formTemplateCode } as FormTemplateSummary);
  }

  return (
    <Dialog open={open} onClose={mutation.isPending ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? "Ajustar fase" : "Agregar fase"}</DialogTitle>
      <Box component="form" onSubmit={onSubmit} noValidate>
        <DialogContent>
          <Stack spacing={2.25}>
            {submitError && <Alert severity="error">{submitError}</Alert>}
            {isEdit ? (
              <Box>
                <Typography variant="caption" component="div">
                  Código
                </Typography>
                <Typography sx={{ fontWeight: 700, color: "text.primary", fontVariantNumeric: "tabular-nums" }}>{phase.code}</Typography>
              </Box>
            ) : (
              <Controller
                name="code"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    onChange={(e) => field.onChange(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "_"))}
                    label="Código"
                    placeholder="CAPACITACION_JEM_2"
                    fullWidth
                    error={!!errors.code}
                    helperText={errors.code?.message ?? "Mayúsculas, números y _. No se puede cambiar después."}
                  />
                )}
              />
            )}
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <TextField {...field} label="Nombre" fullWidth error={!!errors.name} helperText={errors.name?.message} />
              )}
            />
            <Controller
              name="formTemplateCode"
              control={control}
              render={({ field }) => (
                <TextField
                  select
                  label="Plantilla del informe"
                  fullWidth
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  error={!!errors.formTemplateCode}
                  helperText={errors.formTemplateCode?.message ?? "Siempre se usa la versión publicada vigente de esa plantilla."}
                >
                  {templateOptions.map((t) => (
                    <MenuItem key={t.code} value={t.code}>
                      {t.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <Controller
              name="displayOrder"
              control={control}
              render={({ field }) => (
                <TextField
                  label="Orden"
                  type="number"
                  value={Number.isFinite(field.value) ? field.value : ""}
                  onChange={(e) => field.onChange(e.target.value === "" ? Number.NaN : Number(e.target.value))}
                  inputProps={{ min: 0, step: 1 }}
                  error={!!errors.displayOrder}
                  helperText={errors.displayOrder?.message ?? "Las fases se listan de menor a mayor."}
                  sx={{ maxWidth: 200 }}
                />
              )}
            />
            <Controller
              name="requiresElectionType"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Switch checked={!!field.value} onChange={(e) => field.onChange(e.target.checked)} />}
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ color: "text.primary", fontWeight: 600 }}>
                        Pide tipo de elección
                      </Typography>
                      <Typography variant="caption">Cada actividad indicará si es presidencial, legislativa o municipal.</Typography>
                    </Box>
                  }
                  sx={{ alignItems: "flex-start", "& .MuiSwitch-root": { mt: -0.5 } }}
                />
              )}
            />
            {isEdit && (
              <Controller
                name="active"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={<Switch checked={!!field.value} onChange={(e) => field.onChange(e.target.checked)} />}
                    label={
                      <Box>
                        <Typography variant="body2" sx={{ color: "text.primary", fontWeight: 600 }}>
                          Activa
                        </Typography>
                        <Typography variant="caption">Una fase inactiva no se ofrece al crear actividades.</Typography>
                      </Box>
                    }
                    sx={{ alignItems: "flex-start", "& .MuiSwitch-root": { mt: -0.5 } }}
                  />
                )}
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} color="inherit" disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={mutation.isPending}>
            {mutation.isPending ? "Guardando…" : isEdit ? "Guardar" : "Agregar fase"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
