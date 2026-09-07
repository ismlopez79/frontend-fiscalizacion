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
import type { ProductionCategoryDto } from "@/types/catalog";

const schema = z.object({
  code: z.string().min(1, "El código es obligatorio"),
  name: z.string().min(1, "El nombre es obligatorio"),
  description: z.string().optional(),
  displayOrder: z.number({ invalid_type_error: "Debe ser un número" }).int().min(0, "Debe ser 0 o mayor"),
  active: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface CategoriaFormDialogProps {
  open: boolean;
  categoria: ProductionCategoryDto | null;
  onClose: () => void;
}

export function CategoriaFormDialog({ open, categoria, onClose }: CategoriaFormDialogProps) {
  const queryClient = useQueryClient();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isEdit = !!categoria;

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
      categoria
        ? {
            code: categoria.code,
            name: categoria.name,
            description: categoria.description ?? "",
            displayOrder: categoria.displayOrder,
            active: categoria.active,
          }
        : { code: "", name: "", description: "", displayOrder: 0, active: true }
    );
  }, [open, categoria, reset]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const body = { ...values, description: values.description || undefined };
      return isEdit ? catalogApi.updateCategoria(categoria!.id, body) : catalogApi.createCategoria(body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categorias"] });
      onClose();
    },
    onError: (error) => setSubmitError(getApiErrorMessage(error, "No se pudo guardar la categoría.")),
  });

  const onSubmit = handleSubmit((values) => {
    setSubmitError(null);
    mutation.mutate(values);
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? "Editar categoría" : "Nueva categoría"}</DialogTitle>
      <Box component="form" onSubmit={onSubmit} noValidate>
        <DialogContent>
          <Stack spacing={2.25}>
            {submitError && <Alert severity="error">{submitError}</Alert>}

            <TextField
              label="Código"
              fullWidth
              placeholder="PRIMERA_VEZ"
              error={!!errors.code}
              helperText={errors.code?.message}
              {...register("code")}
            />

            <TextField
              label="Nombre"
              fullWidth
              placeholder="Primera vez"
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
            {isEdit ? "Guardar cambios" : "Crear categoría"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
