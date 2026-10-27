import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { Box, Button, CircularProgress, Collapse, IconButton, Skeleton, Stack, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBackRounded";
import SendIcon from "@mui/icons-material/SendOutlined";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import FlagOutlinedIcon from "@mui/icons-material/FlagOutlined";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import BlockOutlinedIcon from "@mui/icons-material/BlockOutlined";
import CloseIcon from "@mui/icons-material/CloseRounded";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import NoteAddOutlinedIcon from "@mui/icons-material/NoteAddOutlined";
import { activityApi, activityFormApi } from "@/api/fiscalizacionFasesApi";
import { catalogApi } from "@/api/catalogApi";
import { getApiErrorCode, getApiErrorMessage, getBlobApiErrorMessage } from "@/utils/apiError";
import { downloadBlob } from "@/utils/downloadBlob";
import { formatDateTime } from "@/utils/dateFormat";
import { tituloRevision, ultimaRevision } from "@/utils/revisiones";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { ToastSnackbar } from "@/components/ToastSnackbar";
import { ConfirmacionAccion } from "@/components/ConfirmacionAccion";
import { RevisionesHistorial } from "@/components/RevisionesHistorial";
import { EstadoActaChip } from "@/components/EstadoActaChip";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeader, Surface } from "@/components/ui/Surface";
import { Callout } from "@/components/ui/Callout";
import { AutosaveIndicator } from "@/components/ui/AutosaveIndicator";
import { glassShadow, glassSx } from "@/components/ui/glass";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { designTokens } from "@/theme/theme";
import { answerKey, isEmptyAnswer } from "@/types/fiscalizacionFases";
import type { ActivityFormDto, AnswerValue, Answers, FormTemplateDto } from "@/types/fiscalizacionFases";
import { TemplateRenderer, fieldDomId } from "../components/TemplateRenderer";
import { ActivityFacts, DELEGATE_ROLES, REVIEWER_ROLES, feRoutes } from "../fiscalizacionFasesUi";
import { useActivityFormAutosave } from "./useActivityFormAutosave";
import { FotosActividad, PHOTOS_SECTION_ID, formPhotosKey, useFormPhotos } from "./FotosActividad";

type ReviewAction = "enviar" | "aprobar" | "observar" | "rechazar" | "anular";

interface ConflictNotice {
  title: string;
  body: string;
}

const EDIT_CONFLICT_SAVE_BODY =
  "Cargamos la versión más reciente del informe. Revisa lo que cambió y vuelve a escribir tus últimos cambios si hace falta.";
const EDIT_CONFLICT_SUBMIT_BODY = "No se envió. Ya cargamos la versión más reciente: revísala y vuelve a pulsar «Enviar informe».";
const ALREADY_SUBMITTED_BODY = "Cargamos el informe enviado. Ya no se puede editar mientras se revisa.";

/** Quita el parentesis final ("(Nombre del coordinador(a))"): el campo ya muestra su etiqueta. */
function stripTrailingLabel(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.endsWith(")")) return trimmed;
  let depth = 0;
  for (let i = trimmed.length - 1; i >= 0; i--) {
    if (trimmed[i] === ")") depth++;
    else if (trimmed[i] === "(") {
      depth--;
      if (depth === 0) return trimmed.slice(0, i).trim() || trimmed;
    }
  }
  return trimmed;
}

/** "COORDINADOR.VALOR: es obligatorio (...)" -> { "COORDINADOR.VALOR": "Es obligatorio" }. */
function parseFieldErrors(details: string[] | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of details ?? []) {
    const idx = line.indexOf(":");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    if (!/^[A-Z0-9_]+\.[A-Z0-9_]+$/.test(key)) continue;
    const msg = stripTrailingLabel(line.slice(idx + 1));
    out[key] = msg.charAt(0).toUpperCase() + msg.slice(1);
  }
  return out;
}

function requiredMissing(template: FormTemplateDto, answers: Answers): Record<string, string> {
  const out: Record<string, string> = {};
  for (const s of template.sections)
    for (const it of s.items)
      for (const c of it.components) {
        const key = answerKey(it.code, c.code);
        if (c.required && isEmptyAnswer(answers[key])) out[key] = "Es obligatorio";
      }
  return out;
}

function progressOf(template: FormTemplateDto, answers: Answers) {
  let total = 0;
  let done = 0;
  let required = 0;
  let requiredDone = 0;
  for (const s of template.sections)
    for (const it of s.items)
      for (const c of it.components) {
        const filled = !isEmptyAnswer(answers[answerKey(it.code, c.code)]);
        total++;
        if (filled) done++;
        if (c.required) {
          required++;
          if (filled) requiredDone++;
        }
      }
  return { total, done, required, requiredDone };
}

/** Etiqueta legible de una llave, para la lista de errores. */
function labelForKey(template: FormTemplateDto, key: string): string {
  const [itemCode, compCode] = key.split(".");
  for (const s of template.sections)
    for (const it of s.items)
      if (it.code === itemCode) {
        const c = it.components.find((x) => x.code === compCode);
        return it.components.length > 1 && c?.label ? `${it.label}: ${c.label}` : it.label;
      }
  return key;
}

export function InformeActividadPage() {
  const { id } = useParams();
  const activityId = Number(id);
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast, showToast, closeToast } = useToast();
  const reducedMotion = useReducedMotion();

  const roles = user?.roles ?? [];
  const isAdmin = roles.includes("ADMINISTRADOR");
  const isReviewer = REVIEWER_ROLES.some((r) => roles.includes(r));
  const isDelegate = DELEGATE_ROLES.some((r) => roles.includes(r));
  const canFill = isDelegate || isAdmin;

  const activityQuery = useQuery({
    queryKey: ["actividades", activityId],
    queryFn: () => activityApi.getActividad(activityId),
    enabled: Number.isFinite(activityId),
  });

  // Sin recargas automaticas: una recarga en segundo plano pisaria lo que la persona esta escribiendo.
  const formQueryKey = ["actividades", activityId, "formulario"];
  const formQuery = useQuery({
    queryKey: formQueryKey,
    queryFn: () => activityFormApi.getFormulario(activityId),
    enabled: Number.isFinite(activityId),
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const form = formQuery.data ?? null;
  const template = form?.template ?? null;
  const editMode = !!form && form.editable && canFill;

  const needsParties = useMemo(
    () => !!template?.sections.some((s) => s.items.some((it) => it.components.some((c) => c.type === "CONTEO_POR_PARTIDO"))),
    [template]
  );
  const partiesQuery = useQuery({
    queryKey: ["partidos-politicos"],
    queryFn: catalogApi.getPartidosPoliticos,
    enabled: needsParties,
    staleTime: 5 * 60_000,
  });

  const photosQuery = useFormPhotos(activityId, form?.photos, !!form);
  const photos = photosQuery.data ?? [];
  const minPhotos = form?.minPhotos ?? 0;
  const photosMissing = Math.max(0, minPhotos - photos.length);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  const autosave = useActivityFormAutosave(activityId);
  const { reset } = autosave;

  useEffect(() => {
    if (form) reset(form);
  }, [form, reset]);

  // 403: el delegado no esta asignado a esta actividad.
  const forbidden = [activityQuery.error, formQuery.error].some(
    (e) => e instanceof AxiosError && e.response?.status === 403
  );
  useEffect(() => {
    if (forbidden && isDelegate) {
      navigate(feRoutes.misActividades, {
        replace: true,
        state: { notice: "No estás asignado a esa actividad. Aquí están las tuyas." },
      });
    }
  }, [forbidden, isDelegate, navigate]);

  // ---------------------------------------------------------------- errores por campo
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [errorsVisible, setErrorsVisible] = useState(false);
  const [conflictNotice, setConflictNotice] = useState<ConflictNotice | null>(null);

  const onChange = useCallback(
    (key: string, value: AnswerValue) => {
      autosave.setAnswer(key, value);
      setFieldErrors((prev) => {
        if (!(key in prev)) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [autosave.setAnswer]
  );

  const goToField = useCallback(
    (key: string) => {
      const el = document.getElementById(fieldDomId(key));
      el?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });
      el?.querySelector<HTMLElement>("input, textarea, [role='radio'], [role='checkbox'], [role='button']")?.focus({
        preventScroll: true,
      });
    },
    [reducedMotion]
  );

  const goToPhotos = useCallback(() => {
    const el = document.getElementById(PHOTOS_SECTION_ID);
    el?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
    el?.focus({ preventScroll: true });
  }, [reducedMotion]);

  /**
   * Conflicto con otro delegado: avisar y recargar lo que hay en el servidor.
   * Nunca se reintenta en silencio. Si ya lo enviaron, la recarga lo deja de
   * solo lectura (editable: false).
   */
  const reloadAfterConflict = useCallback(
    (notice: ConflictNotice) => {
      setConflictNotice(notice);
      setFieldErrors({});
      setErrorsVisible(false);
      void formQuery.refetch().then((r) => {
        if (r.data) reset(r.data);
      });
      void queryClient.invalidateQueries({ queryKey: formPhotosKey(activityId), exact: true });
      queryClient.invalidateQueries({ queryKey: ["formularios-actividad"] });
      queryClient.invalidateQueries({ queryKey: ["actividades", "mias"] });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activityId, queryClient, reset]
  );

  /** El titulo es siempre el message del backend, tal cual; el cuerpo solo dice que hicimos. */
  const noticeFor = (code: string | undefined, message: string, context: "save" | "submit"): ConflictNotice => ({
    title: message,
    body:
      code === "FORM_ALREADY_SUBMITTED"
        ? ALREADY_SUBMITTED_BODY
        : context === "submit"
          ? EDIT_CONFLICT_SUBMIT_BODY
          : EDIT_CONFLICT_SAVE_BODY,
  });

  useEffect(() => {
    if (!autosave.conflict) return;
    reloadAfterConflict(noticeFor(autosave.conflict.code, autosave.conflict.message, "save"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autosave.conflict]);

  // ---------------------------------------------------------------- mutaciones
  const applyForm = (next: ActivityFormDto) => {
    queryClient.setQueryData(formQueryKey, next);
    queryClient.invalidateQueries({ queryKey: ["formularios-actividad"] });
    queryClient.invalidateQueries({ queryKey: ["actividades", "mias"] });
  };

  const iniciarMutation = useMutation({
    mutationFn: () => activityFormApi.iniciar(activityId),
    onSuccess: (data) => applyForm(data),
    onError: (error) => showToast("error", getApiErrorMessage(error, "No se pudo iniciar el informe.")),
  });

  const [confirm, setConfirm] = useState<ReviewAction | null>(null);

  const enviarMutation = useMutation({
    mutationFn: async () => {
      // Primero termina el ultimo autoguardado; se envia la version que devolvio ese PATCH.
      const version = await autosave.saveNow();
      if (version === null) throw new Error("UNSAVED");
      return activityFormApi.enviar(activityId, version);
    },
    onSuccess: (data) => {
      setFieldErrors({});
      setErrorsVisible(false);
      applyForm(data);
      showToast("success", data.formNumber ? `Informe ${data.formNumber} enviado a revisión.` : "Informe enviado a revisión.");
    },
    onError: (error) => {
      if (error instanceof Error && error.message === "UNSAVED") {
        if (!autosave.conflict) showToast("error", "No se pudieron guardar los últimos cambios. Revisa tu conexión e inténtalo de nuevo.");
        return;
      }
      const code = getApiErrorCode(error);
      if (code === "FORM_EDIT_CONFLICT" || code === "FORM_ALREADY_SUBMITTED") {
        const fallback =
          code === "FORM_ALREADY_SUBMITTED" ? "Este informe ya fue enviado." : "Otro delegado modificó el informe antes de que lo enviaras.";
        reloadAfterConflict(noticeFor(code, getApiErrorMessage(error, fallback), "submit"));
        window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
        return;
      }
      if (code === "FORM_VALIDATION_FAILED" || code === "VALIDATION_ERROR") {
        const details = error instanceof AxiosError ? (error.response?.data?.details as string[] | undefined) : undefined;
        const parsed = parseFieldErrors(details);
        if (Object.keys(parsed).length > 0) {
          setFieldErrors(parsed);
          setErrorsVisible(true);
          goToField(Object.keys(parsed)[0]);
          return;
        }
      }
      // 409 por fotos faltantes (p. ej. otro delegado borro una): se trae la lista real y se lleva al anexo.
      if (error instanceof AxiosError && error.response?.status === 409 && /foto/i.test(getApiErrorMessage(error, ""))) {
        void queryClient.invalidateQueries({ queryKey: formPhotosKey(activityId), exact: true });
        goToPhotos();
      }
      showToast("error", getApiErrorMessage(error, "No se pudo enviar el informe."));
    },
  });

  const reviewMutation = useMutation({
    mutationFn: ({ action, comment }: { action: Exclude<ReviewAction, "enviar">; comment?: string }) => {
      switch (action) {
        case "aprobar":
          return activityFormApi.aprobar(activityId, comment);
        case "observar":
          return activityFormApi.observar(activityId, comment ?? "");
        case "rechazar":
          return activityFormApi.rechazar(activityId, comment ?? "");
        case "anular":
          return activityFormApi.anular(activityId, comment ?? "");
      }
    },
    onSuccess: (data, { action }) => {
      applyForm(data);
      const msg = { aprobar: "Informe aprobado.", observar: "Informe observado: vuelve a los delegados.", rechazar: "Informe rechazado.", anular: "Informe anulado." }[action];
      showToast("success", msg);
    },
    onError: (error) => showToast("error", getApiErrorMessage(error, "No se pudo completar la acción.")),
  });

  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const handlePdf = async () => {
    if (!form) return;
    setDownloadingPdf(true);
    try {
      const blob = await activityFormApi.descargarPdf(activityId);
      downloadBlob(blob, `Informe-${form.formNumber ?? activityId}.pdf`);
    } catch (error) {
      showToast("error", await getBlobApiErrorMessage(error, "No se pudo generar el PDF del informe."));
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleSubmitClick = () => {
    if (!form) return;
    const missing = requiredMissing(form.template, autosave.answers);
    if (Object.keys(missing).length > 0) {
      setFieldErrors(missing);
      setErrorsVisible(true);
      goToField(Object.keys(missing)[0]);
      return;
    }
    if (photosMissing > 0) {
      goToPhotos();
      return;
    }
    setConfirm("enviar");
  };

  // ---------------------------------------------------------------- navegacion
  const from = (location.state as { from?: { path: string; label: string } } | null)?.from;
  const back = from ?? (isDelegate
    ? { path: feRoutes.misActividades, label: "Mis actividades" }
    : isReviewer && !isAdmin
      ? { path: feRoutes.informes, label: "Informes" }
      : { path: feRoutes.actividad(activityId), label: "Actividad" });
  const backButton = (
    <Button size="small" color="inherit" startIcon={<ArrowBackIcon />} onClick={() => navigate(back.path)}>
      {back.label}
    </Button>
  );

  // ---------------------------------------------------------------- estados de carga
  if (activityQuery.isLoading || formQuery.isLoading) {
    return (
      <Stack spacing={2.5} sx={{ flexShrink: 0, maxWidth: 960 }} aria-busy="true">
        <Box>
          <Box sx={{ ml: -1, mb: 1 }}>{backButton}</Box>
          <Skeleton width={320} height={40} />
          <Skeleton width={220} />
        </Box>
        <Surface>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={34} />
          ))}
        </Surface>
        <Surface>
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} height={48} />
          ))}
        </Surface>
      </Stack>
    );
  }

  const activity = activityQuery.data;
  if (!activity || activityQuery.isError || formQuery.isError) {
    return (
      <Stack spacing={2} sx={{ flexShrink: 0 }}>
        <Box sx={{ ml: -1 }}>{backButton}</Box>
        <Callout tone="error" title="No se pudo abrir el informe">
          {getApiErrorMessage(activityQuery.error ?? formQuery.error, "Puede que la actividad ya no exista o que no tengas acceso a ella.")}
        </Callout>
      </Stack>
    );
  }

  const status = form?.status;
  const canReview = isReviewer && status === "PENDIENTE_REVISION";
  const canAnular = isAdmin && !!form && status !== "ANULADA";
  const canPdf = !!form?.submittedAt;
  // Rechazar ya no es definitivo: una rechazada se corrige y reenvia igual que una observada (manda editable).
  const isResend = status === "OBSERVADA" || status === "RECHAZADA";
  const reviews = form?.reviews ?? [];
  const historyButton = reviews.length > 0 && <RevisionesHistorial reviews={reviews} />;
  const reviewCalloutShown =
    !!form?.reviewComment && (status === "OBSERVADA" || status === "RECHAZADA" || status === "ANULADA" || status === "APROBADA");
  const progress = form ? progressOf(form.template, autosave.answers) : null;
  const errorKeys = Object.keys(fieldErrors);
  const parties = partiesQuery.data ?? [];

  const subtitleParts = [
    form?.formNumber,
    form?.template.formatCode,
    form?.submittedAt ? `Enviado ${formatDateTime(form.submittedAt)}${form.submittedByName ? ` por ${form.submittedByName}` : ""}` : null,
  ].filter(Boolean);

  return (
    <Stack spacing={{ xs: 2, md: 2.5 }} sx={{ flexShrink: 0, pb: 2, maxWidth: 960 }}>
      <PageHeader
        back={backButton}
        title={form?.template.name ?? activity.phaseName}
        titleAdornment={
          form && (
            <Stack direction="row" alignItems="center" gap={1}>
              <EstadoActaChip estado={form.status} size="medium" />
              {editMode && <AutosaveIndicator state={autosave.state} hasDraft />}
            </Stack>
          )
        }
        subtitle={
          subtitleParts.length > 0 ? (
            <Box component="span" sx={{ fontVariantNumeric: "tabular-nums" }}>
              {subtitleParts.join(" · ")}
            </Box>
          ) : (
            activity.placeName
          )
        }
        actions={
          <>
            {canPdf && (
              <Button
                variant="outlined"
                startIcon={downloadingPdf ? <CircularProgress size={16} color="inherit" /> : <PictureAsPdfOutlinedIcon />}
                onClick={handlePdf}
                disabled={downloadingPdf}
              >
                {downloadingPdf ? "Generando…" : "Descargar PDF"}
              </Button>
            )}
            {canAnular && (
              <Button color="error" startIcon={<BlockOutlinedIcon />} onClick={() => setConfirm("anular")} disabled={reviewMutation.isPending}>
                Anular
              </Button>
            )}
            {canReview && (
              <>
                <Button variant="outlined" color="error" startIcon={<CancelOutlinedIcon />} onClick={() => setConfirm("rechazar")} disabled={reviewMutation.isPending}>
                  Rechazar
                </Button>
                <Button variant="outlined" color="warning" startIcon={<FlagOutlinedIcon />} onClick={() => setConfirm("observar")} disabled={reviewMutation.isPending}>
                  Observar
                </Button>
                <Button variant="contained" color="success" startIcon={<CheckRoundedIcon />} onClick={() => setConfirm("aprobar")} disabled={reviewMutation.isPending}>
                  Aprobar
                </Button>
              </>
            )}
          </>
        }
      />

      <Collapse in={!!conflictNotice} unmountOnExit>
        <Callout
          tone="warning"
          title={conflictNotice?.title ?? ""}
          action={
            <IconButton size="small" aria-label="Cerrar aviso" onClick={() => setConflictNotice(null)} sx={{ mt: -0.5, mr: -0.75 }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          }
        >
          {conflictNotice?.body}
        </Callout>
      </Collapse>

      {!activity.active && (
        <Callout tone="warning" title="Actividad cancelada">
          Esta actividad fue cancelada por la administración.
        </Callout>
      )}

      {historyButton && !reviewCalloutShown && <Box sx={{ mt: { xs: -1, md: -1.5 }, ml: -0.75 }}>{historyButton}</Box>}

      {form?.reviewComment && reviewCalloutShown && (
        <Callout
          tone={status === "OBSERVADA" ? "warning" : status === "APROBADA" ? "success" : "error"}
          title={tituloRevision("informe", status, ultimaRevision(reviews, status))}
        >
          <Box component="span" sx={{ whiteSpace: "pre-line" }}>
            {status === "APROBADA" ? "Comentario" : "Motivo"}: {form.reviewComment}
          </Box>
          {isResend && editMode && (
            <Box component="span" sx={{ display: "block", mt: 0.75, color: designTokens.textSecondary }}>
              Corrige lo indicado y envíalo de nuevo. Cualquiera de los delegados puede corregirlo y cambiar las fotos;
              conserva su número.
            </Box>
          )}
          {historyButton && <Box sx={{ mt: 1, ml: -0.75 }}>{historyButton}</Box>}
        </Callout>
      )}

      {isResend && canPdf && editMode && (
        <Typography variant="caption" component="p" sx={{ mt: -1 }}>
          El PDF muestra el envío anterior hasta que se reenvíe.
        </Typography>
      )}

      <Surface sx={{ containerType: "inline-size" }}>
        <SectionHeader title="Actividad" />
        <ActivityFacts
          activity={activity}
          delegates={form?.delegates}
          delegatesNote={
            form && (
              <Typography variant="caption">
                {form.delegatesFinal ? "Fijados en el informe" : "Asignados hoy · se fijan al enviar"}
              </Typography>
            )
          }
        />
      </Surface>

      {!form ? (
        <Surface sx={{ textAlign: "center", py: { xs: 4, md: 5 } }}>
          <Stack alignItems="center" spacing={1.25} sx={{ maxWidth: 420, mx: "auto" }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: "14px",
                bgcolor: designTokens.accentSoft,
                color: designTokens.accent,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <NoteAddOutlinedIcon />
            </Box>
            <Typography component="h2" sx={{ fontWeight: 700, fontSize: "1rem", color: "text.primary" }}>
              El informe todavía no se inició
            </Typography>
            <Typography variant="body2">
              {canFill
                ? "Es un solo informe para todo el equipo: cualquiera de los delegados lo llena y lo envía, y en él figuran todos."
                : "Aparecerá aquí cuando uno de los delegados lo abra."}
            </Typography>
            {canFill && activity.active && (
              <Button
                variant="contained"
                size="large"
                onClick={() => iniciarMutation.mutate()}
                disabled={iniciarMutation.isPending}
                startIcon={iniciarMutation.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
                sx={{ mt: 1 }}
              >
                {iniciarMutation.isPending ? "Abriendo…" : "Iniciar informe"}
              </Button>
            )}
          </Stack>
        </Surface>
      ) : (
        <>
          <Collapse in={errorsVisible && errorKeys.length > 0} unmountOnExit>
            <Callout
              tone="error"
              title={`${errorKeys.length} ${errorKeys.length === 1 ? "respuesta por corregir" : "respuestas por corregir"}`}
              action={
                <IconButton size="small" aria-label="Ocultar lista" onClick={() => setErrorsVisible(false)} sx={{ mt: -0.5, mr: -0.75 }}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              }
            >
              <Box component="ul" sx={{ m: 0, mt: 0.5, p: 0, listStyle: "none", display: "grid", gap: 0.25 }}>
                {errorKeys.slice(0, 8).map((key) => (
                  <li key={key}>
                    <Box
                      component="button"
                      type="button"
                      onClick={() => goToField(key)}
                      sx={{
                        all: "unset",
                        cursor: "pointer",
                        color: designTokens.status.error.fg,
                        fontWeight: 600,
                        textDecoration: "underline",
                        textUnderlineOffset: "3px",
                        textDecorationColor: "rgba(180, 35, 24, 0.35)",
                        "&:focus-visible": { boxShadow: designTokens.focusRing, borderRadius: "4px" },
                      }}
                    >
                      {labelForKey(form.template, key)}
                    </Box>
                    <Box component="span" sx={{ color: "text.primary" }}>
                      {" "}
                      — {fieldErrors[key]}
                    </Box>
                  </li>
                ))}
                {errorKeys.length > 8 && <li>y {errorKeys.length - 8} más, marcadas en rojo abajo.</li>}
              </Box>
            </Callout>
          </Collapse>

          <TemplateRenderer
            template={form.template}
            answers={editMode ? autosave.answers : form.answers}
            onChange={editMode ? onChange : undefined}
            errors={fieldErrors}
            parties={parties}
          />

          <FotosActividad
            activityId={activityId}
            photos={photos}
            loading={photosQuery.isFetching}
            minPhotos={minPhotos}
            maxPhotos={form.maxPhotos}
            editable={editMode && activity.active}
            onUploadingChange={setUploadingPhotos}
            onFormLocked={(message) => reloadAfterConflict({ title: message, body: ALREADY_SUBMITTED_BODY })}
            showToast={showToast}
          />

          {editMode && progress && (
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
                <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums" }}>
                  <Box component="strong" sx={{ color: "text.primary" }}>
                    {progress.done}/{progress.total}
                  </Box>{" "}
                  respondidas
                </Typography>
                {photosMissing > 0 && (
                  <Typography variant="caption" component="div" sx={{ fontVariantNumeric: "tabular-nums", color: designTokens.status.warning.fg }}>
                    {minPhotos === 1 ? "Agregue al menos 1 foto de la actividad" : `Agregue al menos ${minPhotos} fotos de la actividad`}
                  </Typography>
                )}
                {progress.required > 0 && (
                  <Typography
                    variant="caption"
                    component="div"
                    sx={{
                      fontVariantNumeric: "tabular-nums",
                      color: progress.requiredDone === progress.required ? designTokens.status.success.fg : designTokens.textCaption,
                    }}
                  >
                    {progress.requiredDone === progress.required
                      ? "Lo obligatorio está completo"
                      : `Faltan ${progress.required - progress.requiredDone} obligatorias`}
                  </Typography>
                )}
              </Box>
              <Button
                variant="contained"
                size="large"
                startIcon={enviarMutation.isPending ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
                onClick={handleSubmitClick}
                disabled={enviarMutation.isPending || !!autosave.conflict || photosMissing > 0 || uploadingPhotos}
              >
                {enviarMutation.isPending ? "Enviando…" : uploadingPhotos ? "Subiendo fotos…" : isResend ? "Reenviar informe" : "Enviar informe"}
              </Button>
            </Stack>
          )}
        </>
      )}

      <ConfirmacionAccion
        open={confirm === "enviar"}
        titulo={isResend ? "Reenviar informe" : "Enviar informe a revisión"}
        descripcion={
          isResend
            ? "El informe vuelve a revisión con tus correcciones y conserva su número. Mientras tanto nadie podrá editarlo."
            : "Al enviarlo recibe su número, quedan fijados los delegados del equipo y nadie podrá editarlo mientras se revisa. La actividad tampoco se podrá cambiar."
        }
        confirmLabel={isResend ? "Reenviar" : "Enviar"}
        onConfirm={() => {
          setConfirm(null);
          enviarMutation.mutate();
        }}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmacionAccion
        open={confirm === "aprobar"}
        titulo="Aprobar informe"
        descripcion="El informe quedará aprobado."
        confirmLabel="Aprobar"
        loading={reviewMutation.isPending}
        onConfirm={() => {
          setConfirm(null);
          reviewMutation.mutate({ action: "aprobar" });
        }}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmacionAccion
        open={confirm === "observar"}
        titulo="Observar informe"
        descripcion="Vuelve a los delegados con tu comentario: cualquiera de ellos lo corrige y lo reenvía."
        requiereComentario
        confirmLabel="Observar"
        onConfirm={(comment) => {
          setConfirm(null);
          reviewMutation.mutate({ action: "observar", comment });
        }}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmacionAccion
        open={confirm === "rechazar"}
        titulo="Rechazar informe"
        descripcion="Vuelve a los delegados con tu comentario, con todas sus respuestas y fotos, para que lo corrijan y lo reenvíen. Solo anular es definitivo."
        requiereComentario
        variant="destructive"
        confirmLabel="Rechazar"
        onConfirm={(comment) => {
          setConfirm(null);
          reviewMutation.mutate({ action: "rechazar", comment });
        }}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmacionAccion
        open={confirm === "anular"}
        titulo="Anular informe"
        descripcion="El informe quedará anulado de forma permanente, esté en el estado que esté."
        requiereComentario
        variant="destructive"
        confirmLabel="Anular"
        onConfirm={(comment) => {
          setConfirm(null);
          reviewMutation.mutate({ action: "anular", comment });
        }}
        onCancel={() => setConfirm(null)}
      />

      <ToastSnackbar toast={toast} onClose={closeToast} />
    </Stack>
  );
}
