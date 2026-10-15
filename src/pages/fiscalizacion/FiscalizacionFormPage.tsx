import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Controller, useForm } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Box, Button, Collapse, MenuItem, Skeleton, Stack, TextField, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBackRounded";
import RestorePageOutlinedIcon from "@mui/icons-material/RestorePageOutlined";
import dayjs from "dayjs";
import { assignmentApi, fiscalizationQuestionApi } from "@/api/electoralApi";
import { getApiErrorMessage } from "@/utils/apiError";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { ToastSnackbar } from "@/components/ToastSnackbar";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeader, Surface } from "@/components/ui/Surface";
import { Callout } from "@/components/ui/Callout";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { AutosaveIndicator } from "@/components/ui/AutosaveIndicator";
import { CenteredNotice } from "@/components/ui/CenteredNotice";
import { glassShadow, glassSx } from "@/components/ui/glass";
import { designTokens } from "@/theme/theme";
import type { FiscalizationQuestionDto } from "@/types/electoral";
import type { FiscalizationDraftSnapshot } from "@/types/fiscalizacionForm";
import { DraftGoneError, useFiscalizacionDraftAutosave } from "./useFiscalizacionDraftAutosave";
import { WordCountTextField } from "@/components/ui/WordCountTextField";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { OBSERVATIONS_MIN_WORDS, countWords, missingWordsMessage } from "@/utils/words";

const OBSERVACIONES_FIELD_ID = "fiscalizacion-observaciones";

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

/**
 * Una pregunta del checklist. Si/No(/Parcial) como control segmentado (sin
 * seleccion hasta que se responde); texto libre como area de texto debajo.
 */
function PreguntaField({
  numero,
  pregunta,
  value,
  onChange,
}: {
  numero: number;
  pregunta: FiscalizationQuestionDto;
  value: string;
  onChange: (value: string) => void;
}) {
  const isText = pregunta.answerType === "TEXTO_LIBRE";
  const options = pregunta.answerType === "SI_NO_PARCIAL" ? ["Sí", "No", "Parcial"] : ["Sí", "No"];
  const labelId = `pregunta-${pregunta.id}`;

  return (
    <Box
      component="li"
      sx={{ py: 1.75, borderTop: "1px solid rgba(15, 23, 42, 0.06)", "&:first-of-type": { borderTop: "none", pt: 0 } }}
    >
      <Stack
        direction={{ xs: "column", sm: isText ? "column" : "row" }}
        alignItems={{ xs: "stretch", sm: isText ? "stretch" : "center" }}
        gap={1.25}
      >
        <Stack direction="row" gap={1.25} sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="body2"
            aria-hidden
            sx={{ color: value ? designTokens.status.success.fg : designTokens.textDisabled, fontWeight: 700, fontVariantNumeric: "tabular-nums", minWidth: 20, transition: "color 150ms ease" }}
          >
            {numero}
          </Typography>
          <Typography id={labelId} variant="body2" sx={{ color: "text.primary", fontWeight: 500 }}>
            {pregunta.text}
          </Typography>
        </Stack>
        {isText ? (
          <TextField
            inputProps={{ "aria-labelledby": labelId }}
            placeholder="Escribe tu respuesta"
            fullWidth
            multiline
            minRows={2}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            sx={{ pl: { sm: "32px" } }}
          />
        ) : (
          <Box sx={{ pl: { xs: "32px", sm: 0 } }}>
            <SegmentedControl<string>
              ariaLabel={pregunta.text}
              options={options.map((o) => ({ value: o, label: o }))}
              value={value || null}
              onChange={onChange}
            />
          </Box>
        )}
      </Stack>
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

  const {
    control,
    register,
    watch,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
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

  // Mismo criterio que el acta: si las observaciones no alcanzan el minimo, no
  // se envia nada; se avisa junto a Guardar y se lleva a la persona al campo.
  const observacionesRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const [observacionesBlocked, setObservacionesBlocked] = useState(false);
  const goToObservaciones = useCallback(() => {
    observacionesRef.current?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });
    document.getElementById(OBSERVACIONES_FIELD_ID)?.focus({ preventScroll: true });
  }, [reducedMotion]);
  const observacionesError = errors.observations?.message;
  useEffect(() => {
    if (!observacionesError) setObservacionesBlocked(false);
  }, [observacionesError]);

  const onSubmitInvalid = () => {
    setObservacionesBlocked(true);
    goToObservaciones();
  };

  const onSubmit = handleSubmit((values) => {
    setObservacionesBlocked(false);
    finalizeMutation.mutate(values);
  }, onSubmitInvalid);

  const preguntas = preguntasQuery.data ?? [];
  const asignaciones = misAsignacionesQuery.data ?? [];
  const answersWatch = watch("answers") ?? {};
  const answeredCount = preguntas.filter((p) => !!answersWatch[p.id]).length;
  const progress = preguntas.length > 0 ? answeredCount / preguntas.length : 0;

  if (draftAutosave.loadingInitial) {
    return (
      <Stack spacing={2.5} sx={{ flexShrink: 0 }} aria-busy="true">
        <Skeleton width={240} height={40} />
        <Surface>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={56} />
          ))}
        </Surface>
      </Stack>
    );
  }

  if (pendingDraft) {
    const centroNombre = pendingDraftAsignacionesQuery.data?.find(
      (a) => a.serviceCenterId === pendingDraft.serviceCenterId
    )?.serviceCenterName;
    return (
      <CenteredNotice
        icon={<RestorePageOutlinedIcon />}
        title="Tienes un borrador sin terminar"
        body={
          <>
            {centroNombre ? `De ${centroNombre}` : "Sin centro identificado todavía"} del{" "}
            {formatDraftDate(pendingDraft.formDate)}. ¿Quieres continuar donde lo dejaste o empezar de cero?
          </>
        }
        actions={
          <>
            <Button color="error" onClick={handleDiscardDraft} disabled={discardingDraft}>
              {discardingDraft ? "Descartando…" : "Descartar y empezar de cero"}
            </Button>
            <Button variant="contained" onClick={handleContinueDraft} disabled={discardingDraft}>
              Continuar borrador
            </Button>
          </>
        }
      />
    );
  }

  return (
    <Box component="form" onSubmit={onSubmit} noValidate sx={{ flexShrink: 0 }}>
      <Stack spacing={{ xs: 2, md: 2.5 }} sx={{ maxWidth: 900 }}>
        <PageHeader
          back={
            <Button size="small" color="inherit" startIcon={<ArrowBackIcon />} onClick={() => navigate("/fiscalizacion")}>
              Fiscalización
            </Button>
          }
          title="Nueva fiscalización"
          titleAdornment={<AutosaveIndicator state={draftAutosave.autosaveState} hasDraft={draftAutosave.draftId !== null} />}
          subtitle="Registra tu visita al centro asignado. Tu progreso se guarda automáticamente."
        />

        <Collapse in={finalizeMutation.isError && !(finalizeMutation.error instanceof DraftGoneError)}>
          <Callout tone="error" title="No se pudo guardar el formulario">
            {getApiErrorMessage(finalizeMutation.error, "Revisa los datos e inténtalo de nuevo.")}
          </Callout>
        </Collapse>

        <Surface>
          <SectionHeader title="Centro y fecha" subtitle="Solo aparecen los centros que tienes asignados en esa fecha." />
          <Stack spacing={2}>
            <TextField
              label="Fecha"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={formDate}
              onChange={(e) => handleDateChange(e.target.value)}
            />

            {misAsignacionesQuery.isLoading ? (
              <Skeleton variant="rounded" height={40} sx={{ borderRadius: "10px" }} />
            ) : asignaciones.length === 0 ? (
              <Callout tone="warning" title="Sin centros asignados">
                No tienes centros asignados para esta fecha. Prueba con otro día o consulta con tu supervisor.
              </Callout>
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
        </Surface>

        <Surface>
          <SectionHeader
            title="Checklist de fiscalización"
            subtitle={
              preguntas.length > 0 ? (
                <Box component="span" sx={{ fontVariantNumeric: "tabular-nums" }}>
                  {answeredCount} de {preguntas.length} respondidas
                </Box>
              ) : undefined
            }
          />
          {preguntas.length > 0 && (
            <Box
              role="progressbar"
              aria-valuenow={answeredCount}
              aria-valuemin={0}
              aria-valuemax={preguntas.length}
              aria-label="Preguntas respondidas"
              sx={{ height: 4, borderRadius: 999, bgcolor: "rgba(15, 23, 42, 0.06)", overflow: "hidden", mt: -1, mb: 2.5 }}
            >
              <Box
                sx={{
                  height: "100%",
                  borderRadius: 999,
                  bgcolor: progress === 1 ? designTokens.status.success.fg : designTokens.accent,
                  transformOrigin: "left center",
                  transform: `scaleX(${progress})`,
                  transition: `transform 320ms ${designTokens.easeOut}, background-color 200ms ease`,
                  "@media (prefers-reduced-motion: reduce)": { transition: "background-color 200ms ease" },
                }}
              />
            </Box>
          )}
          {preguntasQuery.isLoading ? (
            <Stack spacing={1.5}>
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} height={44} />
              ))}
            </Stack>
          ) : preguntas.length === 0 ? (
            <Callout tone="info">Todavía no hay preguntas cargadas en el catálogo. Consulta con el administrador.</Callout>
          ) : (
            <Controller
              name="answers"
              control={control}
              render={({ field }) => (
                <Box component="ol" sx={{ listStyle: "none", m: 0, p: 0 }}>
                  {preguntas.map((pregunta, i) => (
                    <PreguntaField
                      key={pregunta.id}
                      numero={i + 1}
                      pregunta={pregunta}
                      value={field.value[pregunta.id] ?? ""}
                      onChange={(value) => field.onChange({ ...field.value, [pregunta.id]: value })}
                    />
                  ))}
                </Box>
              )}
            />
          )}
        </Surface>

        <Surface>
          <SectionHeader
            title="Observaciones"
            subtitle={`Obligatorio: describe lo observado en la visita en al menos ${OBSERVATIONS_MIN_WORDS} palabras.`}
          />
          <Controller
            name="observations"
            control={control}
            rules={{
              validate: (value) => {
                const words = countWords(value);
                return words >= OBSERVATIONS_MIN_WORDS || missingWordsMessage(words);
              },
            }}
            render={({ field, fieldState }) => (
              <WordCountTextField
                ref={observacionesRef}
                id={OBSERVACIONES_FIELD_ID}
                value={field.value ?? ""}
                onChange={field.onChange}
                onBlur={field.onBlur}
                inputRef={field.ref}
                error={fieldState.error?.message}
                placeholder="Describe lo observado durante la visita al centro."
              />
            )}
          />
        </Surface>

        <Collapse in={observacionesBlocked && !!observacionesError}>
          <Callout
            tone="error"
            title="Falta completar las observaciones"
            action={
              <Button size="small" color="error" variant="outlined" onClick={goToObservaciones} sx={{ flexShrink: 0, alignSelf: "center" }}>
                Ir a Observaciones
              </Button>
            }
          >
            {observacionesError}
          </Callout>
        </Collapse>

        {/* Barra de accion flotante en vidrio: guardar siempre al alcance, con el avance del checklist. */}
        <Stack
          direction="row"
          alignItems="center"
          gap={1.5}
          sx={{
            position: "sticky",
            bottom: { xs: 8, sm: 12 },
            zIndex: 5,
            px: 2,
            py: 1.25,
            borderRadius: "18px",
            ...glassSx("thick"),
            boxShadow: glassShadow.floating,
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {preguntas.length > 0 && (
              <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums" }}>
                <Box component="strong" sx={{ color: "text.primary" }}>
                  {answeredCount}/{preguntas.length}
                </Box>{" "}
                respondidas
              </Typography>
            )}
            {!serviceCenterId && asignaciones.length > 0 && (
              <Typography variant="caption" component="div">
                Elige un centro para poder guardar.
              </Typography>
            )}
          </Box>
          <Button color="inherit" onClick={() => navigate("/fiscalizacion")} sx={{ display: { xs: "none", sm: "inline-flex" } }}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" size="large" disabled={finalizeMutation.isPending || !serviceCenterId}>
            {finalizeMutation.isPending ? "Guardando…" : "Guardar fiscalización"}
          </Button>
        </Stack>
      </Stack>

      <ToastSnackbar toast={toast} onClose={closeToast} />
    </Box>
  );
}
