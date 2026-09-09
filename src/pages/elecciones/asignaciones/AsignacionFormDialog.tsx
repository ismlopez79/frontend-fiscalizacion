import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Radio,
  RadioGroup,
  Stack,
  TextField,
} from "@mui/material";
import { assignmentApi } from "@/api/electoralApi";
import { userApi } from "@/api/userApi";
import { getApiErrorMessage } from "@/utils/apiError";
import { DIGITADOR_ROLE_NAME } from "@/types/user";
import type { UserDto } from "@/types/user";
import type { ServiceCenterDto, TemporaryDelegateDto } from "@/types/electoral";

const schema = z.object({
  serviceCenterId: z.number({ invalid_type_error: "Selecciona un centro" }).min(1, "Selecciona un centro"),
  delegateType: z.enum(["TEMPORARY", "PERMANENT"]),
  delegateId: z.number({ invalid_type_error: "Selecciona un delegado" }).min(1, "Selecciona un delegado"),
  assignmentDate: z.string().min(1, "La fecha es obligatoria"),
});

type FormValues = z.infer<typeof schema>;

interface AsignacionFormDialogProps {
  open: boolean;
  centros: ServiceCenterDto[];
  delegados: TemporaryDelegateDto[];
  defaultDate?: string;
  onClose: () => void;
}

/**
 * Solo crea — no hay PUT de asignaciones. Reasignar es DELETE + POST, ver
 * AsignacionesPage. El backend acepta un delegado temporal (rol
 * DELEGADO_TEMPORAL, catalogo propio) o un delegado permanente (usuario con
 * rol DIGITADOR) — exactamente uno de temporaryDelegateId/userId, nunca
 * ambos. El formulario modela esto con un solo campo delegateId + un toggle
 * de tipo, y arma el body correcto recien al enviar (ver mutationFn).
 */
export function AsignacionFormDialog({ open, centros, delegados, defaultDate, onClose }: AsignacionFormDialogProps) {
  const queryClient = useQueryClient();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const usuariosQuery = useQuery({
    queryKey: ["usuarios"],
    queryFn: userApi.getUsuarios,
    enabled: open,
  });
  const digitadores = (usuariosQuery.data ?? []).filter((u) => u.roles.includes(DIGITADOR_ROLE_NAME));

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { serviceCenterId: 0, delegateType: "TEMPORARY", delegateId: 0, assignmentDate: defaultDate ?? "" },
  });

  const delegateType = watch("delegateType");

  useEffect(() => {
    if (!open) return;
    setSubmitError(null);
    reset({ serviceCenterId: 0, delegateType: "TEMPORARY", delegateId: 0, assignmentDate: defaultDate ?? "" });
  }, [open, defaultDate, reset]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      assignmentApi.crearAsignacion({
        serviceCenterId: values.serviceCenterId,
        assignmentDate: values.assignmentDate,
        ...(values.delegateType === "TEMPORARY"
          ? { temporaryDelegateId: values.delegateId }
          : { userId: values.delegateId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asignaciones"] });
      onClose();
    },
    onError: (error) => setSubmitError(getApiErrorMessage(error, "No se pudo crear la asignación.")),
  });

  const onSubmit = handleSubmit((values) => {
    setSubmitError(null);
    mutation.mutate(values);
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Nueva asignación</DialogTitle>
      <Box component="form" onSubmit={onSubmit} noValidate>
        <DialogContent>
          <Stack spacing={2.25}>
            {submitError && <Alert severity="error">{submitError}</Alert>}

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
              name="delegateType"
              control={control}
              render={({ field }) => (
                <RadioGroup
                  row
                  value={field.value}
                  onChange={(e) => {
                    field.onChange(e.target.value);
                    // Las opciones del picker de abajo cambian por completo entre un tipo y otro.
                    setValue("delegateId", 0);
                  }}
                >
                  <FormControlLabel value="TEMPORARY" control={<Radio size="small" />} label="Delegado temporal" />
                  <FormControlLabel value="PERMANENT" control={<Radio size="small" />} label="Delegado permanente (DIGITADOR)" />
                </RadioGroup>
              )}
            />

            {delegateType === "TEMPORARY" ? (
              <Controller
                name="delegateId"
                control={control}
                render={({ field }) => (
                  <Autocomplete
                    options={delegados}
                    getOptionLabel={(d) => `${d.fullName} (${d.dui})`}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    value={delegados.find((d) => d.id === field.value) ?? null}
                    onChange={(_, selected) => field.onChange(selected?.id ?? 0)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Delegado temporal"
                        placeholder="Busca por nombre o DUI"
                        error={!!errors.delegateId}
                        helperText={errors.delegateId?.message}
                      />
                    )}
                  />
                )}
              />
            ) : (
              <Controller
                name="delegateId"
                control={control}
                render={({ field }) => (
                  <Autocomplete
                    options={digitadores}
                    loading={usuariosQuery.isLoading}
                    getOptionLabel={(u: UserDto) => `${u.fullName} (${u.username})`}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    value={digitadores.find((u) => u.id === field.value) ?? null}
                    onChange={(_, selected) => field.onChange(selected?.id ?? 0)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Delegado permanente"
                        placeholder="Busca por nombre o usuario"
                        error={!!errors.delegateId}
                        helperText={
                          errors.delegateId?.message ??
                          (!usuariosQuery.isLoading && digitadores.length === 0
                            ? "No hay usuarios con rol DIGITADOR."
                            : undefined)
                        }
                      />
                    )}
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
            Asignar
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
