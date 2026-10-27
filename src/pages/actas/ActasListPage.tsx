import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Box, Button, Collapse, IconButton, InputAdornment, MenuItem, Paper, Stack, TextField } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import type { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/AddRounded";
import SearchIcon from "@mui/icons-material/SearchRounded";
import CloseIcon from "@mui/icons-material/CloseRounded";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import FilterAltOffOutlinedIcon from "@mui/icons-material/FilterAltOffOutlined";
import { actaApi } from "@/api/actaApi";
import { catalogApi } from "@/api/catalogApi";
import { getApiErrorMessage } from "@/utils/apiError";
import { useAuth } from "@/hooks/useAuth";
import { useIsTemporaryDelegate } from "@/hooks/useMyAccount";
import { useModulos } from "@/hooks/useModulos";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import { ACTA_STATUS_TOKENS } from "@/theme/statusTokens";
import type { ActaStatus } from "@/theme/statusTokens";
import type { ActaResponse } from "@/types/acta";
import { PageHeader } from "@/components/ui/PageHeader";
import { FloatingToolbar, toolbarFieldSx } from "@/components/ui/FloatingToolbar";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Callout } from "@/components/ui/Callout";
import { EmptyState, actaColumns, actaGridSx, actaNumberFormatter } from "./actaUi";

const ALL_STATUSES = Object.keys(ACTA_STATUS_TOKENS) as ActaStatus[];

const PRACTICE_ROLES = ["DIGITADOR", "DELEGADO_TEMPORAL", "ADMINISTRADOR"];

type Scope = "mine" | "all";
const SCOPE_OPTIONS: { value: Scope; label: string }[] = [
  { value: "mine", label: "Mis actas" },
  { value: "all", label: "Todas" },
];

export function ActasListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const isDigitador = !!user?.roles.includes("DIGITADOR") && user.roles.length === 1;
  // El delegado temporal fiscaliza duicentros con el mismo flujo que el
  // DIGITADOR, pero el backend lo aisla a sus propias actas: no hay "Todas"
  // ni filtro por delegado JVE que ofrecerle.
  const isTemporary = useIsTemporaryDelegate();

  // Modo practica: solo si el modulo TRAINING esta encendido y el rol puede
  // crear actas (mismo permiso que exige POST /practica/actas).
  const { isTrainingEnabled } = useModulos();
  const canPractice = isTrainingEnabled && PRACTICE_ROLES.some((r) => user?.roles.includes(r));

  const [onlyMine, setOnlyMine] = useState(isDigitador || isTemporary);
  // ?estado=RECHAZADA: llega asi desde el aviso "actas por corregir" del inicio.
  const [statusFilter, setStatusFilter] = useState<ActaStatus | "">(() => {
    const estado = searchParams.get("estado");
    return estado && (ALL_STATUSES as string[]).includes(estado) ? (estado as ActaStatus) : "";
  });
  const [actaNumberInput, setActaNumberInput] = useState("");
  const [actaNumberFilter, setActaNumberFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [delegateFilter, setDelegateFilter] = useState<number | "">("");
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 20 });

  // Busqueda por codigo con debounce: evita disparar una peticion por cada tecla.
  useEffect(() => {
    const timeout = setTimeout(() => setActaNumberFilter(actaNumberInput.trim()), 400);
    return () => clearTimeout(timeout);
  }, [actaNumberInput]);

  // Cualquier cambio de filtro vuelve a la primera pagina (si no, se puede quedar
  // en una pagina que ya no tiene resultados con el filtro nuevo).
  useEffect(() => {
    setPaginationModel((prev) => (prev.page === 0 ? prev : { ...prev, page: 0 }));
  }, [onlyMine, statusFilter, actaNumberFilter, dateFilter, delegateFilter]);

  const delegadosQuery = useQuery({
    queryKey: ["delegados", "JVE"],
    queryFn: () => catalogApi.getDelegados("JVE"),
    enabled: !isTemporary,
  });

  const actasQuery = useQuery({
    queryKey: [
      "actas",
      "mias",
      onlyMine,
      statusFilter,
      actaNumberFilter,
      dateFilter,
      delegateFilter,
      paginationModel.page,
      paginationModel.pageSize,
    ],
    queryFn: () =>
      actaApi.getActas(
        {
          createdByMe: onlyMine || isTemporary || undefined,
          status: statusFilter || undefined,
          actaNumber: actaNumberFilter || undefined,
          actaDate: dateFilter || undefined,
          jveDelegateId: delegateFilter || undefined,
        },
        paginationModel.page,
        paginationModel.pageSize
      ),
    placeholderData: keepPreviousData,
  });

  const hasFilters = !!statusFilter || !!actaNumberInput || !!dateFilter || !!delegateFilter;
  const clearFilters = () => {
    setStatusFilter("");
    setActaNumberInput("");
    setDateFilter("");
    setDelegateFilter("");
  };

  const columns: GridColDef<ActaResponse>[] = useMemo(
    () => [
      actaColumns.number,
      actaColumns.date,
      actaColumns.duicentro,
      actaColumns.status,
      actaColumns.total,
      actaColumns.flags,
      actaColumns.createdBy,
    ],
    []
  );

  const total = actasQuery.data?.totalElements;

  return (
    <Stack spacing={{ xs: 2, md: 2.5 }} sx={{ flexShrink: 0, pb: 2 }}>
      <PageHeader
        title="Actas"
        subtitle={
          isDigitador || isTemporary
            ? "Tus actas: crea, adjunta la foto del papel y envíalas a revisión."
            : "Consulta de actas del sistema. Toca una fila para ver su detalle."
        }
        actions={
          <>
            {canPractice && (
              <Button variant="outlined" startIcon={<SchoolOutlinedIcon />} onClick={() => navigate("/actas/practica")}>
                Acta de práctica
              </Button>
            )}
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate("/actas/nueva")}>
              Nueva acta
            </Button>
          </>
        }
      />

      <FloatingToolbar>
        <Stack direction="row" alignItems="center" flexWrap="wrap" gap={1.25}>
          {!isTemporary && (
            <SegmentedControl<Scope>
              ariaLabel="Qué actas mostrar"
              options={SCOPE_OPTIONS}
              value={onlyMine ? "mine" : "all"}
              onChange={(v) => setOnlyMine(v === "mine")}
            />
          )}
          <TextField
            size="small"
            placeholder="Buscar N° de acta"
            aria-label="Buscar por número de acta"
            value={actaNumberInput}
            onChange={(e) => setActaNumberInput(e.target.value)}
            sx={{ width: { xs: "100%", sm: 210 }, ...toolbarFieldSx }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18 }} />
                </InputAdornment>
              ),
              endAdornment: actaNumberInput ? (
                <IconButton size="small" aria-label="Limpiar búsqueda" onClick={() => setActaNumberInput("")} edge="end">
                  <CloseIcon sx={{ fontSize: 16 }} />
                </IconButton>
              ) : undefined,
            }}
          />
          <TextField
            select
            size="small"
            aria-label="Estado"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ActaStatus | "")}
            SelectProps={{ displayEmpty: true }}
            sx={{ minWidth: 190, ...toolbarFieldSx }}
          >
            <MenuItem value="">Todos los estados</MenuItem>
            {ALL_STATUSES.map((status) => (
              <MenuItem key={status} value={status}>
                {ACTA_STATUS_TOKENS[status].label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            type="date"
            size="small"
            aria-label="Fecha del acta"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            sx={{ width: 160, ...toolbarFieldSx, "& input": { fontVariantNumeric: "tabular-nums" } }}
          />
          {!isTemporary && (
            <TextField
              select
              size="small"
              aria-label="Delegado"
              value={delegateFilter}
              onChange={(e) => setDelegateFilter(e.target.value ? Number(e.target.value) : "")}
              SelectProps={{ displayEmpty: true }}
              sx={{ minWidth: 200, ...toolbarFieldSx }}
            >
              <MenuItem value="">Todos los delegados</MenuItem>
              {delegadosQuery.data?.map((delegado) => (
                <MenuItem key={delegado.id} value={delegado.id}>
                  {delegado.firstName} {delegado.lastName}
                </MenuItem>
              ))}
            </TextField>
          )}
          <Box sx={{ ml: { lg: "auto" } }}>
            {hasFilters && (
              <Button size="small" color="inherit" startIcon={<FilterAltOffOutlinedIcon />} onClick={clearFilters}>
                Limpiar
              </Button>
            )}
          </Box>
        </Stack>
      </FloatingToolbar>

      <Collapse in={actasQuery.isError}>
        <Callout tone="error" title="No se pudo cargar el listado">
          {getApiErrorMessage(actasQuery.error, "Revisa tu conexión e inténtalo de nuevo.")}
        </Callout>
      </Collapse>

      <Paper variant="outlined" sx={{ overflow: "hidden" }}>
        <DataGrid
          autoHeight
          rows={actasQuery.data?.content ?? []}
          columns={columns}
          loading={actasQuery.isFetching}
          disableRowSelectionOnClick
          disableColumnMenu
          rowHeight={60}
          columnHeaderHeight={44}
          paginationMode="server"
          rowCount={total ?? 0}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[10, 20, 50]}
          onRowClick={(params) => navigate(`/actas/${params.row.id}`)}
          onCellKeyDown={(params, event) => {
            if (event.key === "Enter") navigate(`/actas/${params.row.id}`);
          }}
          localeText={{
            MuiTablePagination: {
              labelRowsPerPage: "Por página",
              labelDisplayedRows: ({ from, to, count }) =>
                `${from}–${to} de ${count === -1 ? "muchas" : actaNumberFormatter.format(count)}`,
            },
          }}
          slots={{
            noRowsOverlay: () =>
              hasFilters ? (
                <EmptyState
                  icon={<FilterAltOffOutlinedIcon />}
                  title="Ninguna acta coincide"
                  hint="Prueba con otro estado, otra fecha o limpia los filtros."
                  action={
                    <Button size="small" variant="outlined" onClick={clearFilters}>
                      Limpiar filtros
                    </Button>
                  }
                />
              ) : (
                <EmptyState
                  icon={<DescriptionOutlinedIcon />}
                  title={onlyMine ? "Aún no tienes actas" : "Aún no hay actas"}
                  hint="Cuando se registre la primera acta aparecerá aquí."
                  action={
                    <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => navigate("/actas/nueva")}>
                      Nueva acta
                    </Button>
                  }
                />
              ),
          }}
          sx={{ ...actaGridSx, "--DataGrid-overlayHeight": "300px" }}
        />
      </Paper>
    </Stack>
  );
}
