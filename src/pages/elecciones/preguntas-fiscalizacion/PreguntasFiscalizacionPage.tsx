import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Box, Button, Chip, Collapse, IconButton, Paper, Stack, Tooltip, Typography } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import type { GridColDef } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/AddRounded";
import EditIcon from "@mui/icons-material/EditOutlined";
import ToggleOnIcon from "@mui/icons-material/ToggleOnOutlined";
import ToggleOffIcon from "@mui/icons-material/ToggleOffOutlined";
import { fiscalizationQuestionApi } from "@/api/electoralApi";
import { getApiErrorMessage } from "@/utils/apiError";
import { FISCALIZATION_ANSWER_TYPE_LABELS } from "@/types/electoral";
import type { FiscalizationQuestionDto } from "@/types/electoral";
import { PreguntaFiscalizacionFormDialog } from "./PreguntaFiscalizacionFormDialog";
import { useToast } from "@/hooks/useToast";
import { ToastSnackbar } from "@/components/ToastSnackbar";

type DialogState = { type: "closed" } | { type: "create" } | { type: "edit"; item: FiscalizationQuestionDto };

/**
 * Catalogo del checklist del formulario de fiscalizacion — mismo patron que
 * categorias de produccion / tipos de incidente, ver comentario en
 * electoralApi.fiscalizationQuestionApi.
 */
export function PreguntasFiscalizacionPage() {
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<DialogState>({ type: "closed" });
  const { toast, showToast, closeToast } = useToast();

  const preguntasQuery = useQuery({
    queryKey: ["preguntas-fiscalizacion"],
    queryFn: fiscalizationQuestionApi.getPreguntas,
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (target: FiscalizationQuestionDto) =>
      fiscalizationQuestionApi.updatePregunta(target.id, {
        code: target.code,
        text: target.text,
        answerType: target.answerType,
        displayOrder: target.displayOrder,
        active: !target.active,
      }),
    onSuccess: (_data, target) => {
      queryClient.invalidateQueries({ queryKey: ["preguntas-fiscalizacion"] });
      showToast("success", target.active ? "Pregunta desactivada." : "Pregunta activada.");
    },
    onError: (error) => showToast("error", getApiErrorMessage(error, "No se pudo cambiar el estado.")),
  });

  const columns: GridColDef<FiscalizationQuestionDto>[] = useMemo(
    () => [
      { field: "displayOrder", headerName: "Orden", width: 90 },
      { field: "code", headerName: "Código", width: 180 },
      { field: "text", headerName: "Pregunta", flex: 1.6, minWidth: 260 },
      {
        field: "answerType",
        headerName: "Tipo de respuesta",
        width: 170,
        valueGetter: (_v, row) => FISCALIZATION_ANSWER_TYPE_LABELS[row.answerType],
      },
      {
        field: "active",
        headerName: "Estado",
        width: 120,
        renderCell: (params) => (
          <Chip
            size="small"
            label={params.row.active ? "Activa" : "Inactiva"}
            color={params.row.active ? "success" : "default"}
            variant={params.row.active ? "filled" : "outlined"}
          />
        ),
      },
      {
        field: "actions",
        headerName: "Acciones",
        width: 110,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <Stack direction="row" spacing={0.5}>
            <Tooltip title="Editar">
              <IconButton size="small" onClick={() => setDialog({ type: "edit", item: params.row })}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={params.row.active ? "Desactivar" : "Activar"}>
              <IconButton
                size="small"
                disabled={toggleActiveMutation.isPending}
                onClick={() => toggleActiveMutation.mutate(params.row)}
              >
                {params.row.active ? (
                  <ToggleOnIcon fontSize="small" color="success" />
                ) : (
                  <ToggleOffIcon fontSize="small" />
                )}
              </IconButton>
            </Tooltip>
          </Stack>
        ),
      },
    ],
    [toggleActiveMutation]
  );

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" rowGap={1}>
        <Box>
          <Typography variant="h3">Preguntas del formulario de fiscalización</Typography>
          <Typography variant="body2" color="text.secondary">
            Checklist que responden los delegados temporales al fiscalizar un centro. Desactivar
            una pregunta deja de ofrecerla en formularios nuevos, sin afectar los ya llenados.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialog({ type: "create" })}>
          Nueva pregunta
        </Button>
      </Stack>

      <Collapse in={preguntasQuery.isError}>
        <Alert severity="error">
          {getApiErrorMessage(preguntasQuery.error, "No se pudo cargar el catálogo de preguntas.")}
        </Alert>
      </Collapse>

      {!preguntasQuery.isError && (preguntasQuery.data ?? []).length === 0 && !preguntasQuery.isLoading && (
        <Alert severity="warning">
          Todavía no hay preguntas cargadas — el formulario de fiscalización se verá vacío hasta
          que agregues al menos una.
        </Alert>
      )}

      <Paper variant="outlined" sx={{ height: 520 }}>
        <DataGrid
          rows={preguntasQuery.data ?? []}
          columns={columns}
          loading={preguntasQuery.isLoading}
          disableRowSelectionOnClick
          density="comfortable"
          initialState={{
            pagination: { paginationModel: { pageSize: 10 } },
            sorting: { sortModel: [{ field: "displayOrder", sort: "asc" }] },
          }}
          pageSizeOptions={[10, 25, 50]}
          sx={{ border: "none" }}
        />
      </Paper>

      <PreguntaFiscalizacionFormDialog
        open={dialog.type === "create" || dialog.type === "edit"}
        pregunta={dialog.type === "edit" ? dialog.item : null}
        onClose={() => setDialog({ type: "closed" })}
      />

      <ToastSnackbar toast={toast} onClose={closeToast} />
    </Stack>
  );
}
