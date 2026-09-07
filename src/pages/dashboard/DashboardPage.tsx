import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Alert, Box, Button, Grid, Paper, Stack, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/AddRounded";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import { dashboardApi } from "@/api/dashboardApi";
import { getApiErrorMessage } from "@/utils/apiError";
import { useAuth } from "@/hooks/useAuth";
import { KpiRow } from "./components/KpiRow";
import { ActasPorEstadoCard } from "./components/ActasPorEstadoCard";
import { DuicentrosTopCard } from "./components/DuicentrosTopCard";
import { ProduccionPorCategoriaCard } from "./components/ProduccionPorCategoriaCard";
import { IncidentesPorTipoCard } from "./components/IncidentesPorTipoCard";
import { ProduccionPorFechaCard } from "./components/ProduccionPorFechaCard";
import { DashboardDateFilter } from "./components/DashboardDateFilter";
import type { DashboardGroupBy } from "@/types/dashboard";

const REPORT_VIEW_ROLES = ["ADMINISTRADOR", "SUPERVISOR"];

export function DashboardPage() {
  const { user } = useAuth();
  const puedeVerReportes = REPORT_VIEW_ROLES.some((r) => user?.roles.includes(r));

  if (!puedeVerReportes) {
    return <DigitadorHome fullName={user?.fullName ?? ""} />;
  }

  return <AdminDashboard />;
}

/**
 * REPORT_VIEW hoy solo lo tienen ADMINISTRADOR y SUPERVISOR. Un DIGITADOR
 * que aterriza en "/" tras loguearse no debe pegarle a /dashboard/* (le
 * devolveria 403 en cada tarjeta) — en su lugar ve accesos directos a lo
 * que si puede hacer.
 */
function DigitadorHome({ fullName }: { fullName: string }) {
  const navigate = useNavigate();
  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h3">Hola, {fullName}</Typography>
        <Typography variant="body2" color="text.secondary">
          Desde aquí puedes crear tus actas y darles seguimiento.
        </Typography>
      </Box>
      <Stack direction="row" spacing={2} flexWrap="wrap">
        <Paper variant="outlined" sx={{ p: 3, flex: "1 1 260px" }}>
          <Stack spacing={1.5} alignItems="flex-start">
            <AddIcon color="primary" />
            <Typography variant="h4">Nueva acta</Typography>
            <Typography variant="body2" color="text.secondary">
              Captura una nueva acta con sus producciones y adjunta las fotos del papel físico.
            </Typography>
            <Button variant="contained" onClick={() => navigate("/actas/nueva")}>
              Crear acta
            </Button>
          </Stack>
        </Paper>
        <Paper variant="outlined" sx={{ p: 3, flex: "1 1 260px" }}>
          <Stack spacing={1.5} alignItems="flex-start">
            <DescriptionOutlinedIcon color="primary" />
            <Typography variant="h4">Mis actas</Typography>
            <Typography variant="body2" color="text.secondary">
              Consulta el estado de tus actas, corrige las observadas y envía a revisión.
            </Typography>
            <Button variant="outlined" onClick={() => navigate("/actas")}>
              Ver mis actas
            </Button>
          </Stack>
        </Paper>
      </Stack>
    </Stack>
  );
}

function AdminDashboard() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [limit, setLimit] = useState(10);
  const [groupBy, setGroupBy] = useState<DashboardGroupBy>("month");

  const range = { from: from || undefined, to: to || undefined };

  const resumenQuery = useQuery({
    queryKey: ["dashboard", "resumen"],
    queryFn: dashboardApi.getResumen,
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
    duicentrosTopQuery.error ||
    categoriaQuery.error ||
    fechaQuery.error ||
    incidentesQuery.error;

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h3">Dashboard</Typography>
        <Typography variant="body2" color="text.secondary">
          Estado del sistema de un vistazo: catálogos activos, producción y actas por estado.
        </Typography>
      </Box>

      {anyError && (
        <Alert severity="error">{getApiErrorMessage(anyError, "No se pudieron cargar algunas métricas.")}</Alert>
      )}

      <KpiRow resumen={resumenQuery.data} loading={resumenQuery.isLoading} />

      <ActasPorEstadoCard resumen={resumenQuery.data} loading={resumenQuery.isLoading} />

      <DashboardDateFilter
        from={from}
        to={to}
        onFromChange={setFrom}
        onToChange={setTo}
        onClear={() => {
          setFrom("");
          setTo("");
        }}
      />

      <Grid container spacing={2.5}>
        <Grid item xs={12} md={7}>
          <DuicentrosTopCard
            data={duicentrosTopQuery.data}
            loading={duicentrosTopQuery.isLoading}
            limit={limit}
            onLimitChange={setLimit}
          />
        </Grid>
        <Grid item xs={12} md={5}>
          <ProduccionPorCategoriaCard data={categoriaQuery.data} loading={categoriaQuery.isLoading} />
        </Grid>
        <Grid item xs={12}>
          <IncidentesPorTipoCard data={incidentesQuery.data} loading={incidentesQuery.isLoading} />
        </Grid>
        <Grid item xs={12}>
          <ProduccionPorFechaCard
            data={fechaQuery.data}
            loading={fechaQuery.isLoading}
            groupBy={groupBy}
            onGroupByChange={setGroupBy}
          />
        </Grid>
      </Grid>
    </Stack>
  );
}
