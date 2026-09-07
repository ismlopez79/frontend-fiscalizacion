import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { SvgIconComponent } from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Collapse,
  MenuItem,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import { reportesApi } from "@/api/reportesApi";
import { catalogApi } from "@/api/catalogApi";
import { getBlobApiErrorMessage } from "@/utils/apiError";
import { downloadBlob } from "@/utils/downloadBlob";
import { computeRange, formatRangeLabel, PERIOD_PRESET_LABELS } from "./reportPeriods";
import type { PeriodPreset } from "./reportPeriods";
import { useToast } from "@/hooks/useToast";
import { ToastSnackbar } from "@/components/ToastSnackbar";

interface ReportCardProps {
  icon: SvgIconComponent;
  title: string;
  description: string;
  extraFilter?: ReactNode;
  onDownload: () => void;
  loading: boolean;
}

function ReportCard({ icon: Icon, title, description, extraFilter, onDownload, loading }: ReportCardProps) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, flex: "1 1 300px", minWidth: 280 }}>
      <Stack spacing={1.5} alignItems="flex-start">
        <Icon color="primary" />
        <Typography variant="h4">{title}</Typography>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
        {extraFilter}
        <Button
          variant="contained"
          startIcon={<DownloadOutlinedIcon />}
          onClick={onDownload}
          disabled={loading}
        >
          {loading ? "Generando…" : "Descargar PDF"}
        </Button>
      </Stack>
    </Paper>
  );
}

export function ReportesPage() {
  const [preset, setPreset] = useState<PeriodPreset>("mes");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [duicentroId, setDuicentroId] = useState<number | "">("");
  const { toast, showToast, closeToast } = useToast();

  const range = useMemo(
    () => computeRange(preset, customFrom, customTo),
    [preset, customFrom, customTo]
  );

  const duicentrosQuery = useQuery({
    queryKey: ["duicentros", null],
    queryFn: () => catalogApi.getDuicentros(),
  });

  const duicentrosMutation = useMutation({
    mutationFn: async () => {
      try {
        const { blob, filename } = await reportesApi.getReporteDuicentros(
          range,
          duicentroId === "" ? undefined : duicentroId
        );
        downloadBlob(blob, filename);
      } catch (error) {
        throw new Error(await getBlobApiErrorMessage(error, "No se pudo generar el reporte de duicentros."));
      }
    },
    onSuccess: () => showToast("success", "Reporte descargado."),
    onError: (error) =>
      showToast("error", error instanceof Error ? error.message : "No se pudo generar el reporte."),
  });

  const categoriasMutation = useMutation({
    mutationFn: async () => {
      try {
        const { blob, filename } = await reportesApi.getReporteCategorias(range);
        downloadBlob(blob, filename);
      } catch (error) {
        throw new Error(await getBlobApiErrorMessage(error, "No se pudo generar el reporte de categorías."));
      }
    },
    onSuccess: () => showToast("success", "Reporte descargado."),
    onError: (error) =>
      showToast("error", error instanceof Error ? error.message : "No se pudo generar el reporte."),
  });

  const usuariosMutation = useMutation({
    mutationFn: async () => {
      try {
        const { blob, filename } = await reportesApi.getReporteUsuarios(range);
        downloadBlob(blob, filename);
      } catch (error) {
        throw new Error(await getBlobApiErrorMessage(error, "No se pudo generar el reporte de usuarios."));
      }
    },
    onSuccess: () => showToast("success", "Reporte descargado."),
    onError: (error) =>
      showToast("error", error instanceof Error ? error.message : "No se pudo generar el reporte."),
  });

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h3">Reportes</Typography>
        <Typography variant="body2" color="text.secondary">
          Documentos PDF listos para imprimir o enviar por correo: portada con el rango de fechas,
          tabla de datos y fila de totales. Excluyen actas anuladas, igual que el dashboard.
        </Typography>
      </Box>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={1.5}>
          <Typography variant="body2" color="text.secondary">
            Periodo del reporte:
          </Typography>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={preset}
            onChange={(_e, value: PeriodPreset | null) => value && setPreset(value)}
            sx={{ flexWrap: "wrap" }}
          >
            {(Object.keys(PERIOD_PRESET_LABELS) as PeriodPreset[]).map((key) => (
              <ToggleButton key={key} value={key}>
                {PERIOD_PRESET_LABELS[key]}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>

          {preset === "personalizado" && (
            <Stack direction="row" spacing={2} flexWrap="wrap" rowGap={1}>
              <TextField
                label="Desde"
                type="date"
                size="small"
                InputLabelProps={{ shrink: true }}
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
              />
              <TextField
                label="Hasta"
                type="date"
                size="small"
                InputLabelProps={{ shrink: true }}
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
              />
            </Stack>
          )}

          <Typography variant="body2">
            Rango a usar: <strong>{formatRangeLabel(range)}</strong>
          </Typography>
        </Stack>
      </Paper>

      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
        <ReportCard
          icon={PictureAsPdfOutlinedIcon}
          title="Ranking de duicentros"
          description={
            duicentroId === ""
              ? "Actas y producción de todos los duicentros, de mayor a menor."
              : "Desglose de producción por categoría de trámite, solo para el duicentro elegido."
          }
          loading={duicentrosMutation.isPending}
          onDownload={() => duicentrosMutation.mutate()}
          extraFilter={
            <TextField
              select
              size="small"
              label="Duicentro (opcional)"
              fullWidth
              value={duicentroId}
              onChange={(e) => setDuicentroId(e.target.value === "" ? "" : Number(e.target.value))}
            >
              <MenuItem value="">Todos los duicentros</MenuItem>
              {(duicentrosQuery.data ?? []).map((d) => (
                <MenuItem key={d.id} value={d.id}>
                  {d.name}
                </MenuItem>
              ))}
            </TextField>
          }
        />

        <ReportCard
          icon={PictureAsPdfOutlinedIcon}
          title="Categorías de trámite"
          description="Total de trámites por categoría (Primera vez, Renovaciones, PVNUI, etc.), sumando todos los duicentros."
          loading={categoriasMutation.isPending}
          onDownload={() => categoriasMutation.mutate()}
        />

        <ReportCard
          icon={PictureAsPdfOutlinedIcon}
          title="Usuarios (digitadores)"
          description="Ranking de usuarios por cantidad de actas fiscalizadas, con la producción total como dato secundario."
          loading={usuariosMutation.isPending}
          onDownload={() => usuariosMutation.mutate()}
        />
      </Stack>

      <Collapse in={duicentrosQuery.isError}>
        <Alert severity="warning">
          No se pudo cargar el catálogo de duicentros — el reporte de duicentros seguirá
          funcionando para "Todos los duicentros".
        </Alert>
      </Collapse>

      <ToastSnackbar toast={toast} onClose={closeToast} autoHideDuration={5000} />
    </Stack>
  );
}
