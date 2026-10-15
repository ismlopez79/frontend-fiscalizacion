import { useEffect, useState } from "react";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { catalogApi } from "@/api/catalogApi";
import { getApiErrorMessage } from "@/utils/apiError";
import { DUI_HELPER_TEXT, DUI_REGEX, formatDuiInput } from "@/utils/dui";
import { DELEGATE_TYPES, DELEGATE_TYPE_LABELS } from "@/types/catalog";
import type { DelegateDto } from "@/types/catalog";

const schema = z.object({
  firstName: z.string().min(1, "El nombre es obligatorio").max(100, "Máximo 100 caracteres"),
  lastName: z.string().min(1, "El apellido es obligatorio").max(100, "Máximo 100 caracteres"),
  internalCode: z.string().max(50, "Máximo 50 caracteres").optional(),
  dui: z
    .string()
    .min(1, "El DUI es obligatorio")
    .regex(DUI_REGEX, "Formato inválido, debe ser 12345678-9"),
  type: z.enum(["JVE", "RNPN", "JEFE_DUICENTRO"], { required_error: "Selecciona un tipo" }),
  active: z.boolean(),
  politicalPartyId: z.number().nullable(),
});

type FormValues = z.infer<typeof schema>;

interface DelegadoFormDialogProps {
  open: boolean;
  delegado: DelegateDto | null;
  onClose: () => void;
}

export function DelegadoFormDialog({ open, delegado, onClose }: DelegadoFormDialogProps) {
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
    defaultValues: {
      firstName: "",
      lastName: "",
      internalCode: "",
      dui: "",
      type: "JVE",
      active: true,
      politicalPartyId: null,
    },
  });

  const watchedType = useWatch({ control, name: "type" });

  const partidosQuery = useQuery({
    queryKey: ["partidos-politicos"],
    queryFn: catalogApi.getPartidosPoliticos,
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    setSubmitError(null);
    reset(
      delegado
        ? {
            firstName: delegado.firstName,
            lastName: delegado.lastName,
            internalCode: delegado.internalCode ?? "",
            dui: delegado.dui ?? "",
            type: delegado.type,
            active: delegado.active,
            politicalPartyId: delegado.politicalPartyId ?? null,
          }
        : {
            firstName: "",
            lastName: "",
            internalCode: "",
            dui: "",
            type: "JVE",
            active: true,
            politicalPartyId: null,
          }
    );
  }, [open, delegado, reset]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const body = {
        ...values,
        internalCode: values.internalCode || undefined,
        politicalPartyId: values.politicalPartyId ?? undefined,
      };
      return isEdit ? catalogApi.updateDelegado(delegado!.id, body) : catalogApi.createDelegado(body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delegados"] });
      onClose();
    },
    onError: (error) => setSubmitError(getApiErrorMessage(error, "No se pudo guardar el delegado.")),
  });

  const onSubmit = handleSubmit((values) => {
    setSubmitError(null);
    mutation.mutate(values);
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? "Editar delegado" : "Nuevo delegado"}</DialogTitle>
      <Box component="form" onSubmit={onSubmit} noValidate>
        <DialogContent>
          <Stack spacing={2.25}>
            {submitError && <Alert severity="error">{submitError}</Alert>}

            <TextField
              label="Nombre"
              fullWidth
              error={!!errors.firstName}
              helperText={errors.firstName?.message}
              {...register("firstName")}
            />

            <TextField
              label="Apellido"
              fullWidth
              error={!!errors.lastName}
              helperText={errors.lastName?.message}
              {...register("lastName")}
            />

            {isEdit && !delegado?.dui && (
              <Alert severity="warning">
                Este registro no tenía DUI capturado. Es obligatorio a partir de ahora para
                guardarlo.
              </Alert>
            )}

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
              label="Código interno (opcional)"
              fullWidth
              placeholder="JVE-04"
              {...register("internalCode")}
            />

            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <TextField
                  select
                  label="Tipo de delegado"
                  fullWidth
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  error={!!errors.type}
                  helperText={errors.type?.message}
                >
                  {DELEGATE_TYPES.map((type) => (
                    <MenuItem key={type} value={type}>
                      {DELEGATE_TYPE_LABELS[type]}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />

            {watchedType === "JVE" && (
              <>
                {isEdit && delegado && !delegado.politicalPartyId && (
                  <Alert severity="warning">
                    Este delegado no tenía partido político capturado. Es obligatorio a partir de
                    ahora para guardarlo.
                  </Alert>
                )}

                <Controller
                  name="politicalPartyId"
                  control={control}
                  rules={{
                    validate: (value) => (isEdit && !value ? "Selecciona un partido político" : true),
                  }}
                  render={({ field, fieldState }) => (
                    <TextField
                      select
                      label={isEdit ? "Partido político" : "Partido político (opcional)"}
                      fullWidth
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                    >
                      <MenuItem value="">{isEdit ? "Selecciona un partido" : "Sin asignar"}</MenuItem>
                      {(partidosQuery.data ?? []).map((p) => (
                        <MenuItem key={p.id} value={p.id}>
                          {p.code} · {p.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </>
            )}

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
        <DialogActions>
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
