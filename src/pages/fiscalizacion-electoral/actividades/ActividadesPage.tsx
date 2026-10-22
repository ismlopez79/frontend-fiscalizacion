import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Box, Button, Collapse, FormControlLabel, IconButton, MenuItem, Stack, Switch, TextField, Tooltip, Typography } from "@mui/material";
import type { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/AddRounded";
import EditIcon from "@mui/icons-material/EditOutlined";
import EventBusyOutlinedIcon from "@mui/icons-material/EventBusyOutlined";
import EventAvailableOutlinedIcon from "@mui/icons-material/EventAvailableOutlined";
import FilterAltOffOutlinedIcon from "@mui/icons-material/FilterAltOffOutlined";
import { activityApi, phaseApi } from "@/api/fiscalizacionFasesApi";
import { PageHeader } from "@/components/ui/PageHeader";
import { Callout } from "@/components/ui/Callout";
import { DataTable } from "@/components/ui/DataTable";
import { FloatingToolbar, toolbarFieldSx } from "@/components/ui/FloatingToolbar";
import { ConfirmacionAccion } from "@/components/ConfirmacionAccion";
import { ToastSnackbar } from "@/components/ToastSnackbar";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/hooks/useAuth";
import { useActiveElectoralPeriod } from "@/hooks/useActiveElectoralPeriod";
import { getApiErrorMessage } from "@/utils/apiError";
import { formatDate } from "@/utils/dateFormat";
import { designTokens } from "@/theme/theme";
import { ELECTION_TYPE_LABELS } from "@/types/fiscalizacionFases";
import type { ActivityDto } from "@/types/fiscalizacionFases";
import { TerritorioFields } from "../components/TerritorioFields";
import { ActivityStateChip, DelegateStack, districtLine, feRoutes } from "../fiscalizacionFasesUi";
import { ActividadFormDialog } from "./ActividadFormDialog";

/** Cuerpo del PUT a partir de la fila (para cancelar/reactivar sin abrir el formulario). */
function toUpdateBody(a: ActivityDto, active: boolean) {
  return {
    activityDate: a.activityDate,
    districtId: a.districtId,
    placeName: a.placeName,
    address: a.address,
    electionType: a.electionType,
    notes: a.notes,
    active,
  };
}

/**
 * Cuadro de actividades del periodo: el admin crea, corrige y cancela; el
 * revisor lo consulta. Paginado en el servidor; cada fila abre el detalle
 * (equipo de delegados e informe).
 */
export function ActividadesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast, showToast, closeToast } = useToast();
  const { user } = useAuth();
  const canManage = !!user?.roles.includes("ADMINISTRADOR");
  const { data: periodos, activePeriod } = useActiveElectoralPeriod();

  const [periodId, setPeriodId] = useState<number | "">("");
  const [faseId, setFaseId] = useState<number | "">("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [territorio, setTerritorio] = useState<{ departmentId: number | null; districtId: number | null }>({
    departmentId: null,
    districtId: null,
  });
  const [incluirCanceladas, setIncluirCanceladas] = useState(false);
  const [pagination, setPagination] = useState<GridPaginationModel>({ page: 0, pageSize: 20 });

  const [editing, setEditing] = useState<ActivityDto | null>(null);
  const [creating, setCreating] = useState(false);
  const [toToggle, setToToggle] = useState<ActivityDto | null>(null);

  useEffect(() => {
    if (periodId === "" && activePeriod) setPeriodId(activePeriod.id);
  }, [activePeriod, periodId]);

  useEffect(() => {
    setPagination((p) => (p.page === 0 ? p : { ...p, page: 0 }));
  }, [periodId, faseId, desde, hasta, territorio, incluirCanceladas]);

  const period = (periodos ?? []).find((p) => p.id === periodId) ?? null;

  const fasesQuery = useQuery({
    queryKey: ["fases", periodId, canManage ? "todas" : "activas"],
    queryFn: () => (canManage ? phaseApi.getFasesTodas(Number(periodId)) : phaseApi.getFases(Number(periodId))),
    enabled: !!periodId,
  });
  const fases = useMemo(() => [...(fasesQuery.data ?? [])].sort((a, b) => a.displayOrder - b.displayOrder), [fasesQuery.data]);
  const fasesActivas = fases.filter((f) => f.active);

  const filters = {
    periodoId: periodId || undefined,
    faseId: faseId || undefined,
    desde: desde || undefined,
    hasta: hasta || undefined,
    departamentoId: territorio.departmentId ?? undefined,
    distritoId: territorio.districtId ?? undefined,
    incluirCanceladas,
  };

  const listQuery = useQuery({
    queryKey: ["actividades", "cuadro", filters, pagination.page, pagination.pageSize],
    queryFn: () => activityApi.getActividades(filters, pagination.page, pagination.pageSize),
    enabled: !!periodId,
    placeholderData: keepPreviousData,
  });

  const toggleMutation = useMutation({
    mutationFn: (a: ActivityDto) => activityApi.actualizar(a.id, toUpdateBody(a, !a.active)),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["actividades"] });
      showToast("success", saved.active ? "Actividad reactivada." : "Actividad cancelada.");
    },
    onError: (error) => showToast("error", getApiErrorMessage(error, "No se pudo cambiar la actividad.")),
  });

  const hasFilters = !!faseId || !!desde || !!hasta || !!territorio.departmentId || incluirCanceladas;
  const clearFilters = () => {
    setFaseId("");
    setDesde("");
    setHasta("");
    setTerritorio({ departmentId: null, districtId: null });
    setIncluirCanceladas(false);
  };

  const columns: GridColDef<ActivityDto>[] = useMemo(
    () => [
      {
        field: "activityDate",
        headerName: "Fecha",
        width: 118,
        renderCell: (p) => (
          <Typography variant="body2" sx={{ color: "text.primary", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
            {formatDate(p.row.activityDate)}
          </Typography>
        ),
      },
      {
        field: "placeName",
        headerName: "Lugar",
        flex: 1.4,
        minWidth: 240,
        renderCell: (p) => (
          <Box sx={{ minWidth: 0, py: 1 }}>
            <Typography variant="body2" noWrap sx={{ color: "text.primary", fontWeight: 600 }}>
              {p.row.placeName}
            </Typography>
            <Typography variant="caption" noWrap component="div">
              {districtLine(p.row)} · {p.row.departmentName}
            </Typography>
          </Box>
        ),
      },
      {
        field: "phaseName",
        headerName: "Fase",
        flex: 1,
        minWidth: 200,
        renderCell: (p) => (
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" noWrap sx={{ color: "text.primary" }}>
              {p.row.phaseName}
            </Typography>
            {p.row.electionType && (
              <Typography variant="caption" component="div">
                {ELECTION_TYPE_LABELS[p.row.electionType]}
              </Typography>
            )}
          </Box>
        ),
      },
      {
        field: "delegates",
        headerName: "Equipo",
        width: 200,
        sortable: false,
        renderCell: (p) => <DelegateStack names={p.row.delegates.map((d) => d.fullName)} />,
      },
      {
        field: "active",
        headerName: "Estado",
        width: 120,
        renderCell: (p) => <ActivityStateChip active={p.row.active} />,
      },
      ...(canManage
        ? [
            {
              field: "actions",
              headerName: "",
              width: 104,
              sortable: false,
              align: "right",
              renderCell: (p) => (
                <Stack direction="row" gap={0.5} onClick={(e) => e.stopPropagation()}>
                  <Tooltip title="Corregir">
                    <IconButton size="small" aria-label="Corregir actividad" onClick={() => setEditing(p.row)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={p.row.active ? "Cancelar actividad" : "Reactivar actividad"}>
                    <IconButton
                      size="small"
                      aria-label={p.row.active ? "Cancelar actividad" : "Reactivar actividad"}
                      onClick={() => setToToggle(p.row)}
                      sx={{ color: p.row.active ? designTokens.status.error.fg : designTokens.status.success.fg }}
                    >
                      {p.row.active ? <EventBusyOutlinedIcon fontSize="small" /> : <EventAvailableOutlinedIcon fontSize="small" />}
                    </IconButton>
                  </Tooltip>
                </Stack>
              ),
            } satisfies GridColDef<ActivityDto>,
          ]
        : []),
    ],
    [canManage]
  );

  return (
    <Stack spacing={{ xs: 2, md: 2.5 }} sx={{ flexShrink: 0, pb: 2 }}>
      <PageHeader
        title="Actividades"
        subtitle="Cada actividad es un evento de una fase: fecha, distrito, lugar y su equipo de delegados, que entrega un solo informe."
        actions={
          canManage && (
            <Button variant="contained" startIcon={<AddIcon />} disabled={!period || fasesActivas.length === 0} onClick={() => setCreating(true)}>
              Nueva actividad
            </Button>
          )
        }
      />

      <FloatingToolbar>
        <Stack direction="row" alignItems="center" flexWrap="wrap" gap={1.25}>
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
                {p.active ? " · activo" : ""}
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
            sx={{ minWidth: 220, maxWidth: 300, ...toolbarFieldSx }}
          >
            <MenuItem value="">Todas las fases</MenuItem>
            {fases.map((f) => (
              <MenuItem key={f.id} value={f.id}>
                {f.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            type="date"
            size="small"
            label="Desde"
            InputLabelProps={{ shrink: true }}
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            sx={{ width: 160, ...toolbarFieldSx, "& input": { fontVariantNumeric: "tabular-nums" } }}
          />
          <TextField
            type="date"
            size="small"
            label="Hasta"
            InputLabelProps={{ shrink: true }}
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            inputProps={{ min: desde || undefined }}
            sx={{ width: 160, ...toolbarFieldSx, "& input": { fontVariantNumeric: "tabular-nums" } }}
          />
          <Box sx={toolbarFieldSx}>
            <TerritorioFields
              variant="filter"
              size="small"
              departmentId={territorio.departmentId}
              districtId={territorio.districtId}
              onChange={setTerritorio}
            />
          </Box>
          <FormControlLabel
            control={<Switch size="small" checked={incluirCanceladas} onChange={(e) => setIncluirCanceladas(e.target.checked)} />}
            label={<Typography variant="body2">Incluir canceladas</Typography>}
            sx={{ ml: 0.25, mr: 0 }}
          />
          <Box sx={{ ml: { lg: "auto" } }}>
            {hasFilters && (
              <Button size="small" color="inherit" startIcon={<FilterAltOffOutlinedIcon />} onClick={clearFilters}>
                Limpiar
              </Button>
            )}
          </Box>
        </Stack>
      </FloatingToolbar>

      {!periodId && (periodos ?? []).length === 0 && (
        <Callout tone="info">Primero crea un período electoral: las actividades viven dentro de sus fases.</Callout>
      )}

      <Collapse in={listQuery.isError} unmountOnExit>
        <Callout tone="error" title="No se pudo cargar el cuadro de actividades">
          {getApiErrorMessage(listQuery.error, "Revisa tu conexión e inténtalo de nuevo.")}
        </Callout>
      </Collapse>

      <DataTable
        rows={listQuery.data?.content ?? []}
        columns={columns}
        loading={listQuery.isFetching}
        rowHeight={64}
        paginationMode="server"
        rowCount={listQuery.data?.totalElements ?? 0}
        paginationModel={pagination}
        onPaginationModelChange={setPagination}
        pageSizeOptions={[10, 20, 50]}
        clickableRows
        onRowClick={(p) => navigate(feRoutes.actividad(p.row.id))}
        onCellKeyDown={(p, e) => {
          if (e.key === "Enter" && p.field !== "actions") navigate(feRoutes.actividad(p.row.id));
        }}
        getRowClassName={(p) => (p.row.active ? "" : "row-cancelled")}
        sx={{ "& .row-cancelled .MuiDataGrid-cell": { opacity: 0.6 } }}
        empty={
          hasFilters
            ? {
                icon: <FilterAltOffOutlinedIcon />,
                title: "Ninguna actividad coincide",
                hint: "Prueba con otra fase, otras fechas u otro distrito.",
                action: (
                  <Button size="small" variant="outlined" onClick={clearFilters}>
                    Limpiar filtros
                  </Button>
                ),
              }
            : {
                icon: <EventAvailableOutlinedIcon />,
                title: "Aún no hay actividades en este período",
                hint: canManage ? "Crea la primera: elige la fase, la fecha, el distrito y el equipo." : undefined,
              }
        }
      />

      {canManage && (
        <ActividadFormDialog
          open={creating || !!editing}
          activity={editing}
          period={period}
          phases={editing ? fases : fasesActivas}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={(saved, created) => {
            setCreating(false);
            setEditing(null);
            showToast("success", created ? "Actividad creada." : "Actividad actualizada.");
            if (created) navigate(feRoutes.actividad(saved.id));
          }}
        />
      )}

      <ConfirmacionAccion
        open={!!toToggle}
        titulo={toToggle?.active ? "Cancelar actividad" : "Reactivar actividad"}
        descripcion={
          toToggle
            ? toToggle.active
              ? `"${toToggle.placeName}" del ${formatDate(toToggle.activityDate)} quedará cancelada. Su equipo dejará de verla como pendiente.`
              : `"${toToggle.placeName}" del ${formatDate(toToggle.activityDate)} vuelve a quedar programada.`
            : undefined
        }
        variant={toToggle?.active ? "destructive" : "default"}
        confirmLabel={toToggle?.active ? "Cancelar actividad" : "Reactivar"}
        loading={toggleMutation.isPending}
        onConfirm={() => {
          if (toToggle) toggleMutation.mutate(toToggle);
          setToToggle(null);
        }}
        onCancel={() => setToToggle(null)}
      />

      <ToastSnackbar toast={toast} onClose={closeToast} autoHideDuration={toast?.severity === "error" ? 9000 : 4000} />
    </Stack>
  );
}
