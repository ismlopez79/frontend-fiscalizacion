import { useState } from "react";
import type { ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Box, Button, Divider, Skeleton, Stack, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBackRounded";
import SendIcon from "@mui/icons-material/SendOutlined";
import ReplayIcon from "@mui/icons-material/ReplayOutlined";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import FlagOutlinedIcon from "@mui/icons-material/FlagOutlined";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import BlockOutlinedIcon from "@mui/icons-material/BlockOutlined";
import { fiscalizationFormApi } from "@/api/fiscalizationFormApi";
import { getApiErrorMessage } from "@/utils/apiError";
import { useAuth } from "@/hooks/useAuth";
import { EstadoActaChip } from "@/components/EstadoActaChip";
import { ConfirmacionAccion } from "@/components/ConfirmacionAccion";
import { useToast } from "@/hooks/useToast";
import { ToastSnackbar } from "@/components/ToastSnackbar";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeader, Surface } from "@/components/ui/Surface";
import { Callout } from "@/components/ui/Callout";
import { DetailRow } from "@/components/ui/DetailRow";
import { designTokens } from "@/theme/theme";
import { formatDate, formatDateTime, formatTime } from "@/utils/dateFormat";
import type { FiscalizationAnswerResponse } from "@/types/fiscalizacionForm";
import { ANSWER_TYPE_LABELS } from "./fiscalizacionUi";

export function FiscalizacionDetailPage() {
  const { id } = useParams();
  const formId = Number(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast, showToast, closeToast } = useToast();

  const [confirmAction, setConfirmAction] = useState<
    "enviar-revision" | "reanudar" | "aprobar" | "observar" | "rechazar" | "anular" | null
  >(null);

  const formularioQuery = useQuery({
    queryKey: ["formularios-fiscalizacion", formId],
    queryFn: () => fiscalizationFormApi.getFormulario(formId),
    enabled: Number.isFinite(formId),
  });

  const formulario = formularioQuery.data;
  const isAdmin = !!user?.roles.includes("ADMINISTRADOR");
  const isReviewer = isAdmin || !!user?.roles.includes("SUPERVISOR");
  // Si la carga del detalle tuvo exito sin FORM_VIEW_ALL, es porque es propio
  // (el backend ya responde 403 antes de llegar aqui si fuera ajeno) — por
  // eso alcanza con el rol para decidir las acciones de edicion propia.
  // DELEGADO_TEMPORAL y DIGITADOR (delegado permanente) tienen FORM_EDIT_OWN.
  const canEdit =
    isAdmin || !!user?.roles.includes("DELEGADO_TEMPORAL") || !!user?.roles.includes("DIGITADOR");

  const invalidateFormulario = () => {
    queryClient.invalidateQueries({ queryKey: ["formularios-fiscalizacion"] });
  };

  const enviarRevisionMutation = useMutation({
    mutationFn: () => fiscalizationFormApi.enviarRevision(formId),
    onSuccess: () => {
      invalidateFormulario();
      showToast("success", "Formulario enviado a revisión.");
    },
    onError: (error) => showToast("error", getApiErrorMessage(error, "No se pudo enviar a revisión.")),
  });

  const reanudarMutation = useMutation({
    mutationFn: () => fiscalizationFormApi.reanudar(formId),
    onSuccess: () => {
      invalidateFormulario();
      showToast("success", "Formulario reanudado. Ya puedes corregirlo y reenviarlo.");
    },
    onError: (error) => showToast("error", getApiErrorMessage(error, "No se pudo reanudar el formulario.")),
  });

  const aprobarMutation = useMutation({
    mutationFn: (comment?: string) => fiscalizationFormApi.aprobar(formId, comment),
    onSuccess: () => {
      invalidateFormulario();
      showToast("success", "Formulario aprobado.");
    },
    onError: (error) => showToast("error", getApiErrorMessage(error, "No se pudo aprobar el formulario.")),
  });

  const observarMutation = useMutation({
    mutationFn: (comment: string) => fiscalizationFormApi.observar(formId, comment),
    onSuccess: () => {
      invalidateFormulario();
      showToast("success", "Formulario observado.");
    },
    onError: (error) => showToast("error", getApiErrorMessage(error, "No se pudo observar el formulario.")),
  });

  const rechazarMutation = useMutation({
    mutationFn: (comment: string) => fiscalizationFormApi.rechazar(formId, comment),
    onSuccess: () => {
      invalidateFormulario();
      showToast("success", "Formulario rechazado.");
    },
    onError: (error) => showToast("error", getApiErrorMessage(error, "No se pudo rechazar el formulario.")),
  });

  const anularMutation = useMutation({
    mutationFn: (comment: string) => fiscalizationFormApi.anular(formId, comment),
    onSuccess: () => {
      invalidateFormulario();
      showToast("success", "Formulario anulado.");
    },
    onError: (error) => showToast("error", getApiErrorMessage(error, "No se pudo anular el formulario.")),
  });

  const backButton = (
    <Button size="small" color="inherit" startIcon={<ArrowBackIcon />} onClick={() => navigate("/fiscalizacion")}>
      Fiscalización
    </Button>
  );

  if (formularioQuery.isLoading) {
    return (
      <Stack spacing={2.5} sx={{ flexShrink: 0 }} aria-busy="true">
        <Box>
          <Box sx={{ ml: -1, mb: 1 }}>{backButton}</Box>
          <Skeleton width={240} height={40} />
          <Skeleton width={300} />
        </Box>
        <Surface>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={36} />
          ))}
        </Surface>
        <Surface>
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} height={44} />
          ))}
        </Surface>
      </Stack>
    );
  }

  if (formularioQuery.isError || !formulario) {
    return (
      <Stack spacing={2} sx={{ flexShrink: 0 }}>
        <Box sx={{ ml: -1 }}>{backButton}</Box>
        <Callout tone="error" title="No se pudo cargar el formulario">
          {getApiErrorMessage(formularioQuery.error, "Puede que ya no exista o que no tengas acceso a él.")}
        </Callout>
      </Stack>
    );
  }

  const canSendToReview = canEdit && (formulario.status === "REGISTRADA" || formulario.status === "OBSERVADA");
  const canResume = canEdit && formulario.status === "OBSERVADA";
  const canApprove = isReviewer && formulario.status === "PENDIENTE_REVISION";
  const canObservar = isReviewer && formulario.status === "PENDIENTE_REVISION";
  const canRechazar = isReviewer && formulario.status === "PENDIENTE_REVISION";
  const canAnular = isAdmin && formulario.status !== "ANULADA";

  const arrival = formatTime(formulario.arrivalTime);
  const departure = formatTime(formulario.departureTime);
  const answered = formulario.respuestas.length;

  return (
    <Stack spacing={{ xs: 2, md: 2.5 }} sx={{ flexShrink: 0, pb: 2 }}>
      <PageHeader
        back={backButton}
        title={
          formulario.formNumber ? (
            <Box component="span" sx={{ fontVariantNumeric: "tabular-nums" }}>
              {formulario.formNumber}
            </Box>
          ) : (
            "Sin número asignado"
          )
        }
        titleAdornment={<EstadoActaChip estado={formulario.status} size="medium" />}
        subtitle={`${formulario.serviceCenterName} · ${formatDate(formulario.formDate)} · ${formulario.delegateName}`}
        actions={
          <>
            {canAnular && (
              <Button
                color="error"
                startIcon={<BlockOutlinedIcon />}
                onClick={() => setConfirmAction("anular")}
                disabled={anularMutation.isPending}
              >
                Anular
              </Button>
            )}
            {canResume && (
              <Button
                variant="outlined"
                startIcon={<ReplayIcon />}
                onClick={() => setConfirmAction("reanudar")}
                disabled={reanudarMutation.isPending}
              >
                Reanudar para corregir
              </Button>
            )}
            {canSendToReview && (
              <Button
                variant="contained"
                startIcon={<SendIcon />}
                onClick={() => setConfirmAction("enviar-revision")}
                disabled={enviarRevisionMutation.isPending}
              >
                Enviar a revisión
              </Button>
            )}
            {canRechazar && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<CancelOutlinedIcon />}
                onClick={() => setConfirmAction("rechazar")}
                disabled={rechazarMutation.isPending}
              >
                Rechazar
              </Button>
            )}
            {canObservar && (
              <Button
                variant="outlined"
                color="warning"
                startIcon={<FlagOutlinedIcon />}
                onClick={() => setConfirmAction("observar")}
                disabled={observarMutation.isPending}
              >
                Observar
              </Button>
            )}
            {canApprove && (
              <Button
                variant="contained"
                color="success"
                startIcon={<CheckRoundedIcon />}
                onClick={() => setConfirmAction("aprobar")}
                disabled={aprobarMutation.isPending}
              >
                Aprobar
              </Button>
            )}
          </>
        }
      />

      {formulario.status === "OBSERVADA" && (
        <Callout tone="info" title="El revisor observó este formulario">
          Consulta con el revisor qué hay que corregir antes de reanudarlo.
        </Callout>
      )}

      <Surface>
        <SectionHeader title="Identificación" />
        <Box
          component="dl"
          sx={{ m: 0, display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, columnGap: 4, rowGap: 1.5 }}
        >
          <DetailRow label="Centro de servicio" value={formulario.serviceCenterName} />
          <DetailRow label="Fecha" value={formatDate(formulario.formDate)} numeric />
          <DetailRow label="Hora de llegada" value={arrival} numeric />
          <DetailRow label="Hora de salida" value={departure} numeric />
          <DetailRow label="Delegado" value={formulario.delegateName} />
          <DetailRow label="Creado" value={formatDateTime(formulario.createdAt)} numeric />
          <DetailRow label="Actualizado" value={formatDateTime(formulario.updatedAt)} numeric />
        </Box>
        {formulario.observations && (
          <>
            <Divider sx={{ my: 2.5, borderColor: "rgba(15, 23, 42, 0.06)" }} />
            <Typography variant="body2" sx={{ color: designTokens.textCaption, mb: 0.5 }}>
              Observaciones
            </Typography>
            <Typography variant="body1" sx={{ whiteSpace: "pre-line", maxWidth: "70ch" }}>
              {formulario.observations}
            </Typography>
          </>
        )}
      </Surface>

      <Surface>
        <SectionHeader
          title="Checklist de fiscalización"
          subtitle={answered > 0 ? `${answered} ${answered === 1 ? "pregunta respondida" : "preguntas respondidas"}.` : undefined}
        />
        {answered === 0 ? (
          <Typography variant="body2">Sin respuestas registradas.</Typography>
        ) : (
          <Box component="ol" sx={{ listStyle: "none", m: 0, p: 0 }}>
            {formulario.respuestas.map((r) => (
              <AnswerRow key={r.questionId} respuesta={r} />
            ))}
          </Box>
        )}
      </Surface>

      <ConfirmacionAccion
        open={confirmAction === "enviar-revision"}
        titulo="Enviar formulario a revisión"
        descripcion="El formulario pasará a estado Pendiente de revisión y ya no podrás editarlo hasta que un revisor lo apruebe u observe."
        confirmLabel="Enviar"
        onConfirm={() => {
          setConfirmAction(null);
          enviarRevisionMutation.mutate();
        }}
        onCancel={() => setConfirmAction(null)}
      />

      <ConfirmacionAccion
        open={confirmAction === "reanudar"}
        titulo="Reanudar formulario observado"
        descripcion="El formulario volverá a estado Registrada para que puedas corregirlo y enviarlo de nuevo a revisión."
        confirmLabel="Reanudar"
        onConfirm={() => {
          setConfirmAction(null);
          reanudarMutation.mutate();
        }}
        onCancel={() => setConfirmAction(null)}
      />

      <ConfirmacionAccion
        open={confirmAction === "aprobar"}
        titulo="Aprobar formulario"
        descripcion="El formulario pasará a estado Aprobada."
        confirmLabel="Aprobar"
        onConfirm={(comment) => {
          setConfirmAction(null);
          aprobarMutation.mutate(comment);
        }}
        onCancel={() => setConfirmAction(null)}
      />

      <ConfirmacionAccion
        open={confirmAction === "observar"}
        titulo="Observar formulario"
        descripcion="El formulario volverá al delegado con tu comentario para que lo corrija y lo reenvíe."
        requiereComentario
        confirmLabel="Observar"
        onConfirm={(comment) => {
          setConfirmAction(null);
          if (comment) observarMutation.mutate(comment);
        }}
        onCancel={() => setConfirmAction(null)}
      />

      <ConfirmacionAccion
        open={confirmAction === "rechazar"}
        titulo="Rechazar formulario"
        descripcion="El formulario quedará en estado Rechazada. Esta acción no se puede deshacer, salvo anulándolo."
        requiereComentario
        variant="destructive"
        confirmLabel="Rechazar"
        onConfirm={(comment) => {
          setConfirmAction(null);
          if (comment) rechazarMutation.mutate(comment);
        }}
        onCancel={() => setConfirmAction(null)}
      />

      <ConfirmacionAccion
        open={confirmAction === "anular"}
        titulo="Anular formulario"
        descripcion="El formulario quedará en estado Anulada de forma permanente, sin importar en qué estado esté ahora."
        requiereComentario
        variant="destructive"
        confirmLabel="Anular"
        onConfirm={(comment) => {
          setConfirmAction(null);
          if (comment) anularMutation.mutate(comment);
        }}
        onCancel={() => setConfirmAction(null)}
      />

      <ToastSnackbar toast={toast} onClose={closeToast} />
    </Stack>
  );
}

const ANSWER_TONE: Record<string, { bg: string; fg: string }> = {
  Sí: designTokens.status.success,
  No: designTokens.status.error,
  Parcial: designTokens.status.warning,
};

/** Pregunta + respuesta. Si/No/Parcial como pastilla (texto + color); texto libre como parrafo debajo. */
function AnswerRow({ respuesta: r }: { respuesta: FiscalizationAnswerResponse }) {
  const isText = r.answerType === "TEXTO_LIBRE";
  const tone = ANSWER_TONE[r.answer];
  let answer: ReactNode;
  if (!r.answer) {
    answer = (
      <Typography variant="body2" sx={{ color: designTokens.textDisabled }}>
        Sin respuesta
      </Typography>
    );
  } else if (isText || !tone) {
    answer = (
      <Typography variant="body2" sx={{ color: "text.primary", whiteSpace: "pre-line", mt: 0.5 }}>
        {r.answer}
      </Typography>
    );
  } else {
    answer = (
      <Box
        component="span"
        sx={{
          px: 1.25,
          height: 26,
          display: "inline-flex",
          alignItems: "center",
          borderRadius: 999,
          bgcolor: tone.bg,
          color: tone.fg,
          fontWeight: 700,
          fontSize: "0.8125rem",
          flexShrink: 0,
        }}
      >
        {r.answer}
      </Box>
    );
  }

  return (
    <Box
      component="li"
      sx={{ py: 1.5, borderTop: "1px solid rgba(15, 23, 42, 0.06)", "&:first-of-type": { borderTop: "none", pt: 0 } }}
    >
      <Stack direction={isText ? "column" : "row"} alignItems={isText ? "stretch" : "center"} gap={isText ? 0 : 2}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" sx={{ color: "text.primary", fontWeight: 500 }}>
            {r.questionText}
          </Typography>
          <Typography variant="caption" sx={{ fontWeight: 500 }}>
            {ANSWER_TYPE_LABELS[r.answerType] ?? r.answerType}
          </Typography>
        </Box>
        {answer}
      </Stack>
    </Box>
  );
}
