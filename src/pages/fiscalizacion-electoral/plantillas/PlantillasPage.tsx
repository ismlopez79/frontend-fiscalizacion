import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Box, Button, Collapse, Stack, Typography } from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/AddRounded";
import ViewQuiltOutlinedIcon from "@mui/icons-material/ViewQuiltOutlined";
import { formTemplateApi } from "@/api/fiscalizacionFasesApi";
import { PageHeader } from "@/components/ui/PageHeader";
import { Callout } from "@/components/ui/Callout";
import { DataTable } from "@/components/ui/DataTable";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { getApiErrorMessage } from "@/utils/apiError";
import { formatDateTime } from "@/utils/dateFormat";
import type { FormTemplateSummary, TemplateStatus } from "@/types/fiscalizacionFases";
import { TemplateStatusChip, feRoutes } from "../fiscalizacionFasesUi";

type Filter = TemplateStatus | "TODAS";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "TODAS", label: "Todas" },
  { value: "PUBLICADA", label: "Publicadas" },
  { value: "BORRADOR", label: "Borradores" },
  { value: "ARCHIVADA", label: "Archivadas" },
];

/** Formatos de informe. Un formato nuevo no requiere programar: se arma en el constructor. */
export function PlantillasPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>("TODAS");

  const query = useQuery({
    queryKey: ["plantillas-formulario", filter],
    queryFn: () => formTemplateApi.getPlantillas(filter === "TODAS" ? undefined : filter),
  });

  const rows = useMemo(
    () => [...(query.data ?? [])].sort((a, b) => a.code.localeCompare(b.code) || b.version - a.version),
    [query.data]
  );

  const columns: GridColDef<FormTemplateSummary>[] = useMemo(
    () => [
      {
        field: "name",
        headerName: "Plantilla",
        flex: 1.5,
        minWidth: 260,
        renderCell: (p) => (
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" noWrap sx={{ color: "text.primary", fontWeight: 600 }}>
              {p.row.name}
            </Typography>
            <Typography variant="caption" component="div" noWrap sx={{ fontVariantNumeric: "tabular-nums" }}>
              {p.row.code}
            </Typography>
          </Box>
        ),
      },
      { field: "formatCode", headerName: "Formato", width: 150, cellClassName: "cell-code", valueGetter: (v) => v ?? "—" },
      {
        field: "version",
        headerName: "Versión",
        width: 96,
        cellClassName: "cell-num",
        renderCell: (p) => `v${p.row.version}`,
      },
      { field: "status", headerName: "Estado", width: 130, renderCell: (p) => <TemplateStatusChip status={p.row.status} /> },
      {
        field: "updatedAt",
        headerName: "Actualizada",
        width: 170,
        cellClassName: "cell-num",
        renderCell: (p) => (p.row.updatedAt ? formatDateTime(p.row.updatedAt) : "—"),
      },
    ],
    []
  );

  return (
    <Stack spacing={{ xs: 2, md: 2.5 }} sx={{ flexShrink: 0, pb: 2 }}>
      <PageHeader
        title="Plantillas de informe"
        subtitle="Cada fase usa la versión publicada de su plantilla. Para cambiar una publicada se crea una nueva versión; los informes ya llenos conservan la suya."
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate(feRoutes.plantillaNueva)}>
            Nueva plantilla
          </Button>
        }
      />

      <Box>
        <SegmentedControl<Filter> ariaLabel="Estado de la plantilla" options={FILTERS} value={filter} onChange={setFilter} />
      </Box>

      <Collapse in={query.isError} unmountOnExit>
        <Callout tone="error" title="No se pudieron cargar las plantillas">
          {getApiErrorMessage(query.error, "Revisa tu conexión e inténtalo de nuevo.")}
        </Callout>
      </Collapse>

      <DataTable
        rows={rows}
        columns={columns}
        loading={query.isLoading}
        rowHeight={64}
        initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
        pageSizeOptions={[25, 50]}
        clickableRows
        onRowClick={(p) => navigate(feRoutes.plantilla(p.row.id))}
        onCellKeyDown={(p, e) => {
          if (e.key === "Enter") navigate(feRoutes.plantilla(p.row.id));
        }}
        empty={{
          icon: <ViewQuiltOutlinedIcon />,
          title: filter === "TODAS" ? "Aún no hay plantillas" : "Ninguna plantilla en ese estado",
          hint: "Arma un formato con secciones tipo ficha o tabla, pruébalo en la vista previa y publícalo.",
        }}
      />
    </Stack>
  );
}
