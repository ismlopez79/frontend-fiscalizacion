import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Box, Button, Collapse, MenuItem, Skeleton, Stack, TextField, Typography } from "@mui/material";
import type { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";
import FilterAltOffOutlinedIcon from "@mui/icons-material/FilterAltOffOutlined";
import { activityFormApi, phaseApi } from "@/api/fiscalizacionFasesApi";
import { PageHeader } from "@/components/ui/PageHeader";
import { Callout } from "@/components/ui/Callout";
import { DataTable } from "@/components/ui/DataTable";
import { FloatingToolbar, toolbarFieldSx } from "@/components/ui/FloatingToolbar";
import { EstadoActaChip } from "@/components/EstadoActaChip";
import { useActiveElectoralPeriod } from "@/hooks/useActiveElectoralPeriod";
import { getApiErrorMessage } from "@/utils/apiError";
import { formatDate, formatDateTime } from "@/utils/dateFormat";
import { ACTA_STATUS_TOKENS } from "@/theme/statusTokens";
import { designTokens } from "@/theme/theme";
import type { ActivityFormListItem, ActivityFormStatus } from "@/types/fiscalizacionFases";
import { feRoutes } from "../fiscalizacionFasesUi";

const STATUSES = (Object.keys(ACTA_STATUS_TOKENS) as ActivityFormStatus[]).filter((s) => s !== "REGISTRADA");
const countFormatter = new Intl.NumberFormat("es-SV");

/**
 * Bandeja del revisor: informes de actividad por estado (por defecto, los
 * que esperan revision). Se revisa dentro del informe — aprobar sin leerlo
 * no es una accion que convenga tener a un clic desde la tabla.
 */
export function BandejaInformesPage() {
  const navigate = useNavigate();
  const { data: periodos, activePeriod } = useActiveElectoralPeriod();

  const [estado, setEstado] = useState<ActivityFormStatus | "">("PENDIENTE_REVISION");
  const [periodId, setPeriodId] = useState<number | "">("");
  const [faseId, setFaseId] = useState<number | "">("");
  const [pagination, setPagination] = useState<GridPaginationModel>({ page: 0, pageSize: 20 });

  useEffect(() => {
    if (periodId === "" && activePeriod) setPeriodId(activePeriod.id);
  }, [activePeriod, periodId]);
  useEffect(() => {
    setPagination((p) => (p.page === 0 ? p : { ...p, page: 0 }));
  }, [estado, periodId, faseId]);

  const fasesQuery = useQuery({
    queryKey: ["fases", periodId, "activas"],
    queryFn: () => phaseApi.getFases(Number(periodId)),
    enabled: !!periodId,
  });

  const filters = { estado: estado || undefined, periodoId: periodId || undefined, faseId: faseId || undefined };
  const query = useQuery({
    queryKey: ["formularios-actividad", filters, pagination.page, pagination.pageSize],
    queryFn: () => activityFormApi.getFormularios(filters, pagination.page, pagination.pageSize),
    placeholderData: keepPreviousData,
  });

  const columns: GridColDef<ActivityFormListItem>[] = useMemo(
    () => [
      {
        field: "formNumber",
        headerName: "N° de informe",
        width: 150,
        renderCell: (p) =>
          p.row.formNumber ? (
            <Typography variant="body2" sx={{ fontWeight: 700, color: "text.primary", fontVariantNumeric: "tabular-nums" }}>
              {p.row.formNumber}
            </Typography>
          ) : (
            <Typography variant="body2" sx={{ color: designTokens.textDisabled }}>
              Sin enviar
            </Typography>
          ),
      },
      {
        field: "activityDate",
        headerName: "Fecha",
        width: 112,
        renderCell: (p) => (
          <Typography variant="body2" sx={{ color: "text.primary", fontVariantNumeric: "tabular-nums" }}>
            {formatDate(p.row.activityDate)}
          </Typography>
        ),
      },
      {
        field: "placeName",
        headerName: "Lugar",
        flex: 1.3,
        minWidth: 220,
        renderCell: (p) => (
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" noWrap sx={{ color: "text.primary", fontWeight: 600 }}>
              {p.row.placeName}
            </Typography>
            <Typography variant="caption" noWrap component="div">
              {p.row.districtName} · {p.row.departmentName}
            </Typography>
          </Box>
        ),
      },
      { field: "phaseName", headerName: "Fase", flex: 1, minWidth: 180 },
      {
        field: "submittedByName",
        headerName: "Enviado por",
        width: 200,
        renderCell: (p) => (
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" noWrap sx={{ color: "text.primary" }}>
              {p.row.submittedByName ?? "—"}
            </Typography>
            {p.row.submittedAt && (
              <Typography variant="caption" component="div" sx={{ fontVariantNumeric: "tabular-nums" }}>
                {formatDateTime(p.row.submittedAt)}
              </Typography>
            )}
          </Box>
        ),
      },
      { field: "status", headerName: "Estado", width: 190, renderCell: (p) => <EstadoActaChip estado={p.row.status} /> },
    ],
    []
  );

  const total = query.data?.totalElements ?? 0;
  const isPending = estado === "PENDIENTE_REVISION";
  const hasFilters = estado !== "PENDIENTE_REVISION" || !!faseId;
  const open = (row: ActivityFormListItem) =>
    navigate(feRoutes.informe(row.activityId), { state: { from: { path: feRoutes.informes, label: "Informes" } } });

  return (
    <Stack spacing={{ xs: 2, md: 2.5 }} sx={{ flexShrink: 0, pb: 2 }}>
      <PageHeader
        title="Informes de actividades"
        titleAdornment={
          isPending &&
          (query.isLoading ? (
            <Skeleton variant="rounded" width={40} height={26} sx={{ borderRadius: 999 }} />
          ) : (
            <Box
              component="span"
              aria-label={`${total} pendientes`}
              sx={{
                px: 1.25,
                height: 26,
                display: "inline-flex",
                alignItems: "center",
                borderRadius: 999,
                bgcolor: total > 0 ? designTokens.status.warning.bg : designTokens.status.success.bg,
                color: total > 0 ? designTokens.status.warning.fg : designTokens.status.success.fg,
                fontWeight: 700,
                fontSize: "0.8125rem",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {countFormatter.format(total)}
            </Box>
          ))
        }
        subtitle="Un informe por actividad, enviado por su equipo. Ábrelo para leerlo completo y aprobar, observar o rechazar."
      />

      <FloatingToolbar>
        <Stack direction="row" alignItems="center" flexWrap="wrap" gap={1.25}>
          <TextField
            select
            size="small"
            aria-label="Estado"
            value={estado}
            onChange={(e) => setEstado(e.target.value as ActivityFormStatus | "")}
            SelectProps={{ displayEmpty: true }}
            sx={{ minWidth: 200, ...toolbarFieldSx }}
          >
            <MenuItem value="">Todos los estados</MenuItem>
            {STATUSES.map((s) => (
              <MenuItem key={s} value={s}>
                {ACTA_STATUS_TOKENS[s].label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            aria-label="Período electoral"
            value={periodId}
            onChange={(e) => {
              setPeriodId(Number(e.target.value));
              setFaseId("");
            }}
            SelectProps={{ displayEmpty: true }}
            sx={{ minWidth: 200, ...toolbarFieldSx }}
          >
            <MenuItem value="" disabled>
              Período
            </MenuItem>
            {(periodos ?? []).map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            aria-label="Fase"
            value={faseId}
            onChange={(e) => setFaseId(e.target.value ? Number(e.target.value) : "")}
            SelectProps={{ displayEmpty: true }}
            sx={{ minWidth: 220, maxWidth: 320, ...toolbarFieldSx }}
          >
            <MenuItem value="">Todas las fases</MenuItem>
            {(fasesQuery.data ?? []).map((f) => (
              <MenuItem key={f.id} value={f.id}>
                {f.name}
              </MenuItem>
            ))}
          </TextField>
          <Box sx={{ ml: { lg: "auto" } }}>
            {hasFilters && (
              <Button
                size="small"
                color="inherit"
                startIcon={<FilterAltOffOutlinedIcon />}
                onClick={() => {
                  setEstado("PENDIENTE_REVISION");
                  setFaseId("");
                }}
              >
                Ver pendientes
              </Button>
            )}
          </Box>
        </Stack>
      </FloatingToolbar>

      <Collapse in={query.isError} unmountOnExit>
        <Callout tone="error" title="No se pudo cargar la bandeja">
          {getApiErrorMessage(query.error, "Revisa tu conexión e inténtalo de nuevo.")}
        </Callout>
      </Collapse>

      <DataTable
        rows={query.data?.content ?? []}
        columns={columns}
        loading={query.isFetching}
        rowHeight={64}
        paginationMode="server"
        rowCount={total}
        paginationModel={pagination}
        onPaginationModelChange={setPagination}
        pageSizeOptions={[10, 20, 50]}
        clickableRows
        onRowClick={(p) => open(p.row)}
        onCellKeyDown={(p, e) => {
          if (e.key === "Enter") open(p.row);
        }}
        empty={
          isPending
            ? {
                icon: <TaskAltRoundedIcon sx={{ color: designTokens.status.success.fg }} />,
                title: "Todo al día",
                hint: "No hay informes esperando revisión. Los nuevos aparecerán aquí en cuanto un equipo los envíe.",
              }
            : { title: "Ningún informe en ese estado" }
        }
      />
    </Stack>
  );
}
