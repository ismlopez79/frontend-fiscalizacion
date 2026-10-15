import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Alert,
  Box,
  ButtonBase,
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
import { designTokens } from "@/theme/theme";
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
              {/* Tres pasos en orden: aqui la numeracion si informa (es una secuencia real). */}
              <Stack component="ol" spacing={1.5} sx={{ listStyle: "none", m: 0, p: 0 }}>
                <StepRow n={1} title="Descarga la plantilla" hint="Trae las columnas y notas de formato que espera el sistema.">
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<DownloadIcon />}
                    onClick={handleDownloadTemplate}
                    disabled={isDownloading}
                  >
                    {isDownloading ? "Descargando…" : "Descargar"}
                  </Button>
                </StepRow>
                <StepRow n={2} title="Llénala" hint="Respeta el orden de las columnas; las opcionales pueden quedar vacías." />
                <StepRow n={3} title="Súbela aquí" hint="Ninguna fila mala detiene a las demás: el reporte te dice qué pasó en cada una." />
              </Stack>

              <ButtonBase
                component="label"
                sx={{
                  width: "100%",
                  py: 2.5,
                  px: 2,
                  gap: 1.5,
                  borderRadius: "16px",
                  border: "1.5px dashed",
                  borderColor: selectedFile ? designTokens.accent : "rgba(15, 23, 42, 0.16)",
                  bgcolor: selectedFile ? designTokens.accentSoft : "transparent",
                  justifyContent: "flex-start",
                  textAlign: "left",
                  transition: `background-color 150ms ease, border-color 150ms ease, transform 160ms ${designTokens.easeOut}`,
                  "&:active": { transform: "scale(0.985)" },
                  "&:focus-within": { boxShadow: designTokens.focusRing },
                  "@media (hover: hover) and (pointer: fine)": {
                    "&:hover": { borderColor: designTokens.accent, bgcolor: designTokens.accentSoft },
                  },
                }}
              >
                <UploadFileIcon sx={{ color: designTokens.accent }} />
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" noWrap sx={{ fontWeight: 700, color: "text.primary" }}>
                    {selectedFile ? selectedFile.name : "Seleccionar archivo .xlsx"}
                  </Typography>
                  <Typography variant="caption">
                    {selectedFile ? "Toca para elegir otro archivo" : "Solo archivos de Excel (.xlsx)"}
                  </Typography>
                </Box>
                <input
                  ref={fileInputRef}
                  type="file"
                  hidden
                  accept=".xlsx"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                />
              </ButtonBase>
            </>
          )}

          {result && (
            <>
              <Box
                component="dl"
                sx={{
                  m: 0,
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4, 1fr)" },
                  gap: "1px",
                  borderRadius: "16px",
                  overflow: "hidden",
                  bgcolor: "rgba(15, 23, 42, 0.06)",
                  boxShadow: "0 0 0 1px rgba(15, 23, 42, 0.06)",
                }}
              >
                <ResultStat label="Filas" value={result.totalRows} />
                <ResultStat label="Creados" value={result.created} color={designTokens.status.success.fg} />
                <ResultStat label="Omitidos" value={result.skipped} color={result.skipped > 0 ? designTokens.status.warning.fg : undefined} />
                <ResultStat label="Errores" value={result.errors} color={result.errors > 0 ? designTokens.status.error.fg : undefined} />
              </Box>

              {hasGeneratedPasswords && (
                <Alert severity="warning">
                  Se generaron contraseñas temporales para algunas filas. Cópialas ahora — esta es
                  la única vez que la API las muestra en texto plano, no quedan guardadas en
                  ningún otro lugar del sistema.
                </Alert>
              )}

              <TableContainer
                sx={{
                  maxHeight: 360,
                  borderRadius: "14px",
                  boxShadow: "0 0 0 1px rgba(15, 23, 42, 0.08)",
                  overscrollBehavior: "contain",
                  "& .MuiTableCell-root": { borderColor: "rgba(15, 23, 42, 0.06)" },
                  "& .MuiTableCell-head": { bgcolor: "#FBFCFD" },
                }}
              >
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
                          <TableCell sx={{ fontVariantNumeric: "tabular-nums" }}>{detail.row}</TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={STATUS_LABEL[detail.status]}
                              color={STATUS_COLOR[detail.status]}
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
      <DialogActions>
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

function StepRow({ n, title, hint, children }: { n: number; title: string; hint: string; children?: React.ReactNode }) {
  return (
    <Stack component="li" direction="row" gap={1.5} alignItems="center">
      <Box
        aria-hidden
        sx={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: designTokens.accentSoft,
          color: designTokens.accent,
          fontWeight: 700,
          fontSize: "0.8125rem",
        }}
      >
        {n}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 700, color: "text.primary" }}>
          {title}
        </Typography>
        <Typography variant="body2">{hint}</Typography>
      </Box>
      {children}
    </Stack>
  );
}

function ResultStat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <Box sx={{ bgcolor: "background.paper", px: 2, py: 1.75 }}>
      <Typography component="dt" variant="body2" sx={{ fontWeight: 500 }}>
        {label}
      </Typography>
      <Typography
        component="dd"
        sx={{ m: 0, fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums", color: color ?? "text.primary" }}
      >
        {value}
      </Typography>
    </Box>
  );
}
