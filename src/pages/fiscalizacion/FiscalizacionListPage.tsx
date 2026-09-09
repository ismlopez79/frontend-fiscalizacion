import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  Collapse,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import type { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/AddRounded";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import { fiscalizationFormApi } from "@/api/fiscalizationFormApi";
import { serviceCenterApi } from "@/api/electoralApi";
import { getApiErrorMessage } from "@/utils/apiError";
import { useAuth } from "@/hooks/useAuth";
import { useActiveElectoralPeriod } from "@/hooks/useActiveElectoralPeriod";
import { EstadoActaChip } from "@/components/EstadoActaChip";
import { ACTA_STATUS_TOKENS } from "@/theme/statusTokens";
import type { ActaStatus } from "@/theme/statusTokens";
import type { FiscalizationFormResponse } from "@/types/fiscalizacionForm";

const ALL_STATUSES = Object.keys(ACTA_STATUS_TOKENS) as ActaStatus[];

// Delegado temporal o delegado permanente (DIGITADOR, el mismo que fiscaliza duicentros via actas).
const DELEGATE_ROLES = ["DELEGADO_TEMPORAL", "DIGITADOR"];

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

  const columns: GridColDef<FiscalizationFormResponse>[] = useMemo(
    () => [
      {
        field: "formNumber",
        headerName: "N° de formulario",
        width: 170,
        valueGetter: (_v, row) => row.formNumber ?? "—",
      },
      { field: "formDate", headerName: "Fecha", width: 120 },
      { field: "serviceCenterName", headerName: "Centro de servicio", flex: 1, minWidth: 200 },
      { field: "delegateName", headerName: "Delegado", width: 160 },
      {
        field: "status",
        headerName: "Estado",
        width: 190,
        renderCell: (params) => <EstadoActaChip estado={params.row.status} />,
      },
      {
        field: "actions",
        headerName: "",
        width: 60,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <Tooltip title="Ver detalle">
            <IconButton size="small" onClick={() => navigate(`/fiscalizacion/${params.row.id}`)}>
              <VisibilityOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ),
      },
    ],
    [navigate]
  );

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" rowGap={1}>
        <Box>
          <Typography variant="h3">Fiscalización</Typography>
          <Typography variant="body2" color="text.secondary">
            {isDelegado
              ? "Tus formularios de fiscalización: crea, envía a revisión y da seguimiento."
              : "Consulta de formularios de fiscalización electoral."}
          </Typography>
        </Box>
        {isDelegado && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate("/fiscalizacion/nueva")}>
            Nueva fiscalización
          </Button>
        )}
      </Stack>

      <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" rowGap={1}>
        <FormControlLabel
          control={<Switch checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} />}
          label={<Typography variant="body2">Mostrar solo mis formularios</Typography>}
        />
        <TextField
          select
          label="Estado"
          size="small"
          sx={{ minWidth: 220 }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ActaStatus | "")}
        >
          <MenuItem value="">Todos los estados</MenuItem>
          {ALL_STATUSES.map((status) => (
            <MenuItem key={status} value={status}>
              {ACTA_STATUS_TOKENS[status].label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Fecha"
          type="date"
          size="small"
          sx={{ minWidth: 170 }}
          InputLabelProps={{ shrink: true }}
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
        />
        <TextField
          select
          label="Centro de servicio"
          size="small"
          sx={{ minWidth: 220 }}
          value={centroFilter}
          onChange={(e) => setCentroFilter(e.target.value ? Number(e.target.value) : "")}
        >
          <MenuItem value="">Todos los centros</MenuItem>
          {(centrosQuery.data ?? []).map((c) => (
            <MenuItem key={c.id} value={c.id}>
              {c.name}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <Collapse in={formulariosQuery.isError}>
        <Alert severity="error">
          {getApiErrorMessage(formulariosQuery.error, "No se pudo cargar el listado de formularios.")}
        </Alert>
      </Collapse>

      <Paper variant="outlined" sx={{ height: 600 }}>
        <DataGrid
          rows={formulariosQuery.data?.content ?? []}
          columns={columns}
          loading={formulariosQuery.isFetching}
          disableRowSelectionOnClick
          density="comfortable"
          paginationMode="server"
          rowCount={formulariosQuery.data?.totalElements ?? 0}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[10, 20, 50]}
          onRowDoubleClick={(params) => navigate(`/fiscalizacion/${params.row.id}`)}
          sx={{ border: "none" }}
        />
      </Paper>
    </Stack>
  );
}
