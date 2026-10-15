import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Box, Button, Collapse, MenuItem, Paper, Stack, TextField } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import type { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/AddRounded";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import FilterAltOffOutlinedIcon from "@mui/icons-material/FilterAltOffOutlined";
import { fiscalizationFormApi } from "@/api/fiscalizationFormApi";
import { serviceCenterApi } from "@/api/electoralApi";
import { getApiErrorMessage } from "@/utils/apiError";
import { useAuth } from "@/hooks/useAuth";
import { useActiveElectoralPeriod } from "@/hooks/useActiveElectoralPeriod";
import { ACTA_STATUS_TOKENS } from "@/theme/statusTokens";
import type { ActaStatus } from "@/theme/statusTokens";
import type { FiscalizationFormResponse } from "@/types/fiscalizacionForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { FloatingToolbar, toolbarFieldSx } from "@/components/ui/FloatingToolbar";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Callout } from "@/components/ui/Callout";
import { EmptyState } from "@/components/ui/EmptyState";
import { actaGridSx, actaNumberFormatter } from "@/pages/actas/actaUi";
import { fiscalizacionColumns } from "./fiscalizacionUi";

const ALL_STATUSES = Object.keys(ACTA_STATUS_TOKENS) as ActaStatus[];

// Delegado temporal o delegado permanente (DIGITADOR, el mismo que fiscaliza duicentros via actas).
const DELEGATE_ROLES = ["DELEGADO_TEMPORAL", "DIGITADOR"];

type Scope = "mine" | "all";
const SCOPE_OPTIONS: { value: Scope; label: string }[] = [
  { value: "mine", label: "Mis formularios" },
  { value: "all", label: "Todos" },
];

export function FiscalizacionListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isDelegado = DELEGATE_ROLES.some((r) => user?.roles.includes(r));
  const { activePeriod } = useActiveElectoralPeriod();

  const [onlyMine, setOnlyMine] = useState(isDelegado);
  const [statusFilter, setStatusFilter] = useState<ActaStatus | "">("");
  const [dateFilter, setDateFilter] = useState("");
  const [centroFilter, setCentroFilter] = useState<number | "">("");
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 20 });

  useEffect(() => {
    setPaginationModel((prev) => (prev.page === 0 ? prev : { ...prev, page: 0 }));
  }, [onlyMine, statusFilter, dateFilter, centroFilter]);

  const centrosQuery = useQuery({
    queryKey: ["centros-servicio", activePeriod?.id ?? null],
    queryFn: () => serviceCenterApi.getCentros(activePeriod!.id, false),
    enabled: !!activePeriod,
  });

  const formulariosQuery = useQuery({
    queryKey: [
      "formularios-fiscalizacion",
      onlyMine,
      statusFilter,
      dateFilter,
      centroFilter,
      paginationModel.page,
      paginationModel.pageSize,
    ],
    queryFn: () =>
      fiscalizationFormApi.getFormularios(
        {
          createdByMe: onlyMine || undefined,
          status: statusFilter || undefined,
          formDate: dateFilter || undefined,
          serviceCenterId: centroFilter || undefined,
        },
        paginationModel.page,
        paginationModel.pageSize
      ),
    placeholderData: keepPreviousData,
  });

  const hasFilters = !!statusFilter || !!dateFilter || !!centroFilter;
  const clearFilters = () => {
    setStatusFilter("");
    setDateFilter("");
    setCentroFilter("");
  };

  const columns: GridColDef<FiscalizationFormResponse>[] = useMemo(
    () => [
      fiscalizacionColumns.number,
      fiscalizacionColumns.date,
      fiscalizacionColumns.centro,
      fiscalizacionColumns.delegate,
      fiscalizacionColumns.status,
    ],
    []
  );

  return (
    <Stack spacing={{ xs: 2, md: 2.5 }} sx={{ flexShrink: 0, pb: 2 }}>
      <PageHeader
        title="Fiscalización"
        subtitle={
          isDelegado
            ? "Tus formularios de fiscalización: crea, envía a revisión y da seguimiento."
            : "Consulta de formularios de fiscalización electoral. Toca una fila para ver su detalle."
        }
        actions={
          isDelegado && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate("/fiscalizacion/nueva")}>
              Nueva fiscalización
            </Button>
          )
        }
      />

      <FloatingToolbar>
        <Stack direction="row" alignItems="center" flexWrap="wrap" gap={1.25}>
          <SegmentedControl<Scope>
            ariaLabel="Qué formularios mostrar"
            options={SCOPE_OPTIONS}
            value={onlyMine ? "mine" : "all"}
            onChange={(v) => setOnlyMine(v === "mine")}
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
            aria-label="Fecha"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            sx={{ width: 160, ...toolbarFieldSx, "& input": { fontVariantNumeric: "tabular-nums" } }}
          />
          <TextField
            select
            size="small"
            aria-label="Centro de servicio"
            value={centroFilter}
            onChange={(e) => setCentroFilter(e.target.value ? Number(e.target.value) : "")}
            SelectProps={{ displayEmpty: true }}
            sx={{ minWidth: 220, ...toolbarFieldSx }}
          >
            <MenuItem value="">Todos los centros</MenuItem>
            {(centrosQuery.data ?? []).map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.name}
              </MenuItem>
            ))}
          </TextField>
          <Box sx={{ ml: { lg: "auto" } }}>
            {hasFilters && (
              <Button size="small" color="inherit" startIcon={<FilterAltOffOutlinedIcon />} onClick={clearFilters}>
                Limpiar
              </Button>
            )}
          </Box>
        </Stack>
      </FloatingToolbar>

      <Collapse in={formulariosQuery.isError}>
        <Callout tone="error" title="No se pudo cargar el listado">
          {getApiErrorMessage(formulariosQuery.error, "Revisa tu conexión e inténtalo de nuevo.")}
        </Callout>
      </Collapse>

      <Paper variant="outlined" sx={{ overflow: "hidden" }}>
        <DataGrid
          autoHeight
          rows={formulariosQuery.data?.content ?? []}
          columns={columns}
          loading={formulariosQuery.isFetching}
          disableRowSelectionOnClick
          disableColumnMenu
          rowHeight={56}
          columnHeaderHeight={44}
          paginationMode="server"
          rowCount={formulariosQuery.data?.totalElements ?? 0}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[10, 20, 50]}
          onRowClick={(params) => navigate(`/fiscalizacion/${params.row.id}`)}
          onCellKeyDown={(params, event) => {
            if (event.key === "Enter") navigate(`/fiscalizacion/${params.row.id}`);
          }}
          localeText={{
            MuiTablePagination: {
              labelRowsPerPage: "Por página",
              labelDisplayedRows: ({ from, to, count }) => `${from}–${to} de ${actaNumberFormatter.format(count)}`,
            },
          }}
          slots={{
            noRowsOverlay: () =>
              hasFilters ? (
                <EmptyState
                  icon={<FilterAltOffOutlinedIcon />}
                  title="Ningún formulario coincide"
                  hint="Prueba con otro estado, otra fecha u otro centro."
                  action={
                    <Button size="small" variant="outlined" onClick={clearFilters}>
                      Limpiar filtros
                    </Button>
                  }
                />
              ) : (
                <EmptyState
                  icon={<FactCheckOutlinedIcon />}
                  title={onlyMine ? "Aún no tienes formularios" : "Aún no hay formularios"}
                  hint="Cuando se registre la primera fiscalización aparecerá aquí."
                  action={
                    isDelegado && (
                      <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => navigate("/fiscalizacion/nueva")}>
                        Nueva fiscalización
                      </Button>
                    )
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
