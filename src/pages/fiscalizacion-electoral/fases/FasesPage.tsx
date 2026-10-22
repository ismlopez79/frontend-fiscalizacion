import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Box, Button, Collapse, IconButton, MenuItem, Skeleton, Stack, TextField, Tooltip, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/AddRounded";
import EditIcon from "@mui/icons-material/EditOutlined";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpwardRounded";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownwardRounded";
import { formTemplateApi, phaseApi } from "@/api/fiscalizacionFasesApi";
import { PageHeader } from "@/components/ui/PageHeader";
import { Callout } from "@/components/ui/Callout";
import { surfaceSx } from "@/components/ui/Surface";
import { ToastSnackbar } from "@/components/ToastSnackbar";
import { useToast } from "@/hooks/useToast";
import { useActiveElectoralPeriod } from "@/hooks/useActiveElectoralPeriod";
import { getApiErrorMessage } from "@/utils/apiError";
import { designTokens } from "@/theme/theme";
import type { PhaseDto } from "@/types/fiscalizacionFases";
import { FaseFormDialog } from "./FaseFormDialog";

/**
 * Fases del periodo. Todo periodo nace con las 6 fases cargadas; aqui el
 * admin las renombra, reordena, cambia su plantilla, desactiva o agrega.
 * Es una lista corta y ordenada: se muestra como lista, no como tabla.
 */
export function FasesPage() {
  const queryClient = useQueryClient();
  const { toast, showToast, closeToast } = useToast();
  const { data: periodos, activePeriod } = useActiveElectoralPeriod();
  const [periodId, setPeriodId] = useState<number | "">("");
  const [editing, setEditing] = useState<PhaseDto | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (periodId === "" && activePeriod) setPeriodId(activePeriod.id);
  }, [activePeriod, periodId]);

  const fasesKey = ["fases", periodId, "todas"];
  const fasesQuery = useQuery({
    queryKey: fasesKey,
    queryFn: () => phaseApi.getFasesTodas(Number(periodId)),
    enabled: !!periodId,
  });
  const fases = useMemo(
    () => [...(fasesQuery.data ?? [])].sort((a, b) => a.displayOrder - b.displayOrder || a.id - b.id),
    [fasesQuery.data]
  );

  const templatesQuery = useQuery({
    queryKey: ["plantillas-formulario", "PUBLICADA"],
    queryFn: () => formTemplateApi.getPlantillas("PUBLICADA"),
  });

  const toUpdate = (p: PhaseDto, displayOrder: number) => ({
    name: p.name,
    formTemplateCode: p.formTemplateCode,
    requiresElectionType: p.requiresElectionType,
    displayOrder,
    active: p.active,
  });

  // Mover = intercambiar el orden con la vecina (dos PUT). Si comparten numero, se separan por uno.
  const moveMutation = useMutation({
    mutationFn: async ({ a, b }: { a: PhaseDto; b: PhaseDto }) => {
      const aOrder = b.displayOrder;
      const bOrder = a.displayOrder === b.displayOrder ? a.displayOrder + (a.displayOrder < b.displayOrder ? -1 : 1) : a.displayOrder;
      await phaseApi.actualizarFase(a.id, toUpdate(a, aOrder));
      await phaseApi.actualizarFase(b.id, toUpdate(b, bOrder));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["fases"] }),
    onError: (error) => showToast("error", getApiErrorMessage(error, "No se pudo cambiar el orden.")),
  });

  const move = (index: number, delta: -1 | 1) => {
    const a = fases[index];
    const b = fases[index + delta];
    if (a && b) moveMutation.mutate({ a, b });
  };

  const nextOrder = (fases[fases.length - 1]?.displayOrder ?? 0) + 10;

  return (
    <Stack spacing={{ xs: 2, md: 2.5 }} sx={{ flexShrink: 0, pb: 2, maxWidth: 960 }}>
      <PageHeader
        title="Fases del período"
        subtitle="Cada fase define qué formato de informe usan sus actividades. Apunta a la plantilla por código, así que siempre usa su versión publicada vigente."
        actions={
          <Stack direction="row" gap={1.25} alignItems="center" flexWrap="wrap">
            <TextField
              select
              size="small"
              aria-label="Período electoral"
              value={periodId}
              onChange={(e) => setPeriodId(Number(e.target.value))}
              SelectProps={{ displayEmpty: true }}
              sx={{ minWidth: 220 }}
            >
              <MenuItem value="" disabled>
                Período
              </MenuItem>
              {(periodos ?? []).map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name}
                  {p.active ? " · activo" : ""}
                </MenuItem>
              ))}
            </TextField>
            <Button variant="contained" startIcon={<AddIcon />} disabled={!periodId} onClick={() => setCreating(true)}>
              Agregar fase
            </Button>
          </Stack>
        }
      />

      <Collapse in={fasesQuery.isError} unmountOnExit>
        <Callout tone="error" title="No se pudieron cargar las fases">
          {getApiErrorMessage(fasesQuery.error, "Revisa tu conexión e inténtalo de nuevo.")}
        </Callout>
      </Collapse>

      {!periodId && (periodos ?? []).length === 0 && <Callout tone="info">Primero crea un período electoral: las fases nacen con él.</Callout>}

      {periodId !== "" && (
        <Box sx={{ ...surfaceSx, p: { xs: 1, md: 1.25 } }}>
          {fasesQuery.isLoading ? (
            <Stack spacing={1} sx={{ p: 1.5 }}>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} height={52} />
              ))}
            </Stack>
          ) : fases.length === 0 ? (
            <Typography variant="body2" sx={{ p: 2.5 }}>
              Este período no tiene fases.
            </Typography>
          ) : (
            <Box component="ol" sx={{ m: 0, p: 0, listStyle: "none" }}>
              {fases.map((f, i) => (
                <Stack
                  key={f.id}
                  component="li"
                  direction="row"
                  alignItems="center"
                  gap={{ xs: 1.25, md: 2 }}
                  sx={{
                    px: { xs: 1.25, md: 1.75 },
                    py: 1.5,
                    borderRadius: "14px",
                    opacity: f.active ? 1 : 0.62,
                    transition: "background-color 150ms ease",
                    "@media (hover: hover) and (pointer: fine)": { "&:hover": { bgcolor: "rgba(15, 23, 42, 0.025)" } },
                    "& + &": { boxShadow: "0 -1px 0 rgba(15, 23, 42, 0.06)" },
                  }}
                >
                  <Typography
                    aria-hidden
                    sx={{ width: 28, textAlign: "center", fontWeight: 800, fontSize: "0.9375rem", color: designTokens.textDisabled, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}
                  >
                    {i + 1}
                  </Typography>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
                      <Typography variant="body2" sx={{ color: "text.primary", fontWeight: 700, fontSize: "0.875rem" }}>
                        {f.name}
                      </Typography>
                      {!f.active && <Tag>Inactiva</Tag>}
                      {f.requiresElectionType && <Tag tone="accent">Pide tipo de elección</Tag>}
                    </Stack>
                    <Typography variant="caption" component="div" noWrap sx={{ mt: 0.25 }}>
                      <Box component="span" sx={{ fontVariantNumeric: "tabular-nums" }}>
                        {f.code}
                      </Box>
                      {" · "}
                      {f.formTemplateName ?? f.formTemplateCode}
                      {f.formTemplateVersion ? ` v${f.formTemplateVersion}` : " · sin versión publicada"}
                    </Typography>
                  </Box>
                  <Stack direction="row" gap={0.25} sx={{ flexShrink: 0 }}>
                    <Tooltip title="Subir">
                      <span>
                        <IconButton size="small" aria-label={`Subir ${f.name}`} disabled={i === 0 || moveMutation.isPending} onClick={() => move(i, -1)}>
                          <ArrowUpwardIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Bajar">
                      <span>
                        <IconButton
                          size="small"
                          aria-label={`Bajar ${f.name}`}
                          disabled={i === fases.length - 1 || moveMutation.isPending}
                          onClick={() => move(i, 1)}
                        >
                          <ArrowDownwardIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Ajustar">
                      <IconButton size="small" aria-label={`Ajustar ${f.name}`} onClick={() => setEditing(f)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Stack>
              ))}
            </Box>
          )}
        </Box>
      )}

      {periodId !== "" && (
        <FaseFormDialog
          open={creating || !!editing}
          periodId={Number(periodId)}
          phase={editing}
          templates={templatesQuery.data ?? []}
          nextOrder={nextOrder}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={(_, created) => {
            setCreating(false);
            setEditing(null);
            queryClient.invalidateQueries({ queryKey: ["fases"] });
            showToast("success", created ? "Fase agregada." : "Fase actualizada.");
          }}
        />
      )}

      <ToastSnackbar toast={toast} onClose={closeToast} />
    </Stack>
  );
}

function Tag({ children, tone }: { children: string; tone?: "accent" }) {
  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        height: 20,
        px: 0.875,
        borderRadius: 999,
        fontSize: "0.6875rem",
        fontWeight: 700,
        color: tone === "accent" ? designTokens.accentHover : "#475569",
        bgcolor: tone === "accent" ? designTokens.accentSoft : "#F1F5F9",
      }}
    >
      {children}
    </Box>
  );
}
