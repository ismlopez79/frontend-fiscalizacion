import type { ReactNode } from "react";
import { Box, Stack, Tooltip, Typography } from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import { EstadoActaChip } from "@/components/EstadoActaChip";
import { designTokens } from "@/theme/theme";
import type { ActaAcompananteDto, ActaResponse } from "@/types/acta";
import { formatDate as formatActaDate } from "@/utils/dateFormat";

export const actaNumberFormatter = new Intl.NumberFormat("es-SV");

export { formatActaDate };
export { formatDateTime as formatActaDateTime, formatTime } from "@/utils/dateFormat";

/**
 * Alertas de un acta como iconos compactos con tooltip (en vez de chips con
 * texto que ensanchan la columna). Icono + color + tooltip: el color nunca
 * es el unico medio.
 */
export function ActaFlags({ acta }: { acta: Pick<ActaResponse, "hasDiscrepancy" | "possibleDuplicate"> }) {
  if (!acta.hasDiscrepancy && !acta.possibleDuplicate) {
    return (
      <Typography variant="body2" sx={{ color: designTokens.textDisabled }}>
        —
      </Typography>
    );
  }
  return (
    <Stack direction="row" gap={0.75} alignItems="center">
      {acta.hasDiscrepancy && (
        <FlagDot
          tooltip="Discrepancia: el total declarado no coincide con el calculado"
          color={designTokens.status.warning.fg}
          bg={designTokens.status.warning.bg}
          icon={<WarningAmberRoundedIcon sx={{ fontSize: 14 }} />}
          label="Discrepancia"
        />
      )}
      {acta.possibleDuplicate && (
        <FlagDot
          tooltip="Posible duplicado de otra acta"
          color={designTokens.status.error.fg}
          bg={designTokens.status.error.bg}
          icon={<ContentCopyRoundedIcon sx={{ fontSize: 13 }} />}
          label="Posible duplicado"
        />
      )}
    </Stack>
  );
}

function FlagDot({ tooltip, color, bg, icon, label }: { tooltip: string; color: string; bg: string; icon: ReactNode; label: string }) {
  return (
    <Tooltip title={tooltip}>
      <Box
        component="span"
        role="img"
        aria-label={label}
        sx={{
          width: 24,
          height: 24,
          borderRadius: "50%",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: bg,
          color,
        }}
      >
        {icon}
      </Box>
    </Tooltip>
  );
}

/**
 * Columnas comunes a todo listado de actas (mis actas, bandeja de
 * pendientes): mismo orden, mismo formato, mismo peso visual.
 */
export const actaColumns = {
  number: {
    field: "actaNumber",
    headerName: "N° de acta",
    width: 150,
    renderCell: (params) => (
      <Typography variant="body2" sx={{ fontWeight: 700, color: "text.primary", fontVariantNumeric: "tabular-nums" }}>
        {params.row.actaNumber}
      </Typography>
    ),
  } satisfies GridColDef<ActaResponse>,
  date: {
    field: "actaDate",
    headerName: "Fecha",
    width: 120,
    renderCell: (params) => (
      <Typography variant="body2" sx={{ color: "text.primary", fontVariantNumeric: "tabular-nums" }}>
        {formatActaDate(params.row.actaDate)}
      </Typography>
    ),
  } satisfies GridColDef<ActaResponse>,
  duicentro: {
    field: "duicentroName",
    headerName: "Duicentro",
    flex: 1,
    minWidth: 200,
    renderCell: (params) => (
      <Box sx={{ minWidth: 0, lineHeight: 1.3 }}>
        <Typography variant="body2" noWrap sx={{ color: "text.primary", fontWeight: 500 }}>
          {params.row.duicentroName}
        </Typography>
        <Typography variant="caption" noWrap component="div" sx={{ fontWeight: 500 }}>
          {params.row.departmentName}
        </Typography>
      </Box>
    ),
  } satisfies GridColDef<ActaResponse>,
  status: {
    field: "status",
    headerName: "Estado",
    width: 190,
    renderCell: (params) => <EstadoActaChip estado={params.row.status} />,
  } satisfies GridColDef<ActaResponse>,
  total: {
    field: "calculatedTotal",
    headerName: "Total",
    width: 100,
    align: "right",
    headerAlign: "right",
    renderCell: (params) => (
      <Typography variant="body2" sx={{ fontWeight: 700, color: "text.primary", fontVariantNumeric: "tabular-nums" }}>
        {actaNumberFormatter.format(params.row.calculatedTotal)}
      </Typography>
    ),
  } satisfies GridColDef<ActaResponse>,
  flags: {
    field: "flags",
    headerName: "Alertas",
    width: 90,
    sortable: false,
    renderCell: (params) => <ActaFlags acta={params.row} />,
  } satisfies GridColDef<ActaResponse>,
  createdBy: {
    field: "createdByUsername",
    headerName: "Creada por",
    width: 160,
    // Las actas de delegados temporales se distinguen con una segunda linea
    // (mis actas, "Todas" y la bandeja del supervisor usan esta misma columna).
    renderCell: (params) => (
      <Box sx={{ minWidth: 0, lineHeight: 1.3 }}>
        <Typography variant="body2" noWrap sx={{ color: "text.primary" }}>
          {params.row.createdByUsername}
        </Typography>
        {params.row.createdByType === "TEMPORARY" && (
          <Typography variant="caption" noWrap component="div" sx={{ fontWeight: 600, color: designTokens.status.warning.fg }}>
            Delegado temporal
          </Typography>
        )}
      </Box>
    ),
  } satisfies GridColDef<ActaResponse>,
};

/** sx comun de un DataGrid de actas: celdas centradas verticalmente y fila clicable. */
export const actaGridSx = {
  "& .MuiDataGrid-cell": { display: "flex", alignItems: "center" },
  "& .MuiDataGrid-row": { cursor: "pointer" },
} as const;

export { EmptyState } from "@/components/ui/EmptyState";

/** Delegados temporales acompañantes de un acta: nombre, DUI y partido (los mismos datos que la tabla del PDF). */
export function AcompanantesList({ acompanantes }: { acompanantes: ActaAcompananteDto[] }) {
  return (
    <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
      {acompanantes.map((a) => (
        <Stack
          component="li"
          key={a.temporaryDelegateId}
          direction="row"
          alignItems="baseline"
          justifyContent="space-between"
          flexWrap="wrap"
          columnGap={2}
          sx={{ py: 1, borderTop: "1px solid rgba(15, 23, 42, 0.05)", "&:first-of-type": { borderTop: "none" } }}
        >
          <Typography variant="body2" sx={{ fontWeight: 700, color: "text.primary" }}>
            {a.fullName}
          </Typography>
          <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums" }}>
            DUI {a.dui} · {a.politicalPartyName ?? "Sin partido"}
          </Typography>
        </Stack>
      ))}
    </Box>
  );
}
