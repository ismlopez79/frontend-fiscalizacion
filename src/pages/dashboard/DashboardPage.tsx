import { lazy, Suspense, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Alert, Box, Grid, Skeleton, Stack, Typography } from "@mui/material";
import { dashboardApi } from "@/api/dashboardApi";
import { getApiErrorMessage } from "@/utils/apiError";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useModulos } from "@/hooks/useModulos";
import { Surface } from "@/components/ui/Surface";

// La tarjeta de produccion trae recharts (~330 KB con sus dependencias). Se
// carga aparte para que el inicio del digitador — que no la usa y es la
// pantalla a la que llega la mayoria — no descargue la libreria de graficas.
const ProduccionHero = lazy(() =>
  import("./components/ProduccionHero").then((m) => ({ default: m.ProduccionHero }))
);
import { DigitadorHome } from "./components/DigitadorHome";
import { MetricStrip } from "./components/MetricStrip";
import { ActasPorEstadoCard } from "./components/ActasPorEstadoCard";
import { DuicentrosTopCard } from "./components/DuicentrosTopCard";
import { ProduccionPorCategoriaCard } from "./components/ProduccionPorCategoriaCard";
import { IncidentesPorTipoCard } from "./components/IncidentesPorTipoCard";
import { DashboardToolbar } from "./components/DashboardToolbar";
import type { MetricPeriod } from "./components/MetricStrip";
import { formatMonthLabel, matchMonth } from "./dashboardFormat";
import type { DashboardGroupBy } from "@/types/dashboard";

/** Tope del backend para /dashboard/duicentros-top: con el se piden todos los duicentros del periodo. */
const ALL_DUICENTROS_LIMIT = 100;
/** Hasta ~2 meses la tendencia se lee mejor por dia; rangos mas largos, por mes. */
const DAILY_TREND_MAX_DAYS = 62;
const MS_PER_DAY = 86_400_000;

const REPORT_VIEW_ROLES = ["ADMINISTRADOR", "SUPERVISOR"];

export function DashboardPage() {
  const { user } = useAuth();
  const puedeVerReportes = REPORT_VIEW_ROLES.some((r) => user?.roles.includes(r));
  const { isElectionsEnabled } = useModulos();

  // El delegado temporal solo fiscaliza: su inicio es "Mis actividades" (si el modulo esta encendido).
  const soloDelegadoTemporal = !!user?.roles.includes("DELEGADO_TEMPORAL") && !user?.roles.includes("DIGITADOR");
  if (soloDelegadoTemporal && isElectionsEnabled && !puedeVerReportes) {
    return <Navigate to="/fiscalizacion-electoral/mis-actividades" replace />;
  }

  if (!puedeVerReportes) {
    return <DigitadorHome fullName={user?.fullName ?? ""} />;
  }

  return <AdminDashboard />;
}

function AdminDashboard() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [limit, setLimit] = useState(10);
  const [groupBy, setGroupBy] = useState<DashboardGroupBy>("month");

  const range = { from: from || undefined, to: to || undefined };
  const rangeActive = !!from || !!to;

  const handleRangeChange = (nextFrom: string, nextTo: string) => {
    setFrom(nextFrom);
    setTo(nextTo);
    // La agrupacion de la tendencia acompaña al periodo (un mes agrupado "por
    // mes" seria un solo punto); se puede cambiar despues en la tarjeta.
    if (nextFrom && nextTo) {
      const days = (Date.parse(nextTo) - Date.parse(nextFrom)) / MS_PER_DAY;
      setGroupBy(days <= DAILY_TREND_MAX_DAYS ? "day" : "month");
    } else if (!nextFrom && !nextTo) {
      setGroupBy("month");
    }
  };

  const resumenQuery = useQuery({
    queryKey: ["dashboard", "resumen"],
    queryFn: dashboardApi.getResumen,
  });

  // Actas y produccion del periodo elegido: el resumen solo trae el mes en
  // curso, asi que para un mes pasado se suman las filas por duicentro del
  // mismo rango (misma regla del backend: excluye actas ANULADA).
  const periodoQuery = useQuery({
    queryKey: ["dashboard", "periodo", range.from, range.to],
    queryFn: () => dashboardApi.getDuicentrosTop(ALL_DUICENTROS_LIMIT, range),
    enabled: rangeActive,
    placeholderData: keepPreviousData,
  });

  const duicentrosTopQuery = useQuery({
    queryKey: ["dashboard", "duicentros-top", limit, range.from, range.to],
    queryFn: () => dashboardApi.getDuicentrosTop(limit, range),
    placeholderData: keepPreviousData,
  });

  const categoriaQuery = useQuery({
    queryKey: ["dashboard", "produccion-por-categoria", range.from, range.to],
    queryFn: () => dashboardApi.getProduccionPorCategoria(range),
    placeholderData: keepPreviousData,
  });

  const fechaQuery = useQuery({
    queryKey: ["dashboard", "produccion-por-fecha", range.from, range.to, groupBy],
    queryFn: () => dashboardApi.getProduccionPorFecha(range, groupBy),
    placeholderData: keepPreviousData,
  });

  const incidentesQuery = useQuery({
    queryKey: ["dashboard", "incidentes-por-tipo", range.from, range.to],
    queryFn: () => dashboardApi.getIncidentesPorTipo(range),
    placeholderData: keepPreviousData,
  });

  const anyError =
    resumenQuery.error ||
    periodoQuery.error ||
    duicentrosTopQuery.error ||
    categoriaQuery.error ||
    fechaQuery.error ||
    incidentesQuery.error;

  const resumen = resumenQuery.data;

  const month = matchMonth(from, to);
  const periodo: MetricPeriod | undefined = rangeActive
    ? {
        label: month ? `de ${formatMonthLabel(month)}` : "del periodo",
        actas: periodoQuery.data?.reduce((sum, row) => sum + row.totalActas, 0),
        produccion: periodoQuery.data?.reduce((sum, row) => sum + row.totalProduccion, 0),
        fetching: periodoQuery.isFetching,
      }
    : undefined;

  return (
    // flexShrink 0: el contenedor de scroll del AppShell es flex en columna con
    // alto fijo — sin esto el dashboard se encoge al alto de la ventana y las
    // secciones se aplastan o se enciman en vez de hacer scroll.
    <Stack spacing={{ xs: 2, md: 2.5 }} sx={{ pb: 2, flexShrink: 0 }}>
      <Box sx={{ pt: { md: 0.5 } }}>
        <Typography variant="h3" component="h1">
          Dashboard
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.5 }}>
          Estado del sistema
        </Typography>
      </Box>

      {/* El periodo va arriba: tambien decide las cifras "del periodo" del resumen. */}
      <DashboardToolbar from={from} to={to} onRangeChange={handleRangeChange} />

      <MetricStrip resumen={resumen} loading={resumenQuery.isLoading} periodo={periodo} />

      {anyError && (
        <Alert severity="error">{getApiErrorMessage(anyError, "No se pudieron cargar algunas métricas.")}</Alert>
      )}

      <Suspense
        fallback={
          <Surface sx={{ p: { xs: 2.5, md: 3.5 } }}>
            <Skeleton width={140} />
            <Skeleton width={220} height={64} />
            <Skeleton variant="rounded" height={240} sx={{ mt: 3, borderRadius: "14px" }} />
          </Surface>
        }
      >
        <ProduccionHero
          resumen={resumen}
          resumenLoading={resumenQuery.isLoading}
          serie={fechaQuery.data}
          serieLoading={fechaQuery.isFetching}
          from={from}
          to={to}
          groupBy={groupBy}
          onGroupByChange={setGroupBy}
        />
      </Suspense>

      {/* Las tarjetas de una misma fila se estiran al mismo alto. */}
      <Grid container spacing={{ xs: 2, md: 2.5 }} sx={{ "& > .MuiGrid-item > *": { height: "100%" } }}>
        <Grid item xs={12} lg={7}>
          <ActasPorEstadoCard resumen={resumen} loading={resumenQuery.isLoading} />
        </Grid>
        <Grid item xs={12} lg={5}>
          <IncidentesPorTipoCard data={incidentesQuery.data} loading={incidentesQuery.isFetching} />
        </Grid>
        <Grid item xs={12} lg={7}>
          <DuicentrosTopCard
            data={duicentrosTopQuery.data}
            loading={duicentrosTopQuery.isFetching}
            limit={limit}
            onLimitChange={setLimit}
          />
        </Grid>
        <Grid item xs={12} lg={5}>
          <ProduccionPorCategoriaCard data={categoriaQuery.data} loading={categoriaQuery.isFetching} />
        </Grid>
      </Grid>
    </Stack>
  );
}
