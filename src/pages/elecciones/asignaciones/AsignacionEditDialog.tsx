import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, Autocomplete, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from "@mui/material";
import { assignmentApi } from "@/api/electoralApi";
import { getApiErrorMessage } from "@/utils/apiError";
import type { AssignmentDto, ServiceCenterDto } from "@/types/electoral";

const schema = z.object({
  serviceCenterId: z.number({ invalid_type_error: "Selecciona un centro" }).min(1, "Selecciona un centro"),
  assignmentDate: z.string().min(1, "La fecha es obligatoria"),
});

type FormValues = z.infer<typeof schema>;

interface AsignacionEditDialogProps {
  open: boolean;
  asignacion: AssignmentDto | null;
  centros: ServiceCenterDto[];
  onClose: () => void;
}

/**
 * PUT /asignaciones/{id} — corrige centro y/o fecha de una fila existente,
 * sin tocar al delegado (para eso sigue siendo desactivar + crear, ver
 * AsignacionesPage). Distinto del flujo de creacion: aqui no hay picker de
 * delegado ni de tipo, solo los dos campos que el backend permite corregir.
 */
export function AsignacionEditDialog({ open, asignacion, centros, onClose }: AsignacionEditDialogProps) {
  const queryClient = useQueryClient();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { serviceCenterId: 0, assignmentDate: "" },
  });

  useEffect(() => {
    if (!open) return;
    setSubmitError(null);
    reset({
      serviceCenterId: asignacion?.serviceCenterId ?? 0,
      assignmentDate: asignacion?.assignmentDate ?? "",
    });
  }, [open, asignacion, reset]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      if (!asignacion) throw new Error("Asignación no definida");
      return assignmentApi.actualizarAsignacion(asignacion.id, values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asignaciones"] });
      onClose();
    },
    onError: (error) => setSubmitError(getApiErrorMessage(error, "No se pudo actualizar la asignación.")),
  });

  const onSubmit = handleSubmit((values) => {
    setSubmitError(null);
    mutation.mutate(values);
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Editar asignación</DialogTitle>
      <Box component="form" onSubmit={onSubmit} noValidate>
        <DialogContent>
          <Stack spacing={2.25}>
            {submitError && <Alert severity="error">{submitError}</Alert>}

            {asignacion && (
              <Alert severity="info">
                Delegado: <strong>{asignacion.delegateName}</strong>. Para asignarle otro delegado,
                elimina esta fila y crea una nueva — aquí solo se corrige centro y fecha.
              </Alert>
            )}

            <Controller
              name="serviceCenterId"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  options={centros}
                  getOptionLabel={(c) => `${c.code} — ${c.name}`}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  value={centros.find((c) => c.id === field.value) ?? null}
                  onChange={(_, selected) => field.onChange(selected?.id ?? 0)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Centro de servicio"
                      placeholder="Busca por código o nombre"
                      error={!!errors.serviceCenterId}
                      helperText={errors.serviceCenterId?.message}
                    />
                  )}
                />
              )}
            />

            <Controller
              name="assignmentDate"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Fecha"
                  type="date"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  error={!!errors.assignmentDate}
                  helperText={errors.assignmentDate?.message}
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
            Guardar cambios
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
