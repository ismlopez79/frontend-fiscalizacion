import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Box,
  Button,
  ButtonBase,
  CircularProgress,
  Dialog,
  DialogContent,
  Divider,
  Grid,
  IconButton,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBackRounded";
import UploadFileIcon from "@mui/icons-material/UploadFileOutlined";
import DownloadIcon from "@mui/icons-material/DownloadOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import SendIcon from "@mui/icons-material/SendOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import ReplayIcon from "@mui/icons-material/ReplayOutlined";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import FlagOutlinedIcon from "@mui/icons-material/FlagOutlined";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import BlockOutlinedIcon from "@mui/icons-material/BlockOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";
import { actaApi } from "@/api/actaApi";
import { getApiErrorMessage } from "@/utils/apiError";
import { downloadBlob } from "@/utils/downloadBlob";
import { useAuth } from "@/hooks/useAuth";
import { useIsTemporaryDelegate } from "@/hooks/useMyAccount";
import { EstadoActaChip } from "@/components/EstadoActaChip";
import { ConfirmacionAccion } from "@/components/ConfirmacionAccion";
import { designTokens } from "@/theme/theme";
import { useToast } from "@/hooks/useToast";
import { ToastSnackbar } from "@/components/ToastSnackbar";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeader, Surface } from "@/components/ui/Surface";
import { Callout } from "@/components/ui/Callout";
import { DetailRow } from "@/components/ui/DetailRow";
import type { ActaFileDto, ProduccionResponse } from "@/types/acta";
import { AcompanantesList, actaNumberFormatter as fmt, formatActaDate, formatActaDateTime, formatTime } from "./actaUi";

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "application/pdf"];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ActaDetailPage() {
  const { id } = useParams();
  const actaId = Number(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { toast, showToast, closeToast } = useToast();
  const [confirmAction, setConfirmAction] = useState<
    "enviar-revision" | "reanudar" | "aprobar" | "observar" | "rechazar" | "anular" | null
  >(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [previewLoadingId, setPreviewLoadingId] = useState<number | null>(null);
  const [previewFile, setPreviewFile] = useState<{ file: ActaFileDto; url: string } | null>(null);
  const [fileToDelete, setFileToDelete] = useState<ActaFileDto | null>(null);

  // El blob URL del preview solo vive en memoria del navegador — hay que
  // liberarlo explicitamente (revokeObjectURL) al cerrar o cambiar de
  // archivo, si no se queda pegado hasta que se recargue la pagina.
  useEffect(() => {
    return () => {
      if (previewFile) URL.revokeObjectURL(previewFile.url);
    };
  }, [previewFile]);

  const actaQuery = useQuery({
    queryKey: ["actas", actaId],
    queryFn: () => actaApi.getActa(actaId),
    enabled: Number.isFinite(actaId),
  });

  const archivosQuery = useQuery({
    queryKey: ["actas", actaId, "archivos"],
    queryFn: () => actaApi.getArchivos(actaId),
    enabled: Number.isFinite(actaId),
  });

  const acta = actaQuery.data;
  // Dueño = mismo username Y mismo tipo de cuenta: permanentes y temporales
  // viven en tablas distintas y podrian compartir username.
  const isTemporary = useIsTemporaryDelegate();
  const isOwner =
    !!acta && acta.createdByUsername === user?.username && (acta.createdByType === "TEMPORARY") === isTemporary;
  const isAdmin = !!user?.roles.includes("ADMINISTRADOR");
  const isReviewer = isAdmin || !!user?.roles.includes("SUPERVISOR");
  const canAct = isOwner || isAdmin;

  /**
   * Prefijo, no solo ["actas", actaId]: cualquier accion de revision puede
   * sacar (o meter) esta acta de otros listados con cache propia (mis actas,
   * bandeja de pendientes), asi que hay que refrescarlos todos a la vez.
   */
  const invalidateActa = () => {
    queryClient.invalidateQueries({ queryKey: ["actas"] });
  };

  const enviarRevisionMutation = useMutation({
    mutationFn: () => actaApi.enviarRevision(actaId),
    onSuccess: () => {
      invalidateActa();
      showToast("success", "Acta enviada a revisión.");
    },
    onError: (error) => showToast("error", getApiErrorMessage(error, "No se pudo enviar a revisión.")),
  });

  const reanudarMutation = useMutation({
    mutationFn: () => actaApi.reanudar(actaId),
    onSuccess: () => {
      invalidateActa();
      showToast("success", "Acta reanudada. Ya puedes corregirla y reenviarla.");
    },
    onError: (error) => showToast("error", getApiErrorMessage(error, "No se pudo reanudar el acta.")),
  });

  const aprobarMutation = useMutation({
    mutationFn: (comment?: string) => actaApi.aprobar(actaId, comment),
    onSuccess: () => {
      invalidateActa();
      showToast("success", "Acta aprobada.");
    },
    onError: (error) => showToast("error", getApiErrorMessage(error, "No se pudo aprobar el acta.")),
  });

  const observarMutation = useMutation({
    mutationFn: (comment: string) => actaApi.observar(actaId, comment),
    onSuccess: () => {
      invalidateActa();
      showToast("success", "Acta observada.");
    },
    onError: (error) => showToast("error", getApiErrorMessage(error, "No se pudo observar el acta.")),
  });

  const rechazarMutation = useMutation({
    mutationFn: (comment: string) => actaApi.rechazar(actaId, comment),
    onSuccess: () => {
      invalidateActa();
      showToast("success", "Acta rechazada.");
    },
    onError: (error) => showToast("error", getApiErrorMessage(error, "No se pudo rechazar el acta.")),
  });

  const anularMutation = useMutation({
    mutationFn: (comment: string) => actaApi.anular(actaId, comment),
    onSuccess: () => {
      invalidateActa();
      showToast("success", "Acta anulada.");
    },
    onError: (error) => showToast("error", getApiErrorMessage(error, "No se pudo anular el acta.")),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => actaApi.uploadArchivo(actaId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["actas", actaId, "archivos"] });
      showToast("success", "Archivo adjuntado.");
    },
    onError: (error) => showToast("error", getApiErrorMessage(error, "No se pudo subir el archivo.")),
  });

  const deleteArchivoMutation = useMutation({
    mutationFn: (fileId: number) => actaApi.deleteArchivo(fileId),
    // invalidateActa() ya cubre ["actas", actaId, "archivos"] (match por
    // prefijo). Se refresca en exito y en error por igual: borrar el
    // ultimo archivo puede volver a bloquear "Enviar a revision", y si el
    // error es porque el estado del acta cambio mientras la pantalla
    // estaba abierta, esto trae la realidad actual (botones, lista).
    onSuccess: () => {
      invalidateActa();
      showToast("success", "Archivo eliminado.");
    },
    onError: (error) => {
      invalidateActa();
      showToast("error", getApiErrorMessage(error, "No se pudo eliminar el archivo."));
    },
  });

  const handleFileSelected = (file: File | null) => {
    if (!file) return;
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      showToast("error", "Solo se permiten archivos JPG, PNG o PDF.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      showToast("error", "El archivo supera el máximo de 25 MB.");
      return;
    }
    uploadMutation.mutate(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /** Se genera al vuelo en el backend (no queda guardado en el servidor); solo disponible fuera de BORRADOR. */
  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const blob = await actaApi.descargarPdf(actaId);
      downloadBlob(blob, `Acta-${acta?.actaNumber ?? actaId}.pdf`);
    } catch (error) {
      showToast("error", getApiErrorMessage(error, "No se pudo generar el PDF del acta."));
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleDownload = async (fileId: number, originalName: string) => {
    setDownloadingId(fileId);
    try {
      const blob = await actaApi.descargarArchivo(fileId);
      downloadBlob(blob, originalName);
    } catch (error) {
      showToast("error", getApiErrorMessage(error, "No se pudo descargar el archivo."));
    } finally {
      setDownloadingId(null);
    }
  };

  /**
   * Igual que la descarga (blob autenticado, ver comentario de actaApi), pero
   * en vez de bajarlo al disco lo muestra inline en un dialog — un <img
   * src="..."> directo no puede llevar el header Authorization, por eso hace
   * falta pasar por fetch + blob URL igual que en la descarga.
   */
  const handlePreview = async (file: ActaFileDto) => {
    setPreviewLoadingId(file.id);
    try {
      const blob = await actaApi.descargarArchivo(file.id);
      const url = URL.createObjectURL(blob);
      setPreviewFile({ file, url });
    } catch (error) {
      showToast("error", getApiErrorMessage(error, "No se pudo abrir el archivo."));
    } finally {
      setPreviewLoadingId(null);
    }
  };

  // No hace falta revocar el blob URL aqui: el useEffect de arriba ya lo
  // limpia solo cuando previewFile cambia (incluido este caso, a null).
  const closePreview = () => setPreviewFile(null);

  const backButton = (
    <Button size="small" color="inherit" startIcon={<ArrowBackIcon />} onClick={() => navigate("/actas")}>
      Actas
    </Button>
  );

  if (actaQuery.isLoading) {
    return <DetailSkeleton back={backButton} />;
  }

  if (actaQuery.isError || !acta) {
    return (
      <Stack spacing={2} sx={{ flexShrink: 0 }}>
        <Box sx={{ ml: -1 }}>{backButton}</Box>
        <Callout tone="error" title="No se pudo cargar el acta">
          {getApiErrorMessage(actaQuery.error, "Puede que ya no exista o que no tengas acceso a ella.")}
        </Callout>
      </Stack>
    );
  }

  const canSendToReview = canAct && (acta.status === "REGISTRADA" || acta.status === "OBSERVADA");
  const canResume = canAct && acta.status === "OBSERVADA";
  // PUT /actas/{id}: el dueño (o el administrador) corrige los datos mientras
  // el acta siga en REGISTRADA u OBSERVADA.
  const canEdit = canAct && (acta.status === "REGISTRADA" || acta.status === "OBSERVADA");
  const canUploadFiles = canAct && (acta.status === "REGISTRADA" || acta.status === "OBSERVADA");
  // El backend exige al menos un archivo adjunto para poder enviar a
  // revision (409 BUSINESS_RULE_VIOLATION si no). Mientras la lista de
  // archivos no termina de cargar, tratamos "sin archivos" por defecto —
  // mejor un boton deshabilitado de mas un instante que dejar pasar el
  // click y chocar con el 409.
  const archivos = archivosQuery.data ?? [];
  const hasFiles = archivos.length > 0;
  const sendToReviewBlockedByFiles = canSendToReview && (archivosQuery.isLoading || !hasFiles);
  const canApprove = isReviewer && acta.status === "PENDIENTE_REVISION";
  const canObservar = isReviewer && acta.status === "PENDIENTE_REVISION";
  const canRechazar = isReviewer && acta.status === "PENDIENTE_REVISION";
  const canAnular = isAdmin && acta.status !== "ANULADA";
  const canDownloadPdf = acta.status !== "BORRADOR";

  const arrival = formatTime(acta.arrivalTime);
  const departure = formatTime(acta.departureTime);

  return (
    <Stack spacing={{ xs: 2, md: 2.5 }} sx={{ flexShrink: 0, pb: 2 }}>
      <PageHeader
        back={backButton}
        title={<Box component="span" sx={{ fontVariantNumeric: "tabular-nums" }}>{acta.actaNumber}</Box>}
        titleAdornment={<EstadoActaChip estado={acta.status} size="medium" />}
        subtitle={`${acta.duicentroName} · ${acta.departmentName} · ${formatActaDate(acta.actaDate)}`}
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
            {canDownloadPdf && (
              <Button
                variant="outlined"
                color="inherit"
                startIcon={downloadingPdf ? <CircularProgress size={16} color="inherit" /> : <PictureAsPdfOutlinedIcon />}
                onClick={handleDownloadPdf}
                disabled={downloadingPdf}
              >
                {downloadingPdf ? "Generando…" : "Descargar PDF"}
              </Button>
            )}
            {canEdit && (
              <Button variant="outlined" startIcon={<EditOutlinedIcon />} onClick={() => navigate(`/actas/${actaId}/editar`)}>
                Corregir
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
              <Tooltip
                title={
                  sendToReviewBlockedByFiles
                    ? "Adjunta al menos una foto o PDF del acta antes de enviarla a revisión."
                    : ""
                }
              >
                <span>
                  <Button
                    variant="contained"
                    startIcon={<SendIcon />}
                    onClick={() => setConfirmAction("enviar-revision")}
                    disabled={enviarRevisionMutation.isPending || sendToReviewBlockedByFiles}
                  >
                    Enviar a revisión
                  </Button>
                </span>
              </Tooltip>
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

      {(acta.status === "OBSERVADA" || acta.hasDiscrepancy || acta.possibleDuplicate) && (
        <Stack spacing={1.25}>
          {acta.status === "OBSERVADA" && (
            <Callout tone="info" title="El revisor observó esta acta">
              El motivo todavía no viaja en esta pantalla — consulta con el revisor qué hay que corregir. Usa
              «Corregir» para cambiar los datos y luego vuelve a enviarla a revisión.
            </Callout>
          )}
          {acta.hasDiscrepancy && (
            <Callout tone="warning" title="Los totales no coinciden">
              Declarado {acta.declaredTotal === null ? "—" : fmt.format(acta.declaredTotal)} · calculado{" "}
              {fmt.format(acta.calculatedTotal)}.
            </Callout>
          )}
          {acta.possibleDuplicate && (
            <Callout tone="warning" title="Posible duplicado">
              Esta acta podría ser un duplicado de otra ya registrada.
            </Callout>
          )}
        </Stack>
      )}

      <Grid container spacing={{ xs: 2, md: 2.5 }} alignItems="flex-start">
        <Grid item xs={12} lg={8}>
          <Stack spacing={{ xs: 2, md: 2.5 }}>
            <Surface>
              <SectionHeader
                title="Producciones"
                subtitle={
                  acta.producciones.length === 1 ? "1 producción registrada." : `${acta.producciones.length} producciones registradas.`
                }
              />
              <Stack divider={<Divider flexItem sx={{ borderColor: "rgba(15, 23, 42, 0.06)" }} />} spacing={2.5}>
                {acta.producciones.map((p) => (
                  <ProduccionBlock key={p.id} produccion={p} />
                ))}
              </Stack>
            </Surface>

            <Surface>
              <SectionHeader title="Incidentes" />
              {acta.incidentes.length === 0 ? (
                <Typography variant="body2">Sin incidentes reportados.</Typography>
              ) : (
                <Stack spacing={1.25}>
                  {acta.incidentes.map((incidente) => (
                    <Stack
                      key={incidente.id}
                      direction="row"
                      gap={1.5}
                      sx={{ p: 1.5, borderRadius: "14px", bgcolor: "rgba(15, 23, 42, 0.03)" }}
                    >
                      <ReportProblemOutlinedIcon sx={{ fontSize: 20, color: designTokens.status.warning.fg, mt: "1px" }} />
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: "text.primary" }}>
                          {incidente.incidentTypeName}
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 0.25, whiteSpace: "pre-line" }}>
                          {incidente.description}
                        </Typography>
                      </Box>
                    </Stack>
                  ))}
                </Stack>
              )}
            </Surface>

            {(acta.acompanantes ?? []).length > 0 && (
              <Surface>
                <SectionHeader
                  title="Delegados temporales acompañantes"
                  subtitle="Acompañaron al delegado permanente en esta acta."
                />
                <AcompanantesList acompanantes={acta.acompanantes} />
              </Surface>
            )}

            {acta.observations && (
              <Surface>
                <SectionHeader title="Observaciones" />
                <Typography variant="body1" sx={{ whiteSpace: "pre-line", maxWidth: "70ch" }}>
                  {acta.observations}
                </Typography>
              </Surface>
            )}
          </Stack>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Stack spacing={{ xs: 2, md: 2.5 }}>
            <Surface>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Total calculado
              </Typography>
              <Typography
                sx={{
                  fontSize: "2.5rem",
                  fontWeight: 700,
                  letterSpacing: "-0.035em",
                  lineHeight: 1.1,
                  fontVariantNumeric: "tabular-nums",
                  color: "text.primary",
                }}
              >
                {fmt.format(acta.calculatedTotal)}
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5, fontVariantNumeric: "tabular-nums" }}>
                Declarado en papel:{" "}
                <Box
                  component="strong"
                  sx={{ color: acta.hasDiscrepancy ? designTokens.status.warning.fg : "text.primary" }}
                >
                  {acta.declaredTotal === null ? "no indicado" : fmt.format(acta.declaredTotal)}
                </Box>
              </Typography>

              <Divider sx={{ my: 2.5, borderColor: "rgba(15, 23, 42, 0.06)" }} />

              <Box component="dl" sx={{ m: 0, display: "grid", gap: 1.5 }}>
                <DetailRow label="Departamento" value={acta.departmentName} />
                <DetailRow label="Duicentro" value={acta.duicentroName} />
                <DetailRow label="Fecha" value={formatActaDate(acta.actaDate)} numeric />
                <DetailRow
                  label="Horario"
                  value={arrival || departure ? `${arrival ?? "—"} – ${departure ?? "—"}` : null}
                  numeric
                />
                <DetailRow label="Delegado JVE" value={acta.jveDelegateName} />
                <DetailRow label="Delegado RNPN" value={acta.rnpnDelegateName} />
                <DetailRow label="Jefe de duicentro" value={acta.duicentroChiefName} />
              </Box>

              <Divider sx={{ my: 2.5, borderColor: "rgba(15, 23, 42, 0.06)" }} />

              <Box component="dl" sx={{ m: 0, display: "grid", gap: 1.5 }}>
                <DetailRow
                  label="Creada por"
                  value={
                    acta.createdByType === "TEMPORARY"
                      ? `${acta.createdByUsername} · Delegado temporal`
                      : acta.createdByUsername
                  }
                />
                <DetailRow label="Creada" value={formatActaDateTime(acta.createdAt)} numeric />
                <DetailRow label="Actualizada" value={formatActaDateTime(acta.updatedAt)} numeric />
              </Box>
            </Surface>

            <Surface>
              <SectionHeader
                title="Archivos"
                subtitle={hasFiles ? `${archivos.length} adjunto${archivos.length === 1 ? "" : "s"}.` : undefined}
              />

              {canUploadFiles && (
                <ButtonBase
                  component="label"
                  disabled={uploadMutation.isPending}
                  sx={{
                    width: "100%",
                    mb: hasFiles ? 2 : 1.5,
                    py: 2,
                    px: 2,
                    gap: 1.25,
                    justifyContent: "flex-start",
                    borderRadius: "14px",
                    border: "1.5px dashed",
                    borderColor: !hasFiles && !archivosQuery.isLoading ? designTokens.status.warning.border : "rgba(15, 23, 42, 0.14)",
                    color: "text.primary",
                    textAlign: "left",
                    transition: `background-color 150ms ease, border-color 150ms ease, transform 160ms ${designTokens.easeOut}`,
                    "&:active": { transform: "scale(0.985)" },
                    "@media (hover: hover) and (pointer: fine)": {
                      "&:hover": { bgcolor: designTokens.accentSoft, borderColor: designTokens.accent },
                    },
                    "&:focus-within": { boxShadow: designTokens.focusRing },
                  }}
                >
                  {uploadMutation.isPending ? (
                    <CircularProgress size={20} />
                  ) : (
                    <UploadFileIcon sx={{ color: designTokens.accent }} />
                  )}
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: "text.primary" }}>
                      {uploadMutation.isPending ? "Subiendo…" : "Adjuntar foto o PDF"}
                    </Typography>
                    <Typography variant="caption">JPG, PNG o PDF · máx. 25 MB</Typography>
                  </Box>
                  <input
                    ref={fileInputRef}
                    type="file"
                    hidden
                    accept="image/jpeg,image/png,application/pdf"
                    onChange={(e) => handleFileSelected(e.target.files?.[0] ?? null)}
                  />
                </ButtonBase>
              )}

              {canUploadFiles && !archivosQuery.isLoading && !hasFiles && (
                <Typography variant="body2" sx={{ color: designTokens.status.warning.fg, mb: 0.5 }}>
                  Adjunta al menos una foto o PDF del acta física para poder enviarla a revisión.
                </Typography>
              )}

              {archivosQuery.isLoading ? (
                <Stack spacing={1}>
                  <Skeleton variant="rounded" height={52} sx={{ borderRadius: "12px" }} />
                  <Skeleton variant="rounded" height={52} sx={{ borderRadius: "12px" }} />
                </Stack>
              ) : !hasFiles ? (
                !canUploadFiles && <Typography variant="body2">Sin archivos adjuntos.</Typography>
              ) : (
                <Stack spacing={0.5}>
                  {archivos.map((file) => {
                    const isPdf = file.mimeType === "application/pdf";
                    return (
                      <Stack
                        key={file.id}
                        direction="row"
                        alignItems="center"
                        gap={1.25}
                        sx={{
                          py: 1,
                          px: 1,
                          mx: -1,
                          borderRadius: "12px",
                          transition: "background-color 120ms ease",
                          "@media (hover: hover) and (pointer: fine)": {
                            "&:hover": { bgcolor: "rgba(15, 23, 42, 0.03)" },
                          },
                        }}
                      >
                        <Box
                          sx={{
                            width: 36,
                            height: 36,
                            borderRadius: "10px",
                            flexShrink: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            bgcolor: isPdf ? designTokens.status.error.bg : designTokens.accentSoft,
                            color: isPdf ? designTokens.status.error.fg : designTokens.accent,
                          }}
                        >
                          {isPdf ? <PictureAsPdfOutlinedIcon fontSize="small" /> : <ImageOutlinedIcon fontSize="small" />}
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" noWrap sx={{ fontWeight: 600, color: "text.primary" }} title={file.originalName}>
                            {file.originalName}
                          </Typography>
                          <Typography variant="caption" noWrap component="div" sx={{ fontWeight: 500 }}>
                            {formatBytes(file.sizeBytes)} · {file.uploadedByUsername}
                          </Typography>
                        </Box>
                        <Stack direction="row" sx={{ flexShrink: 0 }}>
                          <Tooltip title="Ver">
                            <span>
                              <IconButton
                                size="small"
                                aria-label={`Ver ${file.originalName}`}
                                onClick={() => handlePreview(file)}
                                disabled={previewLoadingId === file.id}
                              >
                                {previewLoadingId === file.id ? (
                                  <CircularProgress size={16} />
                                ) : (
                                  <VisibilityOutlinedIcon fontSize="small" />
                                )}
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title="Descargar">
                            <span>
                              <IconButton
                                size="small"
                                aria-label={`Descargar ${file.originalName}`}
                                onClick={() => handleDownload(file.id, file.originalName)}
                                disabled={downloadingId === file.id}
                              >
                                <DownloadIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          {canUploadFiles && (
                            <Tooltip title="Eliminar">
                              <span>
                                <IconButton
                                  size="small"
                                  aria-label={`Eliminar ${file.originalName}`}
                                  onClick={() => setFileToDelete(file)}
                                  disabled={deleteArchivoMutation.isPending}
                                  sx={{ color: designTokens.status.error.fg }}
                                >
                                  <DeleteOutlineIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          )}
                        </Stack>
                      </Stack>
                    );
                  })}
                </Stack>
              )}
            </Surface>
          </Stack>
        </Grid>
      </Grid>

      <ConfirmacionAccion
        open={confirmAction === "enviar-revision"}
        titulo="Enviar acta a revisión"
        descripcion="El acta pasará a estado Pendiente de revisión y ya no podrás editarla hasta que un revisor la apruebe u observe."
        confirmLabel="Enviar"
        onConfirm={() => {
          setConfirmAction(null);
          enviarRevisionMutation.mutate();
        }}
        onCancel={() => setConfirmAction(null)}
      />

      <ConfirmacionAccion
        open={confirmAction === "reanudar"}
        titulo="Reanudar acta observada"
        descripcion="El acta volverá a estado Registrada para que puedas corregirla y enviarla de nuevo a revisión."
        confirmLabel="Reanudar"
        onConfirm={() => {
          setConfirmAction(null);
          reanudarMutation.mutate();
        }}
        onCancel={() => setConfirmAction(null)}
      />

      <ConfirmacionAccion
        open={confirmAction === "aprobar"}
        titulo="Aprobar acta"
        descripcion="El acta pasará a estado Aprobada."
        confirmLabel="Aprobar"
        onConfirm={(comment) => {
          setConfirmAction(null);
          aprobarMutation.mutate(comment);
        }}
        onCancel={() => setConfirmAction(null)}
      />

      <ConfirmacionAccion
        open={confirmAction === "observar"}
        titulo="Observar acta"
        descripcion="El acta volverá al digitador con tu comentario para que la corrija y la reenvíe."
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
        titulo="Rechazar acta"
        descripcion="El acta quedará en estado Rechazada. Esta acción no se puede deshacer, salvo anulándola."
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
        titulo="Anular acta"
        descripcion="El acta quedará en estado Anulada de forma permanente, sin importar en qué estado esté ahora."
        requiereComentario
        variant="destructive"
        confirmLabel="Anular"
        onConfirm={(comment) => {
          setConfirmAction(null);
          if (comment) anularMutation.mutate(comment);
        }}
        onCancel={() => setConfirmAction(null)}
      />

      <ConfirmacionAccion
        open={!!fileToDelete}
        titulo="Eliminar archivo"
        descripcion={`¿Eliminar "${fileToDelete?.originalName ?? ""}"? Esta acción no se puede deshacer.`}
        variant="destructive"
        confirmLabel="Eliminar"
        onConfirm={() => {
          if (fileToDelete) deleteArchivoMutation.mutate(fileToDelete.id);
          setFileToDelete(null);
        }}
        onCancel={() => setFileToDelete(null)}
      />

      <Dialog open={!!previewFile} onClose={closePreview} maxWidth="md" fullWidth>
        {previewFile && (
          <>
            <Stack direction="row" alignItems="center" gap={1.5} sx={{ px: 2.5, py: 1.75 }}>
              <Typography sx={{ flex: 1, minWidth: 0, fontWeight: 700 }} noWrap title={previewFile.file.originalName}>
                {previewFile.file.originalName}
              </Typography>
              <Button
                size="small"
                color="inherit"
                startIcon={<DownloadIcon />}
                onClick={() => handleDownload(previewFile.file.id, previewFile.file.originalName)}
              >
                Descargar
              </Button>
              <IconButton size="small" aria-label="Cerrar vista previa" onClick={closePreview}>
                <CloseRoundedIcon fontSize="small" />
              </IconButton>
            </Stack>
            <DialogContent sx={{ p: 0, bgcolor: "rgba(15, 23, 42, 0.04)" }}>
              {previewFile.file.mimeType.startsWith("image/") ? (
                <Box
                  component="img"
                  src={previewFile.url}
                  alt={previewFile.file.originalName}
                  sx={{ display: "block", maxWidth: "100%", maxHeight: "75vh", mx: "auto" }}
                />
              ) : previewFile.file.mimeType === "application/pdf" ? (
                <Box
                  component="iframe"
                  src={previewFile.url}
                  title={previewFile.file.originalName}
                  sx={{ display: "block", width: "100%", height: "75vh", border: "none" }}
                />
              ) : (
                <Stack alignItems="center" spacing={1} sx={{ py: 6 }}>
                  <Typography variant="body2">No hay vista previa disponible para este tipo de archivo.</Typography>
                </Stack>
              )}
            </DialogContent>
          </>
        )}
      </Dialog>

      <ToastSnackbar toast={toast} onClose={closeToast} />
    </Stack>
  );
}

/** Una produccion: encabezado con fecha y totales, y sus categorias como lista con cifra alineada. */
function ProduccionBlock({ produccion: p }: { produccion: ProduccionResponse }) {
  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="baseline" flexWrap="wrap" gap={1} sx={{ mb: 1.25 }}>
        <Typography sx={{ fontWeight: 700, color: "text.primary", fontVariantNumeric: "tabular-nums" }}>
          {formatActaDate(p.productionDate)}
        </Typography>
        <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums" }}>
          {p.hasDiscrepancy && (
            <Box component="span" sx={{ color: designTokens.status.warning.fg, fontWeight: 700, mr: 1.25 }}>
              Discrepancia
            </Box>
          )}
          Declarado{" "}
          <Box component="strong" sx={{ color: "text.primary" }}>
            {p.declaredTotal === null ? "—" : fmt.format(p.declaredTotal)}
          </Box>
          <Box component="span" sx={{ mx: 1, color: designTokens.textDisabled }}>
            ·
          </Box>
          Calculado{" "}
          <Box component="strong" sx={{ color: "text.primary" }}>
            {fmt.format(p.calculatedTotal)}
          </Box>
        </Typography>
      </Stack>

      <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
        {p.values.map((v) => (
          <Stack
            component="li"
            key={v.id}
            direction="row"
            alignItems="center"
            gap={1.5}
            sx={{ py: 1, borderTop: "1px solid rgba(15, 23, 42, 0.05)", "&:first-of-type": { borderTop: "none" } }}
          >
            <Typography variant="body2" sx={{ flex: 1, minWidth: 0, color: "text.primary" }} noWrap>
              {v.categoryName}
            </Typography>
            {v.needsVerification && (
              <Box
                component="span"
                sx={{
                  px: 1,
                  height: 22,
                  display: "inline-flex",
                  alignItems: "center",
                  borderRadius: 999,
                  bgcolor: designTokens.status.warning.bg,
                  color: designTokens.status.warning.fg,
                  fontSize: "0.6875rem",
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                }}
              >
                Verificar
              </Box>
            )}
            <Typography
              sx={{ fontWeight: 700, color: "text.primary", fontVariantNumeric: "tabular-nums", minWidth: 48, textAlign: "right" }}
            >
              {fmt.format(v.quantity)}
            </Typography>
          </Stack>
        ))}
      </Box>

      {p.observations && (
        <Typography variant="body2" sx={{ mt: 1, whiteSpace: "pre-line" }}>
          {p.observations}
        </Typography>
      )}
    </Box>
  );
}

/** Esqueleto con la forma real de la pagina: sin spinner a media pantalla. */
function DetailSkeleton({ back }: { back: ReactNode }) {
  return (
    <Stack spacing={2.5} sx={{ flexShrink: 0 }} aria-busy="true">
      <Box>
        <Box sx={{ ml: -1, mb: 1 }}>{back}</Box>
        <Skeleton width={220} height={40} />
        <Skeleton width={320} />
      </Box>
      <Grid container spacing={2.5}>
        <Grid item xs={12} lg={8}>
          <Surface>
            <Skeleton width={140} height={28} />
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} height={40} />
            ))}
          </Surface>
        </Grid>
        <Grid item xs={12} lg={4}>
          <Surface>
            <Skeleton width={100} />
            <Skeleton width={140} height={56} />
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} />
            ))}
          </Surface>
        </Grid>
      </Grid>
    </Stack>
  );
}
