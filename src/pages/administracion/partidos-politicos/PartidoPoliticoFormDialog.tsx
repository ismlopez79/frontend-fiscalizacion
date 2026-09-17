import { useEffect } from "react";
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
import { useState } from "react";
import { catalogApi } from "@/api/catalogApi";
import { getApiErrorMessage } from "@/utils/apiError";
import type { PoliticalPartyDto } from "@/types/catalog";

const schema = z.object({
  code: z.string().min(1, "El código es obligatorio").max(20, "Máximo 20 caracteres"),
  name: z.string().min(1, "El nombre es obligatorio"),
  active: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface PartidoPoliticoFormDialogProps {
  open: boolean;
  partido: PoliticalPartyDto | null;
  onClose: () => void;
}

export function PartidoPoliticoFormDialog({ open, partido, onClose }: PartidoPoliticoFormDialogProps) {
  const queryClient = useQueryClient();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isEdit = !!partido;

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { code: "", name: "", active: true },
  });

  useEffect(() => {
    if (!open) return;
    setSubmitError(null);
    reset(partido ? { code: partido.code, name: partido.name, active: partido.active } : { code: "", name: "", active: true });
  }, [open, partido, reset]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      isEdit ? catalogApi.updatePartidoPolitico(partido!.id, values) : catalogApi.createPartidoPolitico(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partidos-politicos"] });
      onClose();
    },
    onError: (error) => setSubmitError(getApiErrorMessage(error, "No se pudo guardar el partido político.")),
  });

  const onSubmit = handleSubmit((values) => {
    setSubmitError(null);
    mutation.mutate(values);
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{isEdit ? "Editar partido político" : "Nuevo partido político"}</DialogTitle>
      <Box component="form" onSubmit={onSubmit} noValidate>
        <DialogContent>
          <Stack spacing={2.25}>
            {submitError && <Alert severity="error">{submitError}</Alert>}

            <TextField
              label="Código"
              fullWidth
              placeholder="ARENA"
              error={!!errors.code}
              helperText={errors.code?.message}
              {...register("code")}
            />

            <TextField
              label="Nombre"
              fullWidth
              placeholder="Alianza Republicana Nacionalista"
              error={!!errors.name}
              helperText={errors.name?.message}
              {...register("name")}
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
            {isEdit ? "Guardar cambios" : "Crear partido"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
