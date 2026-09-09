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
import { temporaryDelegateApi } from "@/api/electoralApi";
import { getApiErrorMessage } from "@/utils/apiError";
import { DUI_HELPER_TEXT, DUI_REGEX, formatDuiInput } from "@/utils/dui";
import type { ElectoralPeriodDto, TemporaryDelegateDto } from "@/types/electoral";

const schema = z.object({
  fullName: z.string().min(1, "El nombre completo es obligatorio"),
  dui: z.string().min(1, "El DUI es obligatorio").regex(DUI_REGEX, "Formato inválido, debe ser 12345678-9"),
  email: z.union([z.literal(""), z.string().email("Correo inválido")]),
  username: z.string().optional(),
  electoralPeriodId: z.number({ invalid_type_error: "Selecciona un período" }).min(1, "Selecciona un período"),
  active: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface DelegadoTemporalFormDialogProps {
  open: boolean;
  delegado: TemporaryDelegateDto | null;
  periodos: ElectoralPeriodDto[];
  defaultElectoralPeriodId?: number;
  onClose: () => void;
  /** Se llama tras crear (no editar) un delegado nuevo, para ofrecer restablecer su contraseña de una vez. */
  onCreated?: (delegado: TemporaryDelegateDto) => void;
}

export function DelegadoTemporalFormDialog({
  open,
  delegado,
  periodos,
  defaultElectoralPeriodId,
  onClose,
  onCreated,
}: DelegadoTemporalFormDialogProps) {
  const queryClient = useQueryClient();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isEdit = !!delegado;

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: "", dui: "", email: "", username: "", electoralPeriodId: 0, active: true },
  });

  useEffect(() => {
    if (!open) return;
    setSubmitError(null);
    reset(
      delegado
        ? {
            fullName: delegado.fullName,
            dui: delegado.dui,
            email: delegado.email ?? "",
            username: delegado.username,
            electoralPeriodId: delegado.electoralPeriodId,
            active: delegado.active,
          }
        : {
            fullName: "",
            dui: "",
            email: "",
            username: "",
            electoralPeriodId: defaultElectoralPeriodId ?? 0,
            active: true,
          }
    );
  }, [open, delegado, defaultElectoralPeriodId, reset]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const email = values.email || undefined;
      if (isEdit) {
        return temporaryDelegateApi.updateDelegadoTemporal(delegado!.id, {
          fullName: values.fullName,
          dui: values.dui,
          email,
          electoralPeriodId: values.electoralPeriodId,
          active: values.active,
        });
      }
      return temporaryDelegateApi.createDelegadoTemporal({
        fullName: values.fullName,
        dui: values.dui,
        email,
        username: values.username || undefined,
        electoralPeriodId: values.electoralPeriodId,
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["delegados-temporales"] });
      onClose();
      if (!isEdit) onCreated?.(data);
    },
    onError: (error) => setSubmitError(getApiErrorMessage(error, "No se pudo guardar el delegado temporal.")),
  });

  const onSubmit = handleSubmit((values) => {
    setSubmitError(null);
    mutation.mutate(values);
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? "Editar delegado temporal" : "Nuevo delegado temporal"}</DialogTitle>
      <Box component="form" onSubmit={onSubmit} noValidate>
        <DialogContent>
          <Stack spacing={2.25}>
            {submitError && <Alert severity="error">{submitError}</Alert>}

            {!isEdit && (
              <Alert severity="info">
                La contraseña se genera automáticamente. Al guardar, te ofrecemos restablecerla de
                una vez para obtenerla — el alta por sí sola no la muestra.
              </Alert>
            )}

            <TextField
              label="Nombre completo"
              fullWidth
              error={!!errors.fullName}
              helperText={errors.fullName?.message}
              {...register("fullName")}
            />

            <Controller
              name="dui"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="DUI"
                  fullWidth
                  placeholder="12345678-9"
                  onChange={(e) => field.onChange(formatDuiInput(e.target.value))}
                  error={!!errors.dui}
                  helperText={errors.dui?.message ?? DUI_HELPER_TEXT}
                />
              )}
            />

            <TextField
              label="Correo (opcional)"
              fullWidth
              error={!!errors.email}
              helperText={errors.email?.message}
              {...register("email")}
            />

            {!isEdit && (
              <TextField
                label="Usuario (opcional)"
                fullWidth
                helperText="Si lo dejas vacío, se genera a partir del DUI."
                {...register("username")}
              />
            )}

            <Controller
              name="electoralPeriodId"
              control={control}
              render={({ field }) => (
                <TextField
                  select
                  label="Período electoral"
                  fullWidth
                  value={field.value || ""}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                  error={!!errors.electoralPeriodId}
                  helperText={errors.electoralPeriodId?.message}
                >
                  <MenuItem value="" disabled>
                    Selecciona un período
                  </MenuItem>
                  {periodos.map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.name} {p.active ? "· activo" : ""}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />

            {isEdit && (
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
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} color="inherit" disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={mutation.isPending}>
            {isEdit ? "Guardar cambios" : "Crear delegado"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
