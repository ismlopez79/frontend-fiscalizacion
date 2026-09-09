import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Controller, useForm } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Collapse,
  FormControlLabel,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CloudDoneOutlinedIcon from "@mui/icons-material/CloudDoneOutlined";
import CloudSyncOutlinedIcon from "@mui/icons-material/CloudSyncOutlined";
import CloudOffOutlinedIcon from "@mui/icons-material/CloudOffOutlined";
import dayjs from "dayjs";
import { assignmentApi, fiscalizationQuestionApi } from "@/api/electoralApi";
import { getApiErrorMessage } from "@/utils/apiError";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { ToastSnackbar } from "@/components/ToastSnackbar";
import type { FiscalizationQuestionDto } from "@/types/electoral";
import type { FiscalizationDraftSnapshot } from "@/types/fiscalizacionForm";
import { DraftGoneError, useFiscalizacionDraftAutosave } from "./useFiscalizacionDraftAutosave";

interface FormValues {
  formDate: string;
  serviceCenterId: number;
  arrivalTime: string;
  departureTime: string;
  observations: string;
  /** questionId -> respuesta. Solo se manda al backend lo que tenga valor (ver buildSnapshot). */
  answers: Record<number, string>;
}

const draftDateFormatter = new Intl.DateTimeFormat("es-SV", { day: "2-digit", month: "long", year: "numeric" });

function formatDraftDate(formDate: string): string {
  if (!formDate) return "sin fecha";
  const parsed = new Date(`${formDate}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? formDate : draftDateFormatter.format(parsed);
}

function buildSnapshot(values: FormValues): FiscalizationDraftSnapshot {
  return {
    serviceCenterId: values.serviceCenterId,
    formDate: values.formDate,
    content: {
      arrivalTime: values.arrivalTime || null,
      departureTime: values.departureTime || null,
      observations: values.observations || null,
      respuestas: Object.entries(values.answers)
        .filter(([, answer]) => !!answer)
        .map(([questionId, answer]) => ({ questionId: Number(questionId), answer })),
    },
  };
}

function mapSnapshotToFormValues(snapshot: FiscalizationDraftSnapshot): FormValues {
  const c = snapshot.content ?? {};
  const answers: Record<number, string> = {};
  for (const r of c.respuestas ?? []) answers[r.questionId] = r.answer;
  return {
    formDate: snapshot.formDate,
    serviceCenterId: snapshot.serviceCenterId,
    arrivalTime: c.arrivalTime ?? "",
    departureTime: c.departureTime ?? "",
    observations: c.observations ?? "",
    answers,
  };
}

function AutosaveIndicator({ state, hasDraft }: { state: "idle" | "saving" | "saved" | "error"; hasDraft: boolean }) {
  if (!hasDraft && state === "idle") return null;
  const config = {
    idle: null,
    saving: { icon: CloudSyncOutlinedIcon, label: "Guardando borrador…", color: "text.secondary" },
    saved: { icon: CloudDoneOutlinedIcon, label: "Borrador guardado", color: "success.main" },
    error: { icon: CloudOffOutlinedIcon, label: "Sin conexión — reintentando guardar el borrador", color: "warning.main" },
  }[state];
  if (!config) return null;
  const Icon = config.icon;
  return (
    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
      <Icon fontSize="inherit" sx={{ color: config.color, fontSize: 16 }} />
      <Typography variant="caption" sx={{ color: config.color }}>
        {config.label}
      </Typography>
    </Stack>
  );
}

function PreguntaField({
  pregunta,
  value,
  onChange,
}: {
  pregunta: FiscalizationQuestionDto;
  value: string;
  onChange: (value: string) => void;
}) {
  if (pregunta.answerType === "TEXTO_LIBRE") {
    return (
      <TextField
        label={pregunta.text}
        fullWidth
        multiline
        minRows={2}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  const options = pregunta.answerType === "SI_NO_PARCIAL" ? ["Sí", "No", "Parcial"] : ["Sí", "No"];

  return (
    <Box>
      <Typography variant="body2" sx={{ mb: 0.5 }}>
        {pregunta.text}
      </Typography>
      <RadioGroup row value={value || ""} onChange={(e) => onChange(e.target.value)}>
        {options.map((opt) => (
          <FormControlLabel key={opt} value={opt} control={<Radio size="small" />} label={opt} />
        ))}
      </RadioGroup>
    </Box>
  );
}

export function FiscalizacionFormPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast, showToast, closeToast } = useToast();

  const [formDate, setFormDate] = useState(dayjs().format("YYYY-MM-DD"));

  const misAsignacionesQuery = useQuery({
    queryKey: ["asignaciones", "mias", formDate],
    queryFn: () => assignmentApi.getMisAsignaciones(formDate),
  });

  const preguntasQuery = useQuery({
    queryKey: ["preguntas-fiscalizacion"],
    queryFn: fiscalizationQuestionApi.getPreguntas,
  });

  const { control, register, watch, reset, handleSubmit } = useForm<FormValues>({
    defaultValues: {
      formDate,
      serviceCenterId: 0,
      arrivalTime: "",
      departureTime: "",
      observations: "",
      answers: {},
    },
  });

  const serviceCenterId = watch("serviceCenterId");

  // Al cambiar la fecha (fuera de rehidratar un borrador), sincroniza el campo del formulario
  // y limpia el centro elegido — las asignaciones de otra fecha pueden no incluirlo.
  const handleDateChange = (value: string) => {
    setFormDate(value);
    reset((current) => ({ ...current, formDate: value, serviceCenterId: 0 }));
  };

  const draftAutosave = useFiscalizacionDraftAutosave({ username: user?.username ?? "" });

  const [draftDecisionMade, setDraftDecisionMade] = useState(false);
  const [discardingDraft, setDiscardingDraft] = useState(false);
  const pendingDraft = !draftDecisionMade ? draftAutosave.initialSnapshot : null;

  const pendingDraftAsignacionesQuery = useQuery({
    queryKey: ["asignaciones", "mias", pendingDraft?.formDate ?? null],
    queryFn: () => assignmentApi.getMisAsignaciones(pendingDraft!.formDate),
    enabled: !!pendingDraft,
  });

  const handleContinueDraft = useCallback(() => {
    if (!draftAutosave.initialSnapshot) return;
    const snapshot = draftAutosave.initialSnapshot;
    reset(mapSnapshotToFormValues(snapshot));
    setFormDate(snapshot.formDate);
    setDraftDecisionMade(true);
  }, [draftAutosave.initialSnapshot, reset]);

  const handleDiscardDraft = useCallback(async () => {
    setDiscardingDraft(true);
    try {
      await draftAutosave.discardDraft();
    } finally {
      setDiscardingDraft(false);
      setDraftDecisionMade(true);
    }
  }, [draftAutosave]);

  useEffect(() => {
    if (!draftAutosave.draftGone) return;
    showToast("error", "Este formulario ya se completó o se descartó desde otra sesión.");
    navigate("/fiscalizacion");
  }, [draftAutosave.draftGone, navigate, showToast]);

  useEffect(() => {
    const subscription = watch((values) => {
      draftAutosave.notifyChange(buildSnapshot(values as FormValues));
    });
    return () => subscription.unsubscribe();
  }, [watch, draftAutosave.notifyChange]);

  const finalizeMutation = useMutation({
    mutationFn: (values: FormValues) => draftAutosave.finalize(buildSnapshot(values)),
    onSuccess: (data) => {
      navigate(`/fiscalizacion/${data.id}`, { replace: true });
    },
  });

  const onSubmit = handleSubmit((values) => {
    finalizeMutation.mutate(values);
  });

  const preguntas = preguntasQuery.data ?? [];
  const asignaciones = misAsignacionesQuery.data ?? [];

  if (draftAutosave.loadingInitial) {
    return (
      <Stack alignItems="center" sx={{ py: 8 }}>
        <CircularProgress />
      </Stack>
    );
  }

  if (pendingDraft) {
    const centroNombre = pendingDraftAsignacionesQuery.data?.find(
      (a) => a.serviceCenterId === pendingDraft.serviceCenterId
    )?.serviceCenterName;
    return (
      <Paper variant="outlined" sx={{ p: 4, maxWidth: 640 }}>
        <Typography variant="h3" gutterBottom>
          Tienes un borrador sin terminar
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {centroNombre ? `De ${centroNombre}` : "Sin centro identificado todavía"} del{" "}
          {formatDraftDate(pendingDraft.formDate)}. ¿Quieres continuar donde lo dejaste o empezar de cero?
        </Typography>
        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" color="error" onClick={handleDiscardDraft} disabled={discardingDraft}>
            {discardingDraft ? "Descartando…" : "Descartar y empezar de cero"}
          </Button>
          <Button variant="contained" onClick={handleContinueDraft} disabled={discardingDraft}>
            Continuar borrador
          </Button>
        </Stack>
      </Paper>
    );
  }

  return (
    <Box component="form" onSubmit={onSubmit} noValidate>
      <Stack spacing={2.5} sx={{ maxWidth: 900 }}>
        <Box>
          <Typography variant="h3">Nueva fiscalización</Typography>
          <Typography variant="body2" color="text.secondary">
            Registra tu visita al centro asignado. El sistema guarda tu progreso automáticamente.
          </Typography>
          <AutosaveIndicator state={draftAutosave.autosaveState} hasDraft={draftAutosave.draftId !== null} />
        </Box>

        <Collapse in={finalizeMutation.isError && !(finalizeMutation.error instanceof DraftGoneError)}>
          <Alert severity="error">
            {getApiErrorMessage(finalizeMutation.error, "No se pudo finalizar el formulario.")}
          </Alert>
        </Collapse>

        <Paper variant="outlined" sx={{ p: 2.5 }}>
          <Stack spacing={2}>
            <Typography variant="h4">Centro y fecha</Typography>

            <TextField
              label="Fecha"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={formDate}
              onChange={(e) => handleDateChange(e.target.value)}
            />

            {misAsignacionesQuery.isLoading ? (
              <CircularProgress size={20} />
            ) : asignaciones.length === 0 ? (
              <Alert severity="warning">No tienes centros asignados para esta fecha.</Alert>
            ) : (
              <Controller
                name="serviceCenterId"
                control={control}
                render={({ field }) => (
                  <TextField
                    select
                    label="Centro de servicio"
                    fullWidth
                    value={field.value || ""}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  >
                    <MenuItem value="" disabled>
                      Selecciona un centro
                    </MenuItem>
                    {asignaciones.map((a) => (
                      <MenuItem key={a.serviceCenterId} value={a.serviceCenterId}>
                        {a.serviceCenterName}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            )}

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Hora de llegada (opcional)"
                type="time"
                fullWidth
                InputLabelProps={{ shrink: true }}
                {...register("arrivalTime")}
              />
              <TextField
                label="Hora de salida (opcional)"
                type="time"
                fullWidth
                InputLabelProps={{ shrink: true }}
                {...register("departureTime")}
              />
            </Stack>
          </Stack>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2.5 }}>
          <Stack spacing={2.5}>
            <Typography variant="h4">Checklist de fiscalización</Typography>
            {preguntasQuery.isLoading ? (
              <CircularProgress size={20} />
            ) : preguntas.length === 0 ? (
              <Alert severity="info">
                Todavía no hay preguntas cargadas en el catálogo — consulta con el administrador.
              </Alert>
            ) : (
              <Controller
                name="answers"
                control={control}
                render={({ field }) => (
                  <Stack spacing={2.5}>
                    {preguntas.map((pregunta) => (
                      <PreguntaField
                        key={pregunta.id}
                        pregunta={pregunta}
                        value={field.value[pregunta.id] ?? ""}
                        onChange={(value) => field.onChange({ ...field.value, [pregunta.id]: value })}
                      />
                    ))}
                  </Stack>
                )}
              />
            )}
          </Stack>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2.5 }}>
          <Stack spacing={2}>
            <Typography variant="h4">Observaciones</Typography>
            <TextField
              label="Observaciones (opcional)"
              fullWidth
              multiline
              minRows={3}
              {...register("observations")}
            />
          </Stack>
        </Paper>

        <Stack direction="row" spacing={1.5} justifyContent="flex-end">
          <Button variant="text" color="inherit" onClick={() => navigate("/fiscalizacion")}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={finalizeMutation.isPending || !serviceCenterId}>
            {finalizeMutation.isPending ? "Guardando…" : "Guardar fiscalización"}
          </Button>
        </Stack>
      </Stack>

      <ToastSnackbar toast={toast} onClose={closeToast} />
    </Box>
  );
}
