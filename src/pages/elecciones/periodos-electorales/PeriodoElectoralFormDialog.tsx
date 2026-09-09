import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from "@mui/material";
import { electoralPeriodApi } from "@/api/electoralApi";
import { getApiErrorMessage } from "@/utils/apiError";
import type { ElectoralPeriodDto } from "@/types/electoral";

const schema = z
  .object({
    name: z.string().min(1, "El nombre es obligatorio"),
    code: z
      .string()
      .min(1, "El código es obligatorio")
      .max(20, "Máximo 20 caracteres")
      .regex(/^\S+$/, "Sin espacios — se usa como prefijo del número de formulario"),
    startDate: z.string().min(1, "La fecha de inicio es obligatoria"),
    endDate: z.string().min(1, "La fecha de fin es obligatoria"),
  })
  .refine((v) => !v.startDate || !v.endDate || v.startDate <= v.endDate, {
    message: "La fecha de fin no puede ser anterior a la de inicio",
    path: ["endDate"],
  });

type FormValues = z.infer<typeof schema>;

interface PeriodoElectoralFormDialogProps {
  open: boolean;
  periodo: ElectoralPeriodDto | null;
  onClose: () => void;
}

export function PeriodoElectoralFormDialog({ open, periodo, onClose }: PeriodoElectoralFormDialogProps) {
  const queryClient = useQueryClient();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isEdit = !!periodo;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", code: "", startDate: "", endDate: "" },
  });

  useEffect(() => {
    if (!open) return;
    setSubmitError(null);
    reset(
      periodo
        ? { name: periodo.name, code: periodo.code, startDate: periodo.startDate, endDate: periodo.endDate }
        : { name: "", code: "", startDate: "", endDate: "" }
    );
  }, [open, periodo, reset]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      isEdit ? electoralPeriodApi.updatePeriodo(periodo!.id, values) : electoralPeriodApi.createPeriodo(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["periodos-electorales"] });
      onClose();
    },
    onError: (error) => setSubmitError(getApiErrorMessage(error, "No se pudo guardar el período.")),
  });

  const onSubmit = handleSubmit((values) => {
    setSubmitError(null);
    mutation.mutate(values);
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? "Editar período electoral" : "Nuevo período electoral"}</DialogTitle>
      <Box component="form" onSubmit={onSubmit} noValidate>
        <DialogContent>
          <Stack spacing={2.25}>
            {submitError && <Alert severity="error">{submitError}</Alert>}

            <TextField
              label="Nombre"
              fullWidth
              placeholder="Elecciones Legislativas 2027"
              error={!!errors.name}
              helperText={errors.name?.message}
              {...register("name")}
            />

            <TextField
              label="Código"
              fullWidth
              placeholder="EL2027"
              disabled={isEdit}
              error={!!errors.code}
              helperText={
                errors.code?.message ??
                (isEdit
                  ? "El código no se puede cambiar una vez creado."
                  : "Único — se usa como prefijo del número de formulario (EL2027.0001...).")
              }
              {...register("code")}
            />

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Fecha de inicio"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                error={!!errors.startDate}
                helperText={errors.startDate?.message}
                {...register("startDate")}
              />
              <TextField
                label="Fecha de fin"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                error={!!errors.endDate}
                helperText={errors.endDate?.message}
                {...register("endDate")}
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} color="inherit" disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={mutation.isPending}>
            {isEdit ? "Guardar cambios" : "Crear período"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
