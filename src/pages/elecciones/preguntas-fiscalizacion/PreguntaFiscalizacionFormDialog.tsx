import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { fiscalizationQuestionApi } from "@/api/electoralApi";
import { getApiErrorMessage } from "@/utils/apiError";
import { FISCALIZATION_ANSWER_TYPES, FISCALIZATION_ANSWER_TYPE_LABELS } from "@/types/electoral";
import type { FiscalizationQuestionDto } from "@/types/electoral";

const schema = z.object({
  code: z.string().min(1, "El código es obligatorio").max(40, "Máximo 40 caracteres"),
  text: z.string().min(1, "La pregunta es obligatoria"),
  answerType: z.enum(["SI_NO", "SI_NO_PARCIAL", "TEXTO_LIBRE"], { required_error: "Selecciona un tipo de respuesta" }),
  displayOrder: z.number({ invalid_type_error: "Requerido" }).min(0, "Debe ser 0 o mayor"),
  active: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface PreguntaFiscalizacionFormDialogProps {
  open: boolean;
  pregunta: FiscalizationQuestionDto | null;
  onClose: () => void;
}

export function PreguntaFiscalizacionFormDialog({ open, pregunta, onClose }: PreguntaFiscalizacionFormDialogProps) {
  const queryClient = useQueryClient();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isEdit = !!pregunta;

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { code: "", text: "", answerType: "SI_NO", displayOrder: 1, active: true },
  });

  useEffect(() => {
    if (!open) return;
    setSubmitError(null);
    reset(
      pregunta
        ? {
            code: pregunta.code,
            text: pregunta.text,
            answerType: pregunta.answerType,
            displayOrder: pregunta.displayOrder,
            active: pregunta.active,
          }
        : { code: "", text: "", answerType: "SI_NO", displayOrder: 1, active: true }
    );
  }, [open, pregunta, reset]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      isEdit
        ? fiscalizationQuestionApi.updatePregunta(pregunta!.id, values)
        : fiscalizationQuestionApi.createPregunta(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["preguntas-fiscalizacion"] });
      onClose();
    },
    onError: (error) => setSubmitError(getApiErrorMessage(error, "No se pudo guardar la pregunta.")),
  });

  const onSubmit = handleSubmit((values) => {
    setSubmitError(null);
    mutation.mutate(values);
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? "Editar pregunta" : "Nueva pregunta"}</DialogTitle>
      <Box component="form" onSubmit={onSubmit} noValidate>
        <DialogContent>
          <Stack spacing={2.25}>
            {submitError && <Alert severity="error">{submitError}</Alert>}

            <TextField
              label="Código"
              fullWidth
              placeholder="APERTURA_PUNTUAL"
              error={!!errors.code}
              helperText={errors.code?.message}
              {...register("code")}
            />

            <TextField
              label="Pregunta"
              fullWidth
              multiline
              minRows={2}
              placeholder="¿El centro abrió a la hora establecida?"
              error={!!errors.text}
              helperText={errors.text?.message}
              {...register("text")}
            />

            <Controller
              name="answerType"
              control={control}
              render={({ field }) => (
                <TextField
                  select
                  label="Tipo de respuesta"
                  fullWidth
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  error={!!errors.answerType}
                  helperText={errors.answerType?.message}
                >
                  {FISCALIZATION_ANSWER_TYPES.map((type) => (
                    <MenuItem key={type} value={type}>
                      {FISCALIZATION_ANSWER_TYPE_LABELS[type]}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />

            <TextField
              label="Orden de aparición"
              type="number"
              fullWidth
              error={!!errors.displayOrder}
              helperText={errors.displayOrder?.message}
              {...register("displayOrder", { valueAsNumber: true })}
            />

            <Controller
              name="active"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Switch checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />}
                  label={<Typography variant="body2">{field.value ? "Activa" : "Inactiva"}</Typography>}
                />
              )}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} color="inherit" disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={mutation.isPending}>
            {isEdit ? "Guardar cambios" : "Crear pregunta"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
