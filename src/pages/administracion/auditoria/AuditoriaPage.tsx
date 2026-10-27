import { useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Autocomplete, Box, Button, Collapse, Dialog, DialogContent, IconButton, MenuItem, Stack, TextField, Typography } from "@mui/material";
import type { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import dayjs from "dayjs";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import FilterAltOffOutlinedIcon from "@mui/icons-material/FilterAltOffOutlined";
import { auditApi } from "@/api/auditApi";
import { getApiErrorMessage } from "@/utils/apiError";
import { etiquetaEstado } from "@/utils/estados";
import { AuditActionChip } from "@/components/AuditActionChip";
import { PageHeader } from "@/components/ui/PageHeader";
import { Surface } from "@/components/ui/Surface";
import { Callout } from "@/components/ui/Callout";
import { DataTable } from "@/components/ui/DataTable";
import { DetailRow } from "@/components/ui/DetailRow";
import { designTokens } from "@/theme/theme";
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
        cellClassName: "cell-num",
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
            return `${row.oldValue ? etiquetaEstado(row.oldValue) : "—"} → ${row.newValue ? etiquetaEstado(row.newValue) : "—"}`;
          }
          return row.extraInfo ?? "—";
        },
      },
      { field: "ipAddress", headerName: "IP", width: 120, valueGetter: (_v, row) => row.ipAddress ?? "—" },
    ],
    []
  );

  return (
    <Stack spacing={{ xs: 2, md: 2.5 }} sx={{ flexShrink: 0, pb: 2 }}>
      <PageHeader
        title="Auditoría"
        subtitle="Consulta de solo lectura sobre el historial de acciones del sistema: logins, altas y cambios de estado de actas, subida de archivos y cambios de usuarios. Toca un evento para ver su detalle."
      />

      <Surface>
        <Box
          component="form"
          onSubmit={(e) => {
            e.preventDefault();
            applyFilters();
          }}
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "repeat(6, minmax(0, 1fr))" },
            gap: 2,
          }}
        >
          <TextField
            label="Usuario"
            fullWidth
            size="small"
            value={filtersDraft.username ?? ""}
            onChange={(e) => setFiltersDraft((f) => ({ ...f, username: e.target.value || undefined }))}
          />
          <Autocomplete
            freeSolo
            options={AUDIT_ENTITY_NAMES}
            value={filtersDraft.entityName ?? ""}
            onInputChange={(_e, value) => setFiltersDraft((f) => ({ ...f, entityName: value || undefined }))}
            renderInput={(params) => <TextField {...params} label="Entidad" size="small" placeholder="ACTA, USER..." />}
          />
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
          <TextField
            label="Desde"
            type="datetime-local"
            fullWidth
            size="small"
            InputLabelProps={{ shrink: true }}
            value={filtersDraft.from ?? ""}
            onChange={(e) => setFiltersDraft((f) => ({ ...f, from: e.target.value || undefined }))}
            sx={{ "& input": { fontVariantNumeric: "tabular-nums" } }}
          />
          <TextField
            label="Hasta"
            type="datetime-local"
            fullWidth
            size="small"
            InputLabelProps={{ shrink: true }}
            value={filtersDraft.to ?? ""}
            onChange={(e) => setFiltersDraft((f) => ({ ...f, to: e.target.value || undefined }))}
            sx={{ "& input": { fontVariantNumeric: "tabular-nums" } }}
          />

          <Stack
            direction="row"
            gap={1.25}
            justifyContent="flex-end"
            sx={{ gridColumn: "1 / -1" }}
          >
            <Button
              color="inherit"
              startIcon={<FilterAltOffOutlinedIcon />}
              onClick={clearFilters}
              disabled={!hasActiveFilters && Object.values(filtersDraft).every((v) => !v)}
            >
              Limpiar filtros
            </Button>
            <Button type="submit" variant="contained">
              Filtrar
            </Button>
          </Stack>
        </Box>
      </Surface>

      <Collapse in={logsQuery.isError}>
        <Callout tone="error" title="No se pudo cargar la auditoría">
          {getApiErrorMessage(logsQuery.error, "Revisa tu conexión e inténtalo de nuevo.")}
        </Callout>
      </Collapse>

      <DataTable
        rows={logsQuery.data?.content ?? []}
        columns={columns}
        loading={logsQuery.isFetching}
        getRowHeight={() => "auto"}
        paginationMode="server"
        rowCount={logsQuery.data?.totalElements ?? 0}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        pageSizeOptions={[15, 30, 50, 100]}
        sortingMode="client"
        clickableRows
        onRowClick={(params) => setDetailRow(params.row)}
        onCellKeyDown={(params, event) => {
          if (event.key === "Enter") setDetailRow(params.row);
        }}
        empty={
          hasActiveFilters
            ? { title: "Ningún evento coincide", hint: "Amplía el rango de fechas o limpia los filtros." }
            : { title: "Sin eventos registrados" }
        }
        sx={{ "& .MuiDataGrid-cell": { py: 1 } }}
      />

      <Dialog open={!!detailRow} onClose={() => setDetailRow(null)} maxWidth="sm" fullWidth>
        {detailRow && (
          <>
            <Stack direction="row" alignItems="center" gap={1.5} sx={{ px: 3, pt: 2.5, pb: 1 }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontWeight: 700, fontSize: "1.125rem", letterSpacing: "-0.015em" }}>
                  Evento #{detailRow.id}
                </Typography>
                <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums" }}>
                  {dayjs(detailRow.createdAt).format("DD/MM/YYYY HH:mm:ss")}
                </Typography>
              </Box>
              <AuditActionChip action={detailRow.action} />
              <IconButton size="small" aria-label="Cerrar detalle" onClick={() => setDetailRow(null)}>
                <CloseRoundedIcon fontSize="small" />
              </IconButton>
            </Stack>
            <DialogContent>
              <Box component="dl" sx={{ m: 0, display: "grid", gap: 1.5 }}>
                <DetailRow label="Usuario" value={detailRow.username} />
                <DetailRow label="Nombre completo" value={detailRow.fullName || null} />
                <DetailRow
                  label="Entidad"
                  value={detailRow.entityId !== null ? `${detailRow.entityName} #${detailRow.entityId}` : detailRow.entityName}
                />
                <DetailRow label="Campo" value={detailRow.fieldName} />
                <DetailRow label="IP" value={detailRow.ipAddress} numeric />
              </Box>

              {(detailRow.oldValue || detailRow.newValue) && (
                <Box
                  sx={{
                    mt: 2.5,
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "1fr auto 1fr" },
                    gap: 1.25,
                    alignItems: "stretch",
                  }}
                >
                  <ValueBox label="Valor anterior" value={detailRow.oldValue} tone="old" />
                  <Stack alignItems="center" justifyContent="center" sx={{ color: designTokens.textCaption }}>
                    <ArrowForwardRoundedIcon fontSize="small" sx={{ transform: { xs: "rotate(90deg)", sm: "none" } }} />
                  </Stack>
                  <ValueBox label="Valor nuevo" value={detailRow.newValue} tone="new" />
                </Box>
              )}

              {detailRow.extraInfo && (
                <Box sx={{ mt: 2.5 }}>
                  <Typography variant="body2" sx={{ color: designTokens.textCaption, mb: 0.5 }}>
                    Info adicional
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: "text.primary", whiteSpace: "pre-wrap", wordBreak: "break-word", p: 1.5, borderRadius: "12px", bgcolor: "rgba(15, 23, 42, 0.03)" }}
                  >
                    {detailRow.extraInfo}
                  </Typography>
                </Box>
              )}
            </DialogContent>
          </>
        )}
      </Dialog>
    </Stack>
  );
}

/** Caja del antes/despues de un cambio: el anterior en tono neutro, el nuevo tintado. */
function ValueBox({ label, value, tone }: { label: string; value: string | null; tone: "old" | "new" }) {
  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: "12px",
        bgcolor: tone === "new" ? designTokens.accentSoft : "rgba(15, 23, 42, 0.03)",
        minWidth: 0,
      }}
    >
      <Typography variant="caption" component="div">
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          mt: 0.25,
          color: value ? "text.primary" : designTokens.textDisabled,
          fontWeight: 600,
          wordBreak: "break-word",
          textDecoration: tone === "old" && value ? "line-through" : "none",
          textDecorationColor: "rgba(15, 23, 42, 0.3)",
        }}
      >
        {value ? etiquetaEstado(value) : "Vacío"}
      </Typography>
    </Box>
  );
}
