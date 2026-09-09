import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
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
import { serviceCenterApi } from "@/api/electoralApi";
import { getApiErrorMessage } from "@/utils/apiError";
import type { ElectoralPeriodDto, ServiceCenterDto } from "@/types/electoral";

const schema = z.object({
  code: z.string().min(1, "El código es obligatorio").max(20, "Máximo 20 caracteres"),
  name: z.string().min(1, "El nombre es obligatorio"),
  departmentId: z.number({ invalid_type_error: "Selecciona un departamento" }).min(1, "Selecciona un departamento"),
  address: z.string().optional(),
  electoralPeriodId: z.number({ invalid_type_error: "Selecciona un período" }).min(1, "Selecciona un período"),
  active: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface CentroServicioFormDialogProps {
  open: boolean;
  centro: ServiceCenterDto | null;
  periodos: ElectoralPeriodDto[];
  defaultElectoralPeriodId?: number;
  onClose: () => void;
}

export function CentroServicioFormDialog({
  open,
  centro,
  periodos,
  defaultElectoralPeriodId,
  onClose,
}: CentroServicioFormDialogProps) {
  const queryClient = useQueryClient();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isEdit = !!centro;

  const departamentosQuery = useQuery({
    queryKey: ["departamentos", "activos"],
    queryFn: catalogApi.getDepartamentos,
    enabled: open,
  });

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { code: "", name: "", departmentId: 0, address: "", electoralPeriodId: 0, active: true },
  });

  useEffect(() => {
    if (!open) return;
    setSubmitError(null);
    reset(
      centro
        ? {
            code: centro.code,
            name: centro.name,
            departmentId: centro.departmentId,
            address: centro.address ?? "",
            electoralPeriodId: centro.electoralPeriodId,
            active: centro.active,
          }
        : {
            code: "",
            name: "",
            departmentId: 0,
            address: "",
            electoralPeriodId: defaultElectoralPeriodId ?? 0,
            active: true,
          }
    );
  }, [open, centro, defaultElectoralPeriodId, reset]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const body = { ...values, address: values.address || undefined };
      return isEdit ? serviceCenterApi.updateCentro(centro!.id, body) : serviceCenterApi.createCentro(body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["centros-servicio"] });
      onClose();
    },
    onError: (error) => setSubmitError(getApiErrorMessage(error, "No se pudo guardar el centro de servicio.")),
  });

  const onSubmit = handleSubmit((values) => {
    setSubmitError(null);
    mutation.mutate(values);
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? "Editar centro de servicio" : "Nuevo centro de servicio"}</DialogTitle>
      <Box component="form" onSubmit={onSubmit} noValidate>
        <DialogContent>
          <Stack spacing={2.25}>
            {submitError && <Alert severity="error">{submitError}</Alert>}

            <TextField
              label="Código"
              fullWidth
              placeholder="JRV-045"
              error={!!errors.code}
              helperText={errors.code?.message}
              {...register("code")}
            />

            <TextField
              label="Nombre"
              fullWidth
              placeholder="Centro Escolar República de Panamá"
              error={!!errors.name}
              helperText={errors.name?.message}
              {...register("name")}
            />

            <Controller
              name="departmentId"
              control={control}
              render={({ field }) => (
                <TextField
                  select
                  label="Departamento"
                  fullWidth
                  value={field.value || ""}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                  error={!!errors.departmentId}
                  helperText={errors.departmentId?.message}
                >
                  <MenuItem value="" disabled>
                    Selecciona un departamento
                  </MenuItem>
                  {(departamentosQuery.data ?? []).map((dep) => (
                    <MenuItem key={dep.id} value={dep.id}>
                      {dep.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />

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

            <TextField label="Dirección (opcional)" fullWidth multiline minRows={2} {...register("address")} />

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
            {isEdit ? "Guardar cambios" : "Crear centro"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
