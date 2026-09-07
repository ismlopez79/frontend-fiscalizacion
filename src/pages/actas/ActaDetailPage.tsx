import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBackRounded";
import UploadFileIcon from "@mui/icons-material/UploadFileOutlined";
import DownloadIcon from "@mui/icons-material/DownloadOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFileOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import SendIcon from "@mui/icons-material/SendOutlined";
import ReplayIcon from "@mui/icons-material/ReplayOutlined";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import FlagOutlinedIcon from "@mui/icons-material/FlagOutlined";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import BlockOutlinedIcon from "@mui/icons-material/BlockOutlined";
import { actaApi } from "@/api/actaApi";
import { getApiErrorMessage } from "@/utils/apiError";
import { downloadBlob } from "@/utils/downloadBlob";
import { useAuth } from "@/hooks/useAuth";
import { EstadoActaChip } from "@/components/EstadoActaChip";
import { ConfirmacionAccion } from "@/components/ConfirmacionAccion";
import { numericDataSx } from "@/theme/theme";
import { useToast } from "@/hooks/useToast";
import { ToastSnackbar } from "@/components/ToastSnackbar";
import type { ActaFileDto } from "@/types/acta";

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "application/pdf"];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDateTime(value: string): string {
  return dayjs(value).format("DD/MM/YYYY HH:mm");
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
  const isOwner = !!acta && acta.createdByUsername === user?.username;
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

  if (actaQuery.isLoading) {
    return (
      <Stack alignItems="center" sx={{ py: 8 }}>
        <CircularProgress />
      </Stack>
    );
  }

  if (actaQuery.isError || !acta) {
    return (
      <Alert severity="error">
        {getApiErrorMessage(actaQuery.error, "No se pudo cargar el acta.")}
      </Alert>
    );
  }

  const canSendToReview = canAct && (acta.status === "REGISTRADA" || acta.status === "OBSERVADA");
  const canResume = canAct && acta.status === "OBSERVADA";
  const canUploadFiles = canAct && (acta.status === "REGISTRADA" || acta.status === "OBSERVADA");
  // El backend exige al menos un archivo adjunto para poder enviar a
  // revision (409 BUSINESS_RULE_VIOLATION si no). Mientras la lista de
  // archivos no termina de cargar, tratamos "sin archivos" por defecto —
  // mejor un boton deshabilitado de mas un instante que dejar pasar el
  // click y chocar con el 409.
  const hasFiles = (archivosQuery.data ?? []).length > 0;
  const sendToReviewBlockedByFiles = canSendToReview && (archivosQuery.isLoading || !hasFiles);
  const canApprove = isReviewer && acta.status === "PENDIENTE_REVISION";
  const canObservar = isReviewer && acta.status === "PENDIENTE_REVISION";
  const canRechazar = isReviewer && acta.status === "PENDIENTE_REVISION";
  const canAnular = isAdmin && acta.status !== "ANULADA";

  return (
    <Stack spacing={2.5}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate("/actas")}
        sx={{ alignSelf: "flex-start" }}
        color="inherit"
      >
        Volver a mis actas
      </Button>

      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" rowGap={1}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Typography variant="h3">{acta.actaNumber}</Typography>
          <EstadoActaChip estado={acta.status} />
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

      {acta.status === "OBSERVADA" && (
        <Alert severity="info">
          Esta acta fue observada por el revisor. El motivo todavía no viaja en esta pantalla —
          consulta con el revisor por fuera del sistema qué hay que corregir antes de reanudarla.
        </Alert>
      )}

      {acta.hasDiscrepancy && (
        <Alert severity="warning">
          El total declarado ({acta.declaredTotal ?? "—"}) no coincide con el total calculado (
          {acta.calculatedTotal}).
        </Alert>
      )}
      {acta.possibleDuplicate && (
        <Alert severity="warning">Este acta podría ser un duplicado de otra ya registrada.</Alert>
      )}

      <Paper variant="outlined" sx={{ p: 2.5 }}>
        <Stack spacing={1.5}>
          <Typography variant="h4">Identificación</Typography>
          <Stack direction="row" flexWrap="wrap" columnGap={4} rowGap={1.5}>
            <InfoField label="Departamento" value={acta.departmentName} />
            <InfoField label="Duicentro" value={acta.duicentroName} />
            <InfoField label="Fecha del acta" value={acta.actaDate} />
            <InfoField label="Hora de llegada" value={acta.arrivalTime ?? "—"} />
            <InfoField label="Hora de salida" value={acta.departureTime ?? "—"} />
            <InfoField label="Creada por" value={acta.createdByUsername} />
            <InfoField label="Creada el" value={formatDateTime(acta.createdAt)} />
            <InfoField label="Última actualización" value={formatDateTime(acta.updatedAt)} />
          </Stack>
          <Divider />
          <Stack direction="row" flexWrap="wrap" columnGap={4} rowGap={1.5}>
            <InfoField label="Delegado JVE" value={acta.jveDelegateName ?? "—"} />
            <InfoField label="Delegado RNPN" value={acta.rnpnDelegateName ?? "—"} />
            <InfoField label="Jefe de duicentro" value={acta.duicentroChiefName ?? "—"} />
          </Stack>
          {acta.observations && (
            <>
              <Divider />
              <InfoField label="Observaciones" value={acta.observations} />
            </>
          )}
          <Divider />
          <Stack direction="row" flexWrap="wrap" columnGap={4} rowGap={1.5}>
            <InfoField label="Total declarado" value={acta.declaredTotal ?? "—"} numeric />
            <InfoField label="Total calculado" value={acta.calculatedTotal} numeric />
          </Stack>
        </Stack>
      </Paper>

      <Stack spacing={2}>
        <Typography variant="h4">Producciones</Typography>
        {acta.producciones.map((p) => (
          <Paper key={p.id} variant="outlined" sx={{ p: 2.5 }}>
            <Stack spacing={1.5}>
              <Stack direction="row" justifyContent="space-between" flexWrap="wrap" rowGap={1}>
                <Typography variant="subtitle1" fontWeight={600}>
                  {p.productionDate}
                </Typography>
                <Stack direction="row" spacing={2}>
                  <Typography variant="body2" color="text.secondary">
                    Declarado: <Box component="span" sx={numericDataSx}>{p.declaredTotal ?? "—"}</Box>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Calculado: <Box component="span" sx={numericDataSx}>{p.calculatedTotal}</Box>
                  </Typography>
                  {p.hasDiscrepancy && <Chip size="small" label="Discrepancia" color="warning" />}
                </Stack>
              </Stack>

              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Categoría</TableCell>
                    <TableCell align="right">Cantidad</TableCell>
                    <TableCell>Verificación</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {p.values.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell>{v.categoryName}</TableCell>
                      <TableCell align="right" sx={numericDataSx}>
                        {v.quantity}
                      </TableCell>
                      <TableCell>
                        {v.needsVerification ? (
                          <Chip size="small" label="Necesita verificación" color="warning" variant="outlined" />
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {p.observations && (
                <Typography variant="body2" color="text.secondary">
                  {p.observations}
                </Typography>
              )}
            </Stack>
          </Paper>
        ))}
      </Stack>

      <Paper variant="outlined" sx={{ p: 2.5 }}>
        <Stack spacing={1.5}>
          <Typography variant="h4">Incidentes reportados</Typography>
          {acta.incidentes.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Sin incidentes reportados.
            </Typography>
          ) : (
            <Stack spacing={1}>
              {acta.incidentes.map((incidente) => (
                <Box
                  key={incidente.id}
                  sx={{ py: 0.75, px: 1, border: "1px solid", borderColor: "divider", borderRadius: 1 }}
                >
                  <Typography variant="body2" fontWeight={600}>
                    {incidente.incidentTypeName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {incidente.description}
                  </Typography>
                </Box>
              ))}
            </Stack>
          )}
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2.5 }}>
        <Stack spacing={2}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" rowGap={1}>
            <Typography variant="h4">Archivos adjuntos</Typography>
            {canUploadFiles && (
              <Button
                size="small"
                component="label"
                startIcon={<UploadFileIcon />}
                disabled={uploadMutation.isPending}
              >
                {uploadMutation.isPending ? "Subiendo…" : "Adjuntar foto o PDF"}
                <input
                  ref={fileInputRef}
                  type="file"
                  hidden
                  accept="image/jpeg,image/png,application/pdf"
                  onChange={(e) => handleFileSelected(e.target.files?.[0] ?? null)}
                />
              </Button>
            )}
          </Stack>

          {canUploadFiles && !archivosQuery.isLoading && !hasFiles && (
            <Alert severity="warning">
              Debes adjuntar al menos una foto o PDF del acta física antes de poder enviarla a
              revisión.
            </Alert>
          )}

          {archivosQuery.isLoading ? (
            <CircularProgress size={20} />
          ) : (archivosQuery.data ?? []).length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Todavía no hay archivos adjuntos.
            </Typography>
          ) : (
            <Stack spacing={1}>
              {(archivosQuery.data ?? []).map((file) => (
                <Stack
                  key={file.id}
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{ py: 0.75, px: 1, border: "1px solid", borderColor: "divider", borderRadius: 1 }}
                >
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <InsertDriveFileIcon fontSize="small" color="disabled" />
                    <Box>
                      <Typography variant="body2">{file.originalName}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatBytes(file.sizeBytes)} · subido por {file.uploadedByUsername}
                      </Typography>
                    </Box>
                  </Stack>
                  <Stack direction="row" spacing={0.5}>
                    <Tooltip title="Ver">
                      <span>
                        <IconButton
                          size="small"
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
                            color="error"
                            onClick={() => setFileToDelete(file)}
                            disabled={deleteArchivoMutation.isPending}
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    )}
                  </Stack>
                </Stack>
              ))}
            </Stack>
          )}
        </Stack>
      </Paper>

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
            <DialogTitle
              sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}
            >
              <Typography variant="h4" noWrap>
                {previewFile.file.originalName}
              </Typography>
              <IconButton size="small" onClick={closePreview}>
                <CloseRoundedIcon fontSize="small" />
              </IconButton>
            </DialogTitle>
            <DialogContent sx={{ pt: 0 }}>
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
                  sx={{ width: "100%", height: "75vh", border: "none" }}
                />
              ) : (
                <Stack alignItems="center" spacing={2} sx={{ py: 6 }}>
                  <Typography variant="body2" color="text.secondary">
                    No hay vista previa disponible para este tipo de archivo.
                  </Typography>
                  <Button
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    onClick={() => handleDownload(previewFile.file.id, previewFile.file.originalName)}
                  >
                    Descargar
                  </Button>
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

function InfoField({ label, value, numeric }: { label: string; value: string | number; numeric?: boolean }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" display="block">
        {label}
      </Typography>
      <Typography variant="body2" sx={numeric ? numericDataSx : undefined}>
        {value}
      </Typography>
    </Box>
  );
}
