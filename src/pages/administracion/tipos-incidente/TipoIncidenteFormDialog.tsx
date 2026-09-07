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
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { catalogApi } from "@/api/catalogApi";
import { getApiErrorMessage } from "@/utils/apiError";
import type { IncidentTypeDto } from "@/types/catalog";

const schema = z.object({
  code: z.string().min(1, "El código es obligatorio"),
  name: z.string().min(1, "El nombre es obligatorio"),
  description: z.string().optional(),
  displayOrder: z.number({ invalid_type_error: "Debe ser un número" }).int().min(0, "Debe ser 0 o mayor"),
  active: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface TipoIncidenteFormDialogProps {
  open: boolean;
  tipoIncidente: IncidentTypeDto | null;
  onClose: () => void;
}

export function TipoIncidenteFormDialog({ open, tipoIncidente, onClose }: TipoIncidenteFormDialogProps) {
  const queryClient = useQueryClient();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isEdit = !!tipoIncidente;

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { code: "", name: "", description: "", displayOrder: 0, active: true },
  });

  useEffect(() => {
    if (!open) return;
    setSubmitError(null);
    reset(
      tipoIncidente
        ? {
            code: tipoIncidente.code,
            name: tipoIncidente.name,
            description: tipoIncidente.description ?? "",
            displayOrder: tipoIncidente.displayOrder,
            active: tipoIncidente.active,
          }
        : { code: "", name: "", description: "", displayOrder: 0, active: true }
    );
  }, [open, tipoIncidente, reset]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const body = { ...values, description: values.description || undefined };
      return isEdit
        ? catalogApi.updateTipoIncidente(tipoIncidente!.id, body)
        : catalogApi.createTipoIncidente(body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tipos-incidente"] });
      onClose();
    },
    onError: (error) => setSubmitError(getApiErrorMessage(error, "No se pudo guardar el tipo de incidente.")),
  });

  const onSubmit = handleSubmit((values) => {
    setSubmitError(null);
    mutation.mutate(values);
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? "Editar tipo de incidente" : "Nuevo tipo de incidente"}</DialogTitle>
      <Box component="form" onSubmit={onSubmit} noValidate>
        <DialogContent>
          <Stack spacing={2.25}>
            {submitError && <Alert severity="error">{submitError}</Alert>}

            <TextField
              label="Código"
              fullWidth
              placeholder="ACCESO_DENEGADO"
              error={!!errors.code}
              helperText={errors.code?.message}
              {...register("code")}
            />

            <TextField
              label="Nombre"
              fullWidth
              placeholder="Acceso denegado al duicentro"
              error={!!errors.name}
              helperText={errors.name?.message}
              {...register("name")}
            />

            <TextField
              label="Descripción (opcional)"
              fullWidth
              multiline
              minRows={2}
              {...register("description")}
            />

            <Controller
              name="displayOrder"
              control={control}
              render={({ field }) => (
                <TextField
                  label="Orden de despliegue"
                  type="number"
                  fullWidth
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
                  error={!!errors.displayOrder}
                  helperText={errors.displayOrder?.message ?? "Controla el orden en el formulario de actas."}
                />
              )}
            />

            <Controller
              name="active"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Switch checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />}
                  label={<Typography variant="body2">{field.value ? "Activo" : "Inactivo"}</Typography>}
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
            {isEdit ? "Guardar cambios" : "Crear tipo de incidente"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
