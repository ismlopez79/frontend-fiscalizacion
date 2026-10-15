import { Typography } from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import { EstadoActaChip } from "@/components/EstadoActaChip";
import { designTokens } from "@/theme/theme";
import { formatDate } from "@/utils/dateFormat";
import type { FiscalizationFormResponse } from "@/types/fiscalizacionForm";

/**
 * Columnas comunes a los listados de fiscalizacion (mis formularios,
 * bandeja de pendientes) — mismo tratamiento visual que las de actas.
 */
export const fiscalizacionColumns = {
  number: {
    field: "formNumber",
    headerName: "N° de formulario",
    width: 170,
    renderCell: (params) =>
      params.row.formNumber ? (
        <Typography variant="body2" sx={{ fontWeight: 700, color: "text.primary", fontVariantNumeric: "tabular-nums" }}>
          {params.row.formNumber}
        </Typography>
      ) : (
        <Typography variant="body2" sx={{ color: designTokens.textDisabled }}>
          Sin número
        </Typography>
      ),
  } satisfies GridColDef<FiscalizationFormResponse>,
  date: {
    field: "formDate",
    headerName: "Fecha",
    width: 120,
    renderCell: (params) => (
      <Typography variant="body2" sx={{ color: "text.primary", fontVariantNumeric: "tabular-nums" }}>
        {formatDate(params.row.formDate)}
      </Typography>
    ),
  } satisfies GridColDef<FiscalizationFormResponse>,
  centro: {
    field: "serviceCenterName",
    headerName: "Centro de servicio",
    flex: 1,
    minWidth: 200,
    renderCell: (params) => (
      <Typography variant="body2" noWrap sx={{ color: "text.primary", fontWeight: 500 }}>
        {params.row.serviceCenterName}
      </Typography>
    ),
  } satisfies GridColDef<FiscalizationFormResponse>,
  delegate: {
    field: "delegateName",
    headerName: "Delegado",
    width: 180,
  } satisfies GridColDef<FiscalizationFormResponse>,
  status: {
    field: "status",
    headerName: "Estado",
    width: 190,
    renderCell: (params) => <EstadoActaChip estado={params.row.status} />,
  } satisfies GridColDef<FiscalizationFormResponse>,
};

export const ANSWER_TYPE_LABELS: Record<string, string> = {
  SI_NO: "Sí / No",
  SI_NO_PARCIAL: "Sí / No / Parcial",
  TEXTO_LIBRE: "Texto libre",
};
