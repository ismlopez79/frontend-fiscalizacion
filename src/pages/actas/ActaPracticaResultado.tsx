import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Box, Button, ButtonBase, CircularProgress, Divider, Grid, Stack, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBackRounded";
import UploadFileIcon from "@mui/icons-material/UploadFileOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import SendIcon from "@mui/icons-material/SendOutlined";
import ReplayIcon from "@mui/icons-material/ReplayOutlined";
import { actaApi } from "@/api/actaApi";
import { getApiErrorMessage } from "@/utils/apiError";
import { EstadoActaChip } from "@/components/EstadoActaChip";
import { designTokens } from "@/theme/theme";
import { useToast } from "@/hooks/useToast";
import { ToastSnackbar } from "@/components/ToastSnackbar";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeader, Surface } from "@/components/ui/Surface";
import { Callout } from "@/components/ui/Callout";
import { DetailRow } from "@/components/ui/DetailRow";
import type { ActaPracticaResponse } from "@/types/acta";
import { AcompanantesList, actaNumberFormatter as fmt, formatActaDate } from "./actaUi";

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "application/pdf"];

interface LocalFile {
  name: string;
  isPdf: boolean;
  /** Object URL del archivo local: la practica no devuelve enlace de descarga. */
  url: string;
}

interface ActaPracticaResultadoProps {
  acta: ActaPracticaResponse;
  onRestart: () => void;
  onExit: () => void;
}

/**
 * Lo que sigue a "Guardar acta" en modo practica. El acta simulada no existe
 * en el servidor (id null), asi que no se puede abrir el detalle real: aqui
 * se ensayan los mismos pasos que vienen despues — adjuntar la foto del
 * papel y enviar a revision — sin registrar nada. El PDF no se ofrece.
 */
export function ActaPracticaResultado({ acta, onRestart, onExit }: ActaPracticaResultadoProps) {
  const { toast, showToast, closeToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<LocalFile[]>([]);
  const [sent, setSent] = useState(false);

  // Las object URL solo viven en memoria del navegador: se liberan al salir.
  const filesRef = useRef<LocalFile[]>([]);
  filesRef.current = files;
  useEffect(() => () => filesRef.current.forEach((f) => URL.revokeObjectURL(f.url)), []);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      await actaApi.validarArchivoPractica(file);
      return file;
    },
    onSuccess: (file) => {
      setFiles((prev) => [
        ...prev,
        { name: file.name, isPdf: file.type === "application/pdf", url: URL.createObjectURL(file) },
      ]);
      showToast("success", "Archivo adjuntado (práctica: no se guardó).");
    },
    onError: (error) => showToast("error", getApiErrorMessage(error, "No se pudo subir el archivo.")),
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

  const hasFiles = files.length > 0;
  const producciones = acta.producciones ?? [];

  return (
    <Stack spacing={{ xs: 2, md: 2.5 }} sx={{ flexShrink: 0, pb: 2 }}>
      <PageHeader
        back={
          <Button size="small" color="inherit" startIcon={<ArrowBackIcon />} onClick={onExit}>
            Actas
          </Button>
        }
        title={<Box component="span" sx={{ fontVariantNumeric: "tabular-nums" }}>{acta.actaNumber}</Box>}
        titleAdornment={<EstadoActaChip estado={sent ? "PENDIENTE_REVISION" : acta.status} size="medium" />}
        subtitle={`${acta.duicentroName} · ${acta.departmentName} · ${formatActaDate(acta.actaDate)}`}
        actions={
          <>
            <Button variant="outlined" startIcon={<ReplayIcon />} onClick={onRestart}>
              Practicar otra vez
            </Button>
            {!sent && (
              <Button variant="contained" startIcon={<SendIcon />} disabled={!hasFiles} onClick={() => setSent(true)}>
                Enviar a revisión
              </Button>
            )}
          </>
        }
      />

      <Callout tone="warning" title="MODO PRÁCTICA — esta acta no se registró">
        Así se vería tu acta una vez registrada. Nada de esto se guardó: no existe en el sistema, no consumió numeración
        y ningún supervisor la verá. Para registrar un acta real usa «Nueva acta».
      </Callout>

      {sent ? (
        <Callout tone="success" title="Envío a revisión simulado">
          Con un acta real, aquí pasaría a Pendiente de revisión y ya no podrías editarla hasta que un supervisor la apruebe
          u observe.
        </Callout>
      ) : (
        <Callout tone="info" title="Acta registrada (simulada)">
          El siguiente paso con un acta real es adjuntar la foto o PDF del acta física y enviarla a revisión. Pruébalo
          aquí abajo.
        </Callout>
      )}

      <Grid container spacing={{ xs: 2, md: 2.5 }} alignItems="flex-start">
        <Grid item xs={12} lg={8}>
          <Stack spacing={{ xs: 2, md: 2.5 }}>
          <Surface>
            <SectionHeader
              title="Producciones"
              subtitle={producciones.length === 1 ? "1 producción." : `${producciones.length} producciones.`}
            />
            <Stack divider={<Divider flexItem sx={{ borderColor: "rgba(15, 23, 42, 0.06)" }} />} spacing={2}>
              {producciones.map((p, index) => (
                <Box key={index}>
                  <Stack direction="row" justifyContent="space-between" alignItems="baseline" gap={1} sx={{ mb: 0.75 }}>
                    <Typography sx={{ fontWeight: 700, color: "text.primary", fontVariantNumeric: "tabular-nums" }}>
                      {formatActaDate(p.productionDate)}
                    </Typography>
                    <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums" }}>
                      Calculado{" "}
                      <Box component="strong" sx={{ color: "text.primary" }}>
                        {fmt.format(p.calculatedTotal)}
                      </Box>
                    </Typography>
                  </Stack>
                  {(p.values ?? []).map((v, i) => (
                    <Stack key={i} direction="row" justifyContent="space-between" gap={1.5} sx={{ py: 0.5 }}>
                      <Typography variant="body2" noWrap sx={{ color: "text.primary", minWidth: 0 }}>
                        {v.categoryName}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: "text.primary", fontVariantNumeric: "tabular-nums" }}>
                        {fmt.format(v.quantity)}
                      </Typography>
                    </Stack>
                  ))}
                </Box>
              ))}
            </Stack>
          </Surface>

          {(acta.acompanantes ?? []).length > 0 && (
            <Surface>
              <SectionHeader title="Delegados temporales acompañantes" />
              <AcompanantesList acompanantes={acta.acompanantes} />
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
              {acta.hasDiscrepancy && (
                <Typography variant="body2" sx={{ mt: 0.5, color: designTokens.status.warning.fg, fontWeight: 600 }}>
                  No coincide con el total declarado ({acta.declaredTotal === null ? "—" : fmt.format(acta.declaredTotal)}).
                </Typography>
              )}

              <Divider sx={{ my: 2.5, borderColor: "rgba(15, 23, 42, 0.06)" }} />

              <Box component="dl" sx={{ m: 0, display: "grid", gap: 1.5 }}>
                <DetailRow label="Delegado JVE" value={acta.jveDelegateName} />
                <DetailRow label="Delegado RNPN" value={acta.rnpnDelegateName} />
                <DetailRow label="Jefe de duicentro" value={acta.duicentroChiefName} />
                <DetailRow label="Creada por" value={acta.createdByUsername} />
              </Box>
            </Surface>

            <Surface>
              <SectionHeader
                title="Archivos"
                subtitle={hasFiles ? `${files.length} adjunto${files.length === 1 ? "" : "s"} (no guardados).` : undefined}
              />

              {!sent && (
                <ButtonBase
                  component="label"
                  disabled={uploadMutation.isPending}
                  sx={{
                    width: "100%",
                    mb: 1.5,
                    py: 2,
                    px: 2,
                    gap: 1.25,
                    justifyContent: "flex-start",
                    borderRadius: "14px",
                    border: "1.5px dashed",
                    borderColor: hasFiles ? "rgba(15, 23, 42, 0.14)" : designTokens.status.warning.border,
                    color: "text.primary",
                    textAlign: "left",
                    "&:focus-within": { boxShadow: designTokens.focusRing },
                  }}
                >
                  {uploadMutation.isPending ? <CircularProgress size={20} /> : <UploadFileIcon sx={{ color: designTokens.accent }} />}
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

              {!hasFiles && !sent && (
                <Typography variant="body2" sx={{ color: designTokens.status.warning.fg }}>
                  Adjunta al menos una foto o PDF para poder enviarla a revisión.
                </Typography>
              )}

              <Stack spacing={1}>
                {files.map((file) => (
                  <Stack
                    key={file.url}
                    component="a"
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    direction="row"
                    alignItems="center"
                    gap={1.25}
                    sx={{ textDecoration: "none", color: "inherit" }}
                  >
                    {file.isPdf ? (
                      <Box
                        sx={{
                          width: 44,
                          height: 44,
                          borderRadius: "10px",
                          flexShrink: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          bgcolor: designTokens.status.error.bg,
                          color: designTokens.status.error.fg,
                        }}
                      >
                        <PictureAsPdfOutlinedIcon fontSize="small" />
                      </Box>
                    ) : (
                      <Box
                        component="img"
                        src={file.url}
                        alt=""
                        sx={{ width: 44, height: 44, borderRadius: "10px", flexShrink: 0, objectFit: "cover" }}
                      />
                    )}
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" noWrap sx={{ fontWeight: 600, color: "text.primary" }} title={file.name}>
                        {file.name}
                      </Typography>
                      <Typography variant="caption" component="div" sx={{ fontWeight: 500 }}>
                        <ImageOutlinedIcon sx={{ fontSize: 12, mr: 0.5, verticalAlign: "-1px" }} />
                        Vista previa local · toca para abrir
                      </Typography>
                    </Box>
                  </Stack>
                ))}
              </Stack>
            </Surface>
          </Stack>
        </Grid>
      </Grid>

      <ToastSnackbar toast={toast} onClose={closeToast} />
    </Stack>
  );
}
