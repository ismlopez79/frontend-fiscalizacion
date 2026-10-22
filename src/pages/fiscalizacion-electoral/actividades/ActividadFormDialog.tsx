import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
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
  MenuItem,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { activityApi } from "@/api/fiscalizacionFasesApi";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { getApiErrorMessage } from "@/utils/apiError";
import { designTokens } from "@/theme/theme";
import type { ElectoralPeriodDto } from "@/types/electoral";
import { ELECTION_TYPES, ELECTION_TYPE_LABELS } from "@/types/fiscalizacionFases";
import type { ActivityDelegateType, ActivityDto, ElectionType, PhaseDto } from "@/types/fiscalizacionFases";
import { TerritorioFields } from "../components/TerritorioFields";
import { DelegateMultiPicker, busyText, delegateKey, useDelegadosDisponibles } from "../components/DelegatePicker";

const MAX_DELEGATES = 30;

const schema = z.object({
  phaseId: z.number().min(1, "Elige la fase"),
  activityDate: z.string().min(1, "La fecha es obligatoria"),
  departmentId: z.number().nullable(),
  districtId: z.number({ invalid_type_error: "Elige el distrito" }).nullable().refine((v) => !!v, "Elige el distrito"),
  placeName: z.string().trim().min(1, "Escribe el lugar").max(200, "Máximo 200 caracteres"),
  address: z.string().trim().max(300, "Máximo 300 caracteres"),
  electionType: z.enum(["PRESIDENCIAL", "LEGISLATIVA", "MUNICIPAL"]).nullable(),
  notes: z.string().trim().max(1000, "Máximo 1000 caracteres"),
  temporaryDelegateIds: z.array(z.number()).max(MAX_DELEGATES, `Máximo ${MAX_DELEGATES}`),
  userIds: z.array(z.number()).max(MAX_DELEGATES, `Máximo ${MAX_DELEGATES}`),
});

type FormValues = z.infer<typeof schema>;

interface ActividadFormDialogProps {
  open: boolean;
  /** null = crear. */
  activity: ActivityDto | null;
  period: ElectoralPeriodDto | null;
  phases: PhaseDto[];
  onClose: () => void;
  onSaved: (activity: ActivityDto, created: boolean) => void;
}

function emptyValues(phases: PhaseDto[]): FormValues {
  return {
    phaseId: phases.length === 1 ? phases[0].id : 0,
    activityDate: "",
    departmentId: null,
    districtId: null,
    placeName: "",
    address: "",
    electionType: null,
    notes: "",
    temporaryDelegateIds: [],
    userIds: [],
  };
}

/**
 * Crear o corregir una actividad. Al crear se elige la fase y el equipo;
 * al editar, la fase y los delegados ya no se tocan aqui (los delegados se
 * gestionan en el detalle). El tipo de eleccion solo aparece si la fase lo
 * pide: el backend responde 409 si sobra o si falta.
 */
export function ActividadFormDialog({ open, activity, period, phases, onClose, onSaved }: ActividadFormDialogProps) {
  const queryClient = useQueryClient();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const isEdit = !!activity;
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { control, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyValues(phases),
  });

  useEffect(() => {
    if (!open) return;
    setSubmitError(null);
    reset(
      activity
        ? {
            phaseId: activity.phaseId,
            activityDate: activity.activityDate,
            departmentId: activity.departmentId,
            districtId: activity.districtId,
            placeName: activity.placeName,
            address: activity.address ?? "",
            electionType: activity.electionType,
            notes: activity.notes ?? "",
            temporaryDelegateIds: [],
            userIds: [],
          }
        : emptyValues(phases)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activity, reset]);

  const phaseId = useWatch({ control, name: "phaseId" });
  const phase = phases.find((p) => p.id === phaseId);
  // Al editar una actividad cuya fase ya no esta activa, se respeta lo que ya tenia.
  const needsElectionType = phase ? phase.requiresElectionType : !!activity?.electionType;

  useEffect(() => {
    if (!needsElectionType) setValue("electionType", null);
  }, [needsElectionType, setValue]);

  // Disponibilidad del equipo en la fecha elegida: un delegado no puede estar
  // en dos actividades activas el mismo dia (409 del backend si se intenta).
  const activityDate = useWatch({ control, name: "activityDate" });
  const disponibilidad = useDelegadosDisponibles(open ? period?.id : null, activityDate || null);
  const availability = disponibilidad.data ?? [];

  const temporaryIds = useWatch({ control, name: "temporaryDelegateIds" });
  const userIds = useWatch({ control, name: "userIds" });
  const selectedKeys = [
    ...temporaryIds.map((id) => delegateKey({ delegateType: "TEMPORARY", delegateId: id })),
    ...userIds.map((id) => delegateKey({ delegateType: "PERMANENT", delegateId: id })),
  ];
  const setSelected = (keys: string[]) => {
    const pick = (type: string) =>
      keys.filter((k) => k.startsWith(`${type}:`)).map((k) => Number(k.split(":")[1])).slice(0, MAX_DELEGATES);
    setValue("temporaryDelegateIds", pick("TEMPORARY"), { shouldValidate: true });
    setValue("userIds", pick("PERMANENT"), { shouldValidate: true });
  };

  // Un selector por tipo: temporales y permanentes (DIGITADOR) van en secciones separadas.
  const pickerFor = (type: ActivityDelegateType) => ({
    options: availability.filter((d) => d.delegateType === type),
    value: selectedKeys.filter((k) => k.startsWith(`${type}:`)),
    onChange: (keys: string[]) => {
      setSelected([...selectedKeys.filter((k) => !k.startsWith(`${type}:`)), ...keys]);
      setDroppedNames([]);
    },
  });

  // Al cambiar la fecha, quien ya estaba elegido pero esta ocupado ese dia sale de la lista (y se avisa).
  const [droppedNames, setDroppedNames] = useState<string[]>([]);
  useEffect(() => {
    if (isEdit || !disponibilidad.data) return;
    const busy = disponibilidad.data.filter((d) => !d.available && selectedKeys.includes(delegateKey(d)));
    if (busy.length === 0) return;
    const busyKeys = new Set(busy.map(delegateKey));
    setSelected(selectedKeys.filter((k) => !busyKeys.has(k)));
    setDroppedNames(busy.map((d) => d.fullName));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disponibilidad.data, isEdit]);
  useEffect(() => {
    if (!open) setDroppedNames([]);
  }, [open]);

  // Al corregir la fecha: el equipo actual puede chocar con otra actividad del dia nuevo.
  const teamConflicts =
    isEdit && activity && activityDate && activityDate !== activity.activityDate
      ? availability.filter(
          (d) =>
            !d.available &&
            d.busyIn?.activityId !== activity.id &&
            activity.delegates.some((m) => m.delegateType === d.delegateType && m.delegateId === d.delegateId)
        )
      : [];

  const mutation = useMutation({
    mutationFn: (v: FormValues) => {
      const common = {
        activityDate: v.activityDate,
        districtId: v.districtId!,
        placeName: v.placeName.trim(),
        address: v.address.trim() || null,
        electionType: needsElectionType ? v.electionType : null,
        notes: v.notes.trim() || null,
      };
      return activity
        ? activityApi.actualizar(activity.id, { ...common, active: activity.active })
        : activityApi.crear({ ...common, phaseId: v.phaseId, temporaryDelegateIds: v.temporaryDelegateIds, userIds: v.userIds });
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["actividades"] });
      onSaved(saved, !isEdit);
    },
    onError: (error) => setSubmitError(getApiErrorMessage(error, "No se pudo guardar la actividad.")),
  });

  const onSubmit = handleSubmit((v) => {
    if (needsElectionType && !v.electionType) {
      setSubmitError("Esta fase pide el tipo de elección.");
      return;
    }
    setSubmitError(null);
    mutation.mutate(v);
  });

  return (
    <Dialog open={open} onClose={mutation.isPending ? undefined : onClose} maxWidth="sm" fullWidth fullScreen={fullScreen}>
      <DialogTitle>{isEdit ? "Corregir actividad" : "Nueva actividad"}</DialogTitle>
      <Box component="form" onSubmit={onSubmit} noValidate sx={{ display: "contents" }}>
        <DialogContent>
          <Stack spacing={2.25}>
            {submitError && <Alert severity="error">{submitError}</Alert>}

            {isEdit ? (
              <Box>
                <Typography variant="caption" component="div">
                  Fase
                </Typography>
                <Typography sx={{ fontWeight: 700, color: "text.primary" }}>{activity.phaseName}</Typography>
              </Box>
            ) : (
              <Controller
                name="phaseId"
                control={control}
                render={({ field }) => (
                  <TextField
                    select
                    label="Fase"
                    fullWidth
                    value={field.value || ""}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                    error={!!errors.phaseId}
                    helperText={errors.phaseId?.message ?? (phase ? `Formato: ${phase.formTemplateName ?? phase.formTemplateCode}` : undefined)}
                  >
                    {phases.map((p) => (
                      <MenuItem key={p.id} value={p.id}>
                        {p.name}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            )}

            <Controller
              name="activityDate"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  type="date"
                  label="Fecha"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ min: period?.startDate, max: period?.endDate }}
                  error={!!errors.activityDate}
                  helperText={errors.activityDate?.message ?? (period ? `Dentro del período: ${period.startDate} a ${period.endDate}` : undefined)}
                  sx={{ "& input": { fontVariantNumeric: "tabular-nums" } }}
                />
              )}
            />

            {needsElectionType && (
              <Controller
                name="electionType"
                control={control}
                render={({ field }) => (
                  <Box>
                    <Typography variant="body2" sx={{ color: "text.primary", fontWeight: 600, mb: 0.75 }}>
                      Tipo de elección
                    </Typography>
                    <SegmentedControl<ElectionType>
                      ariaLabel="Tipo de elección"
                      options={ELECTION_TYPES.map((t) => ({ value: t, label: ELECTION_TYPE_LABELS[t] }))}
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </Box>
                )}
              />
            )}

            <Controller
              name="districtId"
              control={control}
              render={({ field }) => (
                <Controller
                  name="departmentId"
                  control={control}
                  render={({ field: dep }) => (
                    <TerritorioFields
                      departmentId={dep.value}
                      districtId={field.value}
                      onChange={(next) => {
                        dep.onChange(next.departmentId);
                        field.onChange(next.districtId);
                      }}
                      errors={{ districtId: errors.districtId?.message }}
                    />
                  )}
                />
              )}
            />

            <Controller
              name="placeName"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Lugar"
                  placeholder="Centro Escolar República de Panamá"
                  fullWidth
                  error={!!errors.placeName}
                  helperText={errors.placeName?.message}
                />
              )}
            />
            <Controller
              name="address"
              control={control}
              render={({ field }) => (
                <TextField {...field} label="Dirección (opcional)" fullWidth error={!!errors.address} helperText={errors.address?.message} />
              )}
            />
            <Controller
              name="notes"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Indicaciones para el equipo (opcional)"
                  placeholder="Presentarse 7:30 am"
                  fullWidth
                  multiline
                  minRows={2}
                  error={!!errors.notes}
                  helperText={errors.notes?.message}
                />
              )}
            />

            {!isEdit && (
              <Stack spacing={2.25}>
                <DelegateMultiPicker
                  {...pickerFor("TEMPORARY")}
                  loading={disponibilidad.isLoading}
                  disabledHint={!activityDate ? "Elige primero la fecha para ver quién está libre" : undefined}
                  label="Delegados temporales"
                  error={!!errors.temporaryDelegateIds}
                  helperText={errors.temporaryDelegateIds?.message ?? `Del período, hasta ${MAX_DELEGATES}. Quien ya tiene otra actividad ese día aparece ocupado.`}
                />
                <DelegateMultiPicker
                  {...pickerFor("PERMANENT")}
                  loading={disponibilidad.isLoading}
                  disabledHint={!activityDate ? "Elige primero la fecha para ver quién está libre" : undefined}
                  label="Delegados permanentes (DIGITADOR)"
                  error={!!errors.userIds}
                  helperText={errors.userIds?.message ?? `Usuarios con rol DIGITADOR, hasta ${MAX_DELEGATES}.`}
                />
                {droppedNames.length > 0 && (
                  <Typography variant="caption" component="div" sx={{ mt: 0.75, color: designTokens.status.warning.fg }}>
                    {droppedNames.join(", ")} {droppedNames.length === 1 ? "quedó fuera: ya está ocupado" : "quedaron fuera: ya están ocupados"} en esa fecha.
                  </Typography>
                )}
              </Stack>
            )}

            {teamConflicts.length > 0 && (
              <Alert severity="warning">
                En la nueva fecha {teamConflicts.length === 1 ? "este delegado ya está ocupado" : "estos delegados ya están ocupados"}:
                <Box component="ul" sx={{ m: 0, mt: 0.5, pl: 2.25 }}>
                  {teamConflicts.map((d) => (
                    <li key={delegateKey(d)}>
                      <strong>{d.fullName}</strong> — {busyText(d)?.replace("Ocupado en: ", "")}
                    </li>
                  ))}
                </Box>
                Quítalos de esa actividad o de esta antes de cambiar la fecha.
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} color="inherit" disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={mutation.isPending}>
            {mutation.isPending ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear actividad"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
