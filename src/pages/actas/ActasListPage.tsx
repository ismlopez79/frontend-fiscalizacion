import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  Chip,
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
import WarningAmberIcon from "@mui/icons-material/WarningAmberOutlined";
import CloseIcon from "@mui/icons-material/CloseRounded";
import { actaApi } from "@/api/actaApi";
import { catalogApi } from "@/api/catalogApi";
import { getApiErrorMessage } from "@/utils/apiError";
import { useAuth } from "@/hooks/useAuth";
import { EstadoActaChip } from "@/components/EstadoActaChip";
import { ACTA_STATUS_TOKENS } from "@/theme/statusTokens";
import type { ActaStatus } from "@/theme/statusTokens";
import type { ActaResponse } from "@/types/acta";

const ALL_STATUSES = Object.keys(ACTA_STATUS_TOKENS) as ActaStatus[];

export function ActasListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isDigitador = !!user?.roles.includes("DIGITADOR") && user.roles.length === 1;

  const [onlyMine, setOnlyMine] = useState(isDigitador);
  const [statusFilter, setStatusFilter] = useState<ActaStatus | "">("");
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
          createdByMe: onlyMine || undefined,
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

  const columns: GridColDef<ActaResponse>[] = useMemo(
    () => [
      { field: "actaNumber", headerName: "N° de acta", width: 160 },
      { field: "actaDate", headerName: "Fecha", width: 120 },
      { field: "duicentroName", headerName: "Duicentro", flex: 1, minWidth: 180 },
      {
        field: "status",
        headerName: "Estado",
        width: 190,
        renderCell: (params) => <EstadoActaChip estado={params.row.status} />,
      },
      {
        field: "calculatedTotal",
        headerName: "Total",
        width: 100,
        valueGetter: (_v, row) => row.calculatedTotal,
      },
      {
        field: "flags",
        headerName: "Alertas",
        width: 140,
        sortable: false,
        renderCell: (params) => (
          <Stack direction="row" spacing={0.5}>
            {params.row.hasDiscrepancy && (
              <Tooltip title="El total declarado no coincide con el calculado">
                <Chip
                  size="small"
                  icon={<WarningAmberIcon fontSize="small" />}
                  label="Discrepancia"
                  color="warning"
                  variant="outlined"
                />
              </Tooltip>
            )}
            {params.row.possibleDuplicate && (
              <Tooltip title="Posible duplicado de otra acta">
                <Chip size="small" label="Duplicado?" color="error" variant="outlined" />
              </Tooltip>
            )}
          </Stack>
        ),
      },
      { field: "createdByUsername", headerName: "Creada por", width: 130 },
      {
        field: "actions",
        headerName: "",
        width: 60,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <Tooltip title="Ver detalle">
            <IconButton size="small" onClick={() => navigate(`/actas/${params.row.id}`)}>
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
          <Typography variant="h3">Actas</Typography>
          <Typography variant="body2" color="text.secondary">
            {isDigitador
              ? "Tus actas: crea, adjunta archivos y envíalas a revisión."
              : "Consulta de actas del sistema."}
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate("/actas/nueva")}>
          Nueva acta
        </Button>
      </Stack>

      <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" rowGap={1}>
        <FormControlLabel
          control={<Switch checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} />}
          label={<Typography variant="body2">Mostrar solo mis actas</Typography>}
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
          label="N° de acta"
          size="small"
          placeholder="Buscar por codigo"
          sx={{ minWidth: 200 }}
          value={actaNumberInput}
          onChange={(e) => setActaNumberInput(e.target.value)}
          InputProps={{
            endAdornment: actaNumberInput ? (
              <IconButton size="small" onClick={() => setActaNumberInput("")} edge="end">
                <CloseIcon fontSize="small" />
              </IconButton>
            ) : undefined,
          }}
        />
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
          label="Delegado"
          size="small"
          sx={{ minWidth: 220 }}
          value={delegateFilter}
          onChange={(e) => setDelegateFilter(e.target.value ? Number(e.target.value) : "")}
        >
          <MenuItem value="">Todos los delegados</MenuItem>
          {delegadosQuery.data?.map((delegado) => (
            <MenuItem key={delegado.id} value={delegado.id}>
              {delegado.firstName} {delegado.lastName}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <Collapse in={actasQuery.isError}>
        <Alert severity="error">{getApiErrorMessage(actasQuery.error, "No se pudo cargar el listado de actas.")}</Alert>
      </Collapse>

      <Paper variant="outlined" sx={{ height: 600 }}>
        <DataGrid
          rows={actasQuery.data?.content ?? []}
          columns={columns}
          loading={actasQuery.isFetching}
          disableRowSelectionOnClick
          density="comfortable"
          paginationMode="server"
          rowCount={actasQuery.data?.totalElements ?? 0}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[10, 20, 50]}
          onRowDoubleClick={(params) => navigate(`/actas/${params.row.id}`)}
          sx={{ border: "none" }}
        />
      </Paper>
    </Stack>
  );
}
