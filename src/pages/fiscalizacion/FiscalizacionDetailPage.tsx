import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { Alert, Box, Button, CircularProgress, Divider, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBackRounded";
import SendIcon from "@mui/icons-material/SendOutlined";
import ReplayIcon from "@mui/icons-material/ReplayOutlined";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
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

function formatDateTime(value: string): string {
  return dayjs(value).format("DD/MM/YYYY HH:mm");
}

const ANSWER_TYPE_LABELS: Record<string, string> = {
  SI_NO: "Sí / No",
  SI_NO_PARCIAL: "Sí / No / Parcial",
  TEXTO_LIBRE: "Texto libre",
};

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

  if (formularioQuery.isLoading) {
    return (
      <Stack alignItems="center" sx={{ py: 8 }}>
        <CircularProgress />
      </Stack>
    );
  }

  if (formularioQuery.isError || !formulario) {
    return <Alert severity="error">{getApiErrorMessage(formularioQuery.error, "No se pudo cargar el formulario.")}</Alert>;
  }

  const canSendToReview = canEdit && (formulario.status === "REGISTRADA" || formulario.status === "OBSERVADA");
  const canResume = canEdit && formulario.status === "OBSERVADA";
  const canApprove = isReviewer && formulario.status === "PENDIENTE_REVISION";
  const canObservar = isReviewer && formulario.status === "PENDIENTE_REVISION";
  const canRechazar = isReviewer && formulario.status === "PENDIENTE_REVISION";
  const canAnular = isAdmin && formulario.status !== "ANULADA";

  return (
    <Stack spacing={2.5}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate("/fiscalizacion")}
        sx={{ alignSelf: "flex-start" }}
        color="inherit"
      >
        Volver a fiscalización
      </Button>

      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" rowGap={1}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Typography variant="h3">{formulario.formNumber ?? "Sin número asignado"}</Typography>
          <EstadoActaChip estado={formulario.status} />
        </Stack>

        <Stack direction="row" spacing={1.5} flexWrap="wrap" rowGap={1}>
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
              startIcon={<CheckCircleOutlineRoundedIcon />}
              onClick={() => setConfirmAction("aprobar")}
              disabled={aprobarMutation.isPending}
            >
              Aprobar
            </Button>
          )}
          {canAnular && (
            <Button
              variant="text"
              color="error"
              startIcon={<BlockOutlinedIcon />}
              onClick={() => setConfirmAction("anular")}
              disabled={anularMutation.isPending}
            >
              Anular
            </Button>
          )}
        </Stack>
      </Stack>

      {formulario.status === "OBSERVADA" && (
        <Alert severity="info">
          Este formulario fue observado por el revisor. Consulta con el revisor por fuera del
          sistema qué hay que corregir antes de reanudarlo.
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 2.5 }}>
        <Stack spacing={1.5}>
          <Typography variant="h4">Identificación</Typography>
          <Stack direction="row" flexWrap="wrap" columnGap={4} rowGap={1.5}>
            <InfoField label="Centro de servicio" value={formulario.serviceCenterName} />
            <InfoField label="Fecha" value={formulario.formDate} />
            <InfoField label="Hora de llegada" value={formulario.arrivalTime ?? "—"} />
            <InfoField label="Hora de salida" value={formulario.departureTime ?? "—"} />
            <InfoField label="Delegado" value={formulario.delegateName} />
            <InfoField label="Creado el" value={formatDateTime(formulario.createdAt)} />
            <InfoField label="Última actualización" value={formatDateTime(formulario.updatedAt)} />
          </Stack>
          {formulario.observations && (
            <>
              <Divider />
              <InfoField label="Observaciones" value={formulario.observations} />
            </>
          )}
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2.5 }}>
        <Stack spacing={1.5}>
          <Typography variant="h4">Checklist de fiscalización</Typography>
          {formulario.respuestas.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Sin respuestas registradas.
            </Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Pregunta</TableCell>
                  <TableCell width={160}>Tipo</TableCell>
                  <TableCell width={160}>Respuesta</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {formulario.respuestas.map((r) => (
                  <TableRow key={r.questionId}>
                    <TableCell>{r.questionText}</TableCell>
                    <TableCell>{ANSWER_TYPE_LABELS[r.answerType] ?? r.answerType}</TableCell>
                    <TableCell>{r.answer || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Stack>
      </Paper>

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

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" display="block">
        {label}
      </Typography>
      <Typography variant="body2">{value}</Typography>
    </Box>
  );
}
