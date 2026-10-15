import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Box, Button, CircularProgress, Collapse, Divider, MenuItem, Stack, TextField, Typography } from "@mui/material";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import StoreOutlinedIcon from "@mui/icons-material/StoreOutlined";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import GroupOutlinedIcon from "@mui/icons-material/GroupOutlined";
import HowToVoteOutlinedIcon from "@mui/icons-material/HowToVoteOutlined";
import { reportesApi } from "@/api/reportesApi";
import { catalogApi } from "@/api/catalogApi";
import { electoralPeriodApi } from "@/api/electoralApi";
import { useModulos } from "@/hooks/useModulos";
import { getBlobApiErrorMessage } from "@/utils/apiError";
import { downloadBlob } from "@/utils/downloadBlob";
import { useToast } from "@/hooks/useToast";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { ToastSnackbar } from "@/components/ToastSnackbar";
import { PageHeader } from "@/components/ui/PageHeader";
import { FloatingToolbar, toolbarFieldSx } from "@/components/ui/FloatingToolbar";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Surface } from "@/components/ui/Surface";
import { Callout } from "@/components/ui/Callout";
import { designTokens } from "@/theme/theme";
import { computeRange, formatRangeLabel } from "./reportPeriods";
import type { PeriodPreset } from "./reportPeriods";

/** Etiquetas cortas para el control segmentado (las largas de PERIOD_PRESET_LABELS no caben en una fila). */
const PRESET_OPTIONS: { value: PeriodPreset; label: string }[] = [
  { value: "semana", label: "Semana" },
  { value: "mes", label: "Mes" },
  { value: "trimestre", label: "Trimestre" },
  { value: "historico", label: "Histórico" },
  { value: "personalizado", label: "Personalizado" },
];

type DownloadState = "idle" | "loading" | "done";

/**
 * Boton de descarga con tres estados que se transforman en el mismo lugar
 * (Descargar -> Generando -> Descargado). Las etiquetas se apilan y cruzan
 * con opacidad + leve blur, para leerse como un solo boton que cambia y no
 * como dos que se intercambian. El ancho no salta: la etiqueta mas larga
 * reserva el espacio.
 */
function DownloadButton({ state, onClick }: { state: DownloadState; onClick: () => void }) {
  const reducedMotion = useReducedMotion();
  const labels: { key: DownloadState; icon: ReactNode; text: string }[] = [
    { key: "idle", icon: <DownloadRoundedIcon sx={{ fontSize: 18 }} />, text: "Descargar PDF" },
    { key: "loading", icon: <CircularProgress size={15} color="inherit" thickness={5} />, text: "Generando…" },
    { key: "done", icon: <CheckRoundedIcon sx={{ fontSize: 18 }} />, text: "Descargado" },
  ];

  return (
    <Button
      variant={state === "done" ? "outlined" : "contained"}
      color={state === "done" ? "success" : "primary"}
      onClick={onClick}
      disabled={state === "loading"}
      aria-live="polite"
      sx={{
        position: "relative",
        minWidth: 164,
        flexShrink: 0,
        "&.Mui-disabled": { bgcolor: designTokens.accent, color: "#FFFFFF", opacity: 0.85 },
      }}
    >
      {/* Reserva el ancho de la etiqueta mas larga para que el boton no cambie de tamaño. */}
      <Box component="span" aria-hidden sx={{ visibility: "hidden", display: "inline-flex", gap: 1 }}>
        <DownloadRoundedIcon sx={{ fontSize: 18 }} />
        Descargar PDF
      </Box>
      {labels.map((l) => {
        const visible = l.key === state;
        return (
          <Box
            key={l.key}
            component="span"
            aria-hidden={!visible}
            sx={{
              position: "absolute",
              inset: 0,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 1,
              opacity: visible ? 1 : 0,
              filter: visible || reducedMotion ? "blur(0px)" : "blur(3px)",
              transform: visible || reducedMotion ? "scale(1)" : "scale(0.94)",
              transition: `opacity 200ms ${designTokens.easeOut}, filter 200ms ${designTokens.easeOut}, transform 200ms ${designTokens.easeOut}`,
            }}
          >
            {l.icon}
            {l.text}
          </Box>
        );
      })}
    </Button>
  );
}

/** Estado del boton derivado de la mutacion, con un "Descargado" breve tras el exito. */
function useDownloadState(isPending: boolean, successCount: number): DownloadState {
  const [done, setDone] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (successCount === 0) return;
    setDone(true);
    clearTimeout(timeout.current);
    timeout.current = setTimeout(() => setDone(false), 1800);
    return () => clearTimeout(timeout.current);
  }, [successCount]);
  if (isPending) return "loading";
  return done ? "done" : "idle";
}

interface ReportRowProps {
  icon: ReactNode;
  title: string;
  description: string;
  extraFilter?: ReactNode;
  state: DownloadState;
  onDownload: () => void;
}

function ReportRow({ icon, title, description, extraFilter, state, onDownload }: ReportRowProps) {
  return (
    <Stack
      direction={{ xs: "column", md: "row" }}
      alignItems={{ xs: "stretch", md: "center" }}
      gap={{ xs: 1.75, md: 2.5 }}
      sx={{ py: { xs: 2.25, md: 2.5 } }}
    >
      <Stack direction="row" gap={1.75} alignItems="flex-start" sx={{ flex: 1, minWidth: 0 }}>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: "12px",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: designTokens.accentSoft,
            color: designTokens.accent,
          }}
        >
          {icon}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, color: "text.primary", fontSize: "0.9375rem" }}>{title}</Typography>
          <Typography variant="body2" sx={{ mt: 0.25, maxWidth: "62ch" }}>
            {description}
          </Typography>
        </Box>
      </Stack>
      {extraFilter && <Box sx={{ width: { xs: "100%", md: 240 }, flexShrink: 0 }}>{extraFilter}</Box>}
      <Box sx={{ display: "flex", justifyContent: { xs: "flex-start", md: "flex-end" } }}>
        <DownloadButton state={state} onClick={onDownload} />
      </Box>
    </Stack>
  );
}

export function ReportesPage() {
  const [preset, setPreset] = useState<PeriodPreset>("mes");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [duicentroId, setDuicentroId] = useState<number | "">("");
  const { toast, showToast, closeToast } = useToast();
  const [periodId, setPeriodId] = useState<number | "">("");
  // El reporte de delegados temporales depende del modulo de Elecciones: con
  // el modulo apagado el backend responde 403 MODULE_DISABLED, asi que su
  // fila ni se muestra.
  const { isElectionsEnabled } = useModulos();
  const periodosQuery = useQuery({
    queryKey: ["periodos-electorales"],
    queryFn: electoralPeriodApi.getPeriodos,
    enabled: isElectionsEnabled,
  });
  const [successCounts, setSuccessCounts] = useState({ duicentros: 0, categorias: 0, usuarios: 0, temporales: 0 });
  const markSuccess = (key: keyof typeof successCounts) =>
    setSuccessCounts((c) => ({ ...c, [key]: c[key] + 1 }));

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
    onSuccess: () => {
      markSuccess("duicentros");
      showToast("success", "Reporte descargado.");
    },
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
    onSuccess: () => {
      markSuccess("categorias");
      showToast("success", "Reporte descargado.");
    },
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
    onSuccess: () => {
      markSuccess("usuarios");
      showToast("success", "Reporte descargado.");
    },
    onError: (error) =>
      showToast("error", error instanceof Error ? error.message : "No se pudo generar el reporte."),
  });

  const temporalesMutation = useMutation({
    mutationFn: async () => {
      try {
        const { blob, filename } = await reportesApi.getReporteDelegadosTemporales(
          range,
          periodId === "" ? undefined : periodId
        );
        downloadBlob(blob, filename);
      } catch (error) {
        throw new Error(await getBlobApiErrorMessage(error, "No se pudo generar el reporte de delegados temporales."));
      }
    },
    onSuccess: () => {
      markSuccess("temporales");
      showToast("success", "Reporte descargado.");
    },
    onError: (error) =>
      showToast("error", error instanceof Error ? error.message : "No se pudo generar el reporte."),
  });

  const temporalesState = useDownloadState(temporalesMutation.isPending, successCounts.temporales);
  const duicentrosState = useDownloadState(duicentrosMutation.isPending, successCounts.duicentros);
  const categoriasState = useDownloadState(categoriasMutation.isPending, successCounts.categorias);
  const usuariosState = useDownloadState(usuariosMutation.isPending, successCounts.usuarios);

  return (
    <Stack spacing={{ xs: 2, md: 2.5 }} sx={{ flexShrink: 0, pb: 2 }}>
      <PageHeader
        title="Reportes"
        subtitle="Documentos PDF listos para imprimir o enviar por correo: portada con el rango de fechas, tabla de datos y fila de totales. Excluyen actas anuladas, igual que el dashboard."
      />

      <FloatingToolbar>
        <Stack direction="row" alignItems="center" flexWrap="wrap" gap={1.5}>
          <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary" }}>
            Periodo
          </Typography>
          <Box sx={{ maxWidth: "100%", overflowX: "auto" }}>
            <SegmentedControl<PeriodPreset>
              ariaLabel="Periodo del reporte"
              options={PRESET_OPTIONS}
              value={preset}
              onChange={setPreset}
            />
          </Box>
          {preset === "personalizado" && (
            <Stack direction="row" alignItems="center" gap={1}>
              <TextField
                type="date"
                size="small"
                aria-label="Desde"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                inputProps={{ max: customTo || undefined }}
                sx={{ width: 150, ...toolbarFieldSx, "& input": { fontVariantNumeric: "tabular-nums" } }}
              />
              <Typography variant="body2" aria-hidden>
                –
              </Typography>
              <TextField
                type="date"
                size="small"
                aria-label="Hasta"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                inputProps={{ min: customFrom || undefined }}
                sx={{ width: 150, ...toolbarFieldSx, "& input": { fontVariantNumeric: "tabular-nums" } }}
              />
            </Stack>
          )}
          <Typography variant="body2" sx={{ ml: { lg: "auto" }, fontVariantNumeric: "tabular-nums" }} aria-live="polite">
            Rango:{" "}
            <Box component="strong" sx={{ color: "text.primary" }}>
              {formatRangeLabel(range)}
            </Box>
          </Typography>
        </Stack>
      </FloatingToolbar>

      <Surface sx={{ py: { xs: 0.5, md: 1 } }}>
        <Stack divider={<Divider flexItem sx={{ borderColor: "rgba(15, 23, 42, 0.06)" }} />}>
          <ReportRow
            icon={<StoreOutlinedIcon />}
            title="Ranking de duicentros"
            description={
              duicentroId === ""
                ? "Actas y producción de todos los duicentros, de mayor a menor."
                : "Desglose de producción por categoría de trámite, solo para el duicentro elegido."
            }
            state={duicentrosState}
            onDownload={() => duicentrosMutation.mutate()}
            extraFilter={
              <TextField
                select
                size="small"
                aria-label="Duicentro"
                fullWidth
                value={duicentroId}
                onChange={(e) => setDuicentroId(e.target.value === "" ? "" : Number(e.target.value))}
                SelectProps={{ displayEmpty: true }}
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

          <ReportRow
            icon={<CategoryOutlinedIcon />}
            title="Categorías de trámite"
            description="Total de trámites por categoría (Primera vez, Renovaciones, PVNUI, etc.), sumando todos los duicentros."
            state={categoriasState}
            onDownload={() => categoriasMutation.mutate()}
          />

          <ReportRow
            icon={<GroupOutlinedIcon />}
            title="Usuarios (digitadores)"
            description="Ranking de usuarios permanentes por cantidad de actas fiscalizadas, con la producción total como dato secundario. No incluye las actas de delegados temporales, así que su total puede ser menor que el del dashboard."
            state={usuariosState}
            onDownload={() => usuariosMutation.mutate()}
          />

          {isElectionsEnabled && (
            <ReportRow
              icon={<HowToVoteOutlinedIcon />}
              title="Delegados temporales (Elecciones)"
              description="Usuario, nombre, DUI, partido, actas fiscalizadas y producción total por delegado temporal."
              state={temporalesState}
              onDownload={() => temporalesMutation.mutate()}
              extraFilter={
                <TextField
                  select
                  size="small"
                  aria-label="Período electoral"
                  fullWidth
                  value={periodId}
                  onChange={(e) => setPeriodId(e.target.value === "" ? "" : Number(e.target.value))}
                  SelectProps={{ displayEmpty: true }}
                >
                  <MenuItem value="">Todos los períodos</MenuItem>
                  {(periodosQuery.data ?? []).map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.name}
                    </MenuItem>
                  ))}
                </TextField>
              }
            />
          )}
        </Stack>
      </Surface>

      <Collapse in={duicentrosQuery.isError}>
        <Callout tone="warning" title="No se pudo cargar el catálogo de duicentros">
          El reporte de duicentros sigue funcionando para «Todos los duicentros».
        </Callout>
      </Collapse>

      <ToastSnackbar toast={toast} onClose={closeToast} autoHideDuration={5000} />
    </Stack>
  );
}
