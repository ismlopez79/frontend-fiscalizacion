import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/DownloadOutlined";
import UploadFileIcon from "@mui/icons-material/UploadFileOutlined";
import ContentCopyIcon from "@mui/icons-material/ContentCopyOutlined";
import { getApiErrorMessage } from "@/utils/apiError";
import { downloadBlob } from "@/utils/downloadBlob";
import type { BulkImportResult, BulkImportRowStatus } from "@/types/bulkImport";

const STATUS_LABEL: Record<BulkImportRowStatus, string> = {
  CREATED: "Creado",
  SKIPPED: "Omitido",
  ERROR: "Error",
};

const STATUS_COLOR: Record<BulkImportRowStatus, "success" | "warning" | "error"> = {
  CREATED: "success",
  SKIPPED: "warning",
  ERROR: "error",
};

// "Usuario creado. Contrasena temporal: Xk9mQ2pLz8R!" -> captura "Xk9mQ2pLz8R!"
const TEMP_PASSWORD_PATTERN = /Contrasena temporal:\s*(\S+)/i;

interface BulkImportDialogProps {
  open: boolean;
  title: string;
  /** Ej. "Cada fila corre de forma independiente: un error en una no detiene al resto del archivo." */
  helperText?: string;
  templateFilename: string;
  onDownloadTemplate: () => Promise<Blob>;
  onUpload: (file: File) => Promise<BulkImportResult>;
  onClose: () => void;
  /** Se llama cuando el reporte final tuvo al menos un CREATED, para refrescar el listado. */
  onImported: () => void;
}

/**
 * Dialogo generico de carga masiva: descargar plantilla .xlsx, subir el
 * archivo lleno, mostrar el reporte fila por fila. Reutilizable para
 * cualquier catalogo que exponga GET .../plantilla y POST .../carga-masiva
 * con el mismo shape de BulkImportResult.
 *
 * Caso especial: cuando el backend genera una contraseña temporal (fila de
 * usuario sin contrasena_temporal), el texto viaja embebido en
 * details[].message — es la unica vez que una contraseña en texto plano
 * sale de la API. Este dialogo la detecta, la resalta y ofrece copiarla,
 * pero nunca la persiste en ningun lado (ni localStorage ni cache de
 * react-query: vive solo en el estado de este componente mientras esta
 * abierto).
 */
export function BulkImportDialog({
  open,
  title,
  helperText,
  templateFilename,
  onDownloadTemplate,
  onUpload,
  onClose,
  onImported,
}: BulkImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<BulkImportResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [copiedRow, setCopiedRow] = useState<number | null>(null);

  const uploadMutation = useMutation({
    mutationFn: (file: File) => onUpload(file),
    onSuccess: (data) => {
      setResult(data);
      if (data.created > 0) onImported();
    },
    onError: (error) => setSubmitError(getApiErrorMessage(error, "No se pudo procesar el archivo.")),
  });

  const handleDownloadTemplate = async () => {
    setIsDownloading(true);
    try {
      const blob = await onDownloadTemplate();
      downloadBlob(blob, templateFilename);
    } catch (error) {
      setSubmitError(getApiErrorMessage(error, "No se pudo descargar la plantilla."));
    } finally {
      setIsDownloading(false);
    }
  };

  const handleUpload = () => {
    if (!selectedFile) return;
    setSubmitError(null);
    uploadMutation.mutate(selectedFile);
  };

  const resetState = () => {
    setSelectedFile(null);
    setResult(null);
    setSubmitError(null);
    setCopiedRow(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const copyPassword = async (row: number, password: string) => {
    try {
      await navigator.clipboard.writeText(password);
      setCopiedRow(row);
      setTimeout(() => setCopiedRow((r) => (r === row ? null : r)), 2000);
    } catch {
      // Clipboard no disponible (permiso denegado, http no seguro, etc.) — no es critico.
    }
  };

  const hasGeneratedPasswords = !!result?.details.some((d) => TEMP_PASSWORD_PATTERN.test(d.message));

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.25}>
          {helperText && (
            <Typography variant="body2" color="text.secondary">
              {helperText}
            </Typography>
          )}

          {submitError && <Alert severity="error">{submitError}</Alert>}

          {!result && (
            <>
              <Alert severity="info">
                1. Descarga la plantilla. 2. Llénala respetando las columnas y notas de formato. 3.
                Súbela aquí. Ninguna fila mala detiene a las demás: cada una se procesa de forma
                independiente y el reporte te dice exactamente qué pasó en cada una.
              </Alert>

              <Stack direction="row" spacing={1.5} flexWrap="wrap" rowGap={1}>
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={handleDownloadTemplate}
                  disabled={isDownloading}
                >
                  Descargar plantilla
                </Button>

                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<UploadFileIcon />}
                >
                  {selectedFile ? selectedFile.name : "Seleccionar archivo .xlsx"}
                  <input
                    ref={fileInputRef}
                    type="file"
                    hidden
                    accept=".xlsx"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                  />
                </Button>
              </Stack>
            </>
          )}

          {result && (
            <>
              <Stack direction="row" spacing={1.5} flexWrap="wrap" rowGap={1}>
                <Chip label={`Total: ${result.totalRows}`} variant="outlined" />
                <Chip label={`Creados: ${result.created}`} color="success" variant="outlined" />
                <Chip label={`Omitidos: ${result.skipped}`} color="warning" variant="outlined" />
                <Chip label={`Errores: ${result.errors}`} color="error" variant="outlined" />
              </Stack>

              {hasGeneratedPasswords && (
                <Alert severity="warning">
                  Se generaron contraseñas temporales para algunas filas. Cópialas ahora — esta es
                  la única vez que la API las muestra en texto plano, no quedan guardadas en
                  ningún otro lugar del sistema.
                </Alert>
              )}

              <TableContainer sx={{ maxHeight: 360, border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell width={70}>Fila</TableCell>
                      <TableCell width={110}>Estado</TableCell>
                      <TableCell>Mensaje</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {result.details.map((detail) => {
                      const passwordMatch = detail.message.match(TEMP_PASSWORD_PATTERN);
                      return (
                        <TableRow key={detail.row} hover>
                          <TableCell>{detail.row}</TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={STATUS_LABEL[detail.status]}
                              color={STATUS_COLOR[detail.status]}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                              <Typography variant="body2">{detail.message}</Typography>
                              {passwordMatch && (
                                <Tooltip title={copiedRow === detail.row ? "¡Copiada!" : "Copiar contraseña"}>
                                  <IconButton
                                    size="small"
                                    onClick={() => copyPassword(detail.row, passwordMatch[1])}
                                  >
                                    <ContentCopyIcon fontSize="inherit" />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        {!result ? (
          <>
            <Button onClick={handleClose} color="inherit" disabled={uploadMutation.isPending}>
              Cancelar
            </Button>
            <Button
              variant="contained"
              onClick={handleUpload}
              disabled={!selectedFile || uploadMutation.isPending}
            >
              {uploadMutation.isPending ? "Procesando…" : "Subir e importar"}
            </Button>
          </>
        ) : (
          <>
            <Button onClick={resetState} color="inherit">
              Importar otro archivo
            </Button>
            <Button variant="contained" onClick={handleClose}>
              Cerrar
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
