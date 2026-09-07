import { useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Collapse,
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import type { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import dayjs from "dayjs";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import FilterAltOffOutlinedIcon from "@mui/icons-material/FilterAltOffOutlined";
import { auditApi } from "@/api/auditApi";
import { getApiErrorMessage } from "@/utils/apiError";
import { AuditActionChip } from "@/components/AuditActionChip";
import { AUDIT_ACTIONS, AUDIT_ENTITY_NAMES } from "@/types/audit";
import type { AuditLogDto, AuditLogFilters } from "@/types/audit";

const EMPTY_FILTERS: AuditLogFilters = {};

/**
 * Bandeja de auditoria: solo lectura sobre audit_logs (permiso AUDIT_VIEW,
 * hoy solo ADMINISTRADOR). Filtros combinables por AND, paginacion server-
 * side (el backend ya pagina, no tiene sentido traer todo y filtrar en el
 * cliente) y un detalle expandible por fila para ver el before/after
 * completo de un cambio.
 */
export function AuditoriaPage() {
  const [filtersDraft, setFiltersDraft] = useState<AuditLogFilters>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<AuditLogFilters>(EMPTY_FILTERS);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 30,
  });
  const [detailRow, setDetailRow] = useState<AuditLogDto | null>(null);

  const logsQuery = useQuery({
    queryKey: ["audit-logs", appliedFilters, paginationModel.page, paginationModel.pageSize],
    queryFn: () =>
      auditApi.getAuditLogs(appliedFilters, paginationModel.page, paginationModel.pageSize),
    placeholderData: keepPreviousData,
  });

  const applyFilters = () => {
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
    setAppliedFilters(filtersDraft);
  };

  const clearFilters = () => {
    setFiltersDraft(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  };

  const hasActiveFilters = Object.values(appliedFilters).some((v) => v !== undefined && v !== "");

  const columns: GridColDef<AuditLogDto>[] = useMemo(
    () => [
      {
        field: "createdAt",
        headerName: "Fecha",
        width: 170,
        valueGetter: (_value, row) => dayjs(row.createdAt).format("DD/MM/YYYY HH:mm:ss"),
      },
      {
        field: "username",
        headerName: "Usuario",
        width: 190,
        renderCell: (params) => (
          <Stack sx={{ py: 0.75, lineHeight: 1.3 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {params.row.username}
            </Typography>
            {params.row.fullName && params.row.fullName !== params.row.username && (
              <Typography variant="caption" color="text.secondary">
                {params.row.fullName}
              </Typography>
            )}
          </Stack>
        ),
      },
      {
        field: "action",
        headerName: "Acción",
        width: 140,
        renderCell: (params) => <AuditActionChip action={params.row.action} />,
      },
      {
        field: "entity",
        headerName: "Entidad",
        width: 160,
        sortable: false,
        valueGetter: (_value, row) =>
          row.entityId !== null ? `${row.entityName} #${row.entityId}` : row.entityName,
      },
      { field: "fieldName", headerName: "Campo", width: 130, valueGetter: (_v, row) => row.fieldName ?? "—" },
      {
        field: "change",
        headerName: "Cambio",
        flex: 1,
        minWidth: 220,
        sortable: false,
        // En filas CREATE, fieldName/oldValue/newValue vienen null a proposito
        // (una creacion no tiene "campo que cambio") y el detalle vive en
        // extraInfo. Sin este fallback, toda alta se veia "vacia" en la
        // tabla aunque el backend si trae la info.
        valueGetter: (_value, row) => {
          if (row.oldValue || row.newValue) {
            return `${row.oldValue ?? "—"} → ${row.newValue ?? "—"}`;
          }
          return row.extraInfo ?? "—";
        },
      },
      { field: "ipAddress", headerName: "IP", width: 120, valueGetter: (_v, row) => row.ipAddress ?? "—" },
      {
        field: "actions",
        headerName: "",
        width: 60,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <Tooltip title="Ver detalle">
            <IconButton size="small" onClick={() => setDetailRow(params.row)}>
              <VisibilityOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ),
      },
    ],
    []
  );

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h3">Auditoría</Typography>
        <Typography variant="body2" color="text.secondary">
          Consulta de solo lectura sobre el historial de acciones del sistema: logins, altas y
          cambios de estado de actas, subida de archivos y cambios de usuarios.
        </Typography>
      </Box>

      <Paper variant="outlined" sx={{ p: 2.5 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              label="Usuario"
              fullWidth
              size="small"
              value={filtersDraft.username ?? ""}
              onChange={(e) => setFiltersDraft((f) => ({ ...f, username: e.target.value || undefined }))}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Autocomplete
              freeSolo
              options={AUDIT_ENTITY_NAMES}
              value={filtersDraft.entityName ?? ""}
              onInputChange={(_e, value) =>
                setFiltersDraft((f) => ({ ...f, entityName: value || undefined }))
              }
              renderInput={(params) => (
                <TextField {...params} label="Entidad" size="small" placeholder="ACTA, USER..." />
              )}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={1.5}>
            <TextField
              label="Id de entidad"
              type="number"
              fullWidth
              size="small"
              value={filtersDraft.entityId ?? ""}
              onChange={(e) =>
                setFiltersDraft((f) => ({
                  ...f,
                  entityId: e.target.value === "" ? undefined : Number(e.target.value),
                }))
              }
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              select
              label="Acción"
              fullWidth
              size="small"
              value={filtersDraft.action ?? ""}
              onChange={(e) => setFiltersDraft((f) => ({ ...f, action: e.target.value || undefined }))}
            >
              <MenuItem value="">Todas</MenuItem>
              {AUDIT_ACTIONS.map((action) => (
                <MenuItem key={action} value={action}>
                  {action}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              label="Desde"
              type="datetime-local"
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
              value={filtersDraft.from ?? ""}
              onChange={(e) => setFiltersDraft((f) => ({ ...f, from: e.target.value || undefined }))}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              label="Hasta"
              type="datetime-local"
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
              value={filtersDraft.to ?? ""}
              onChange={(e) => setFiltersDraft((f) => ({ ...f, to: e.target.value || undefined }))}
            />
          </Grid>
        </Grid>

        <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
          <Button variant="contained" onClick={applyFilters}>
            Filtrar
          </Button>
          <Button
            variant="text"
            color="inherit"
            startIcon={<FilterAltOffOutlinedIcon />}
            onClick={clearFilters}
            disabled={!hasActiveFilters && Object.values(filtersDraft).every((v) => !v)}
          >
            Limpiar filtros
          </Button>
        </Stack>
      </Paper>

      {logsQuery.isError && (
        <Alert severity="error">
          {getApiErrorMessage(logsQuery.error, "No se pudo cargar la auditoría.")}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ height: 600 }}>
        <DataGrid
          rows={logsQuery.data?.content ?? []}
          columns={columns}
          loading={logsQuery.isFetching}
          disableRowSelectionOnClick
          density="comfortable"
          paginationMode="server"
          rowCount={logsQuery.data?.totalElements ?? 0}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[15, 30, 50, 100]}
          sortingMode="client"
          sx={{ border: "none" }}
        />
      </Paper>

      <Dialog open={!!detailRow} onClose={() => setDetailRow(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Detalle del evento #{detailRow?.id}</DialogTitle>
        <DialogContent>
          {detailRow && (
            <Stack spacing={1.5} sx={{ pb: 1 }}>
              <DetailRow label="Fecha" value={dayjs(detailRow.createdAt).format("DD/MM/YYYY HH:mm:ss")} />
              <DetailRow label="Usuario" value={detailRow.username} />
              <DetailRow label="Nombre completo" value={detailRow.fullName || "—"} />
              <DetailRow label="Acción" value={detailRow.action} />
              <DetailRow
                label="Entidad"
                value={
                  detailRow.entityId !== null
                    ? `${detailRow.entityName} #${detailRow.entityId}`
                    : detailRow.entityName
                }
              />
              <DetailRow label="Campo" value={detailRow.fieldName ?? "—"} />
              <DetailRow label="Valor anterior" value={detailRow.oldValue ?? "—"} />
              <DetailRow label="Valor nuevo" value={detailRow.newValue ?? "—"} />
              <DetailRow label="IP" value={detailRow.ipAddress ?? "—"} />
              <Collapse in={!!detailRow.extraInfo}>
                <DetailRow label="Info adicional" value={detailRow.extraInfo ?? "—"} multiline />
              </Collapse>
            </Stack>
          )}
        </DialogContent>
      </Dialog>
    </Stack>
  );
}

function DetailRow({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <Stack direction={multiline ? "column" : "row"} spacing={multiline ? 0.5 : 1}>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 140, fontWeight: 600 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ wordBreak: "break-word" }}>
        {value}
      </Typography>
    </Stack>
  );
}
