import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { Box, Button, CircularProgress, Collapse, Skeleton, Stack, TextField, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBackRounded";
import PublishOutlinedIcon from "@mui/icons-material/PublishOutlined";
import ContentCopyIcon from "@mui/icons-material/ContentCopyOutlined";
import ArchiveOutlinedIcon from "@mui/icons-material/ArchiveOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import { formTemplateApi } from "@/api/fiscalizacionFasesApi";
import { catalogApi } from "@/api/catalogApi";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeader, Surface } from "@/components/ui/Surface";
import { Callout } from "@/components/ui/Callout";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { AddRowButton } from "@/components/ui/AddRowButton";
import { ConfirmacionAccion } from "@/components/ConfirmacionAccion";
import { ToastSnackbar } from "@/components/ToastSnackbar";
import { useToast } from "@/hooks/useToast";
import { getApiErrorMessage } from "@/utils/apiError";
import { formatDateTime } from "@/utils/dateFormat";
import { designTokens } from "@/theme/theme";
import type { AnswerValue, Answers, FormTemplateDto, TemplateBuilderCatalog, TemplateOption } from "@/types/fiscalizacionFases";
import { COMPONENT_TYPES, COMPONENT_TYPE_LABELS, LAYOUT_LABELS } from "@/types/fiscalizacionFases";
import type { TemplateLayout } from "@/types/fiscalizacionFases";
import { TemplateRenderer } from "../components/TemplateRenderer";
import { TemplateStatusChip, feRoutes } from "../fiscalizacionFasesUi";
import { SectionEditor } from "./SectionEditor";
import type { EditorDraft, EditorErrors, EditorSection } from "./templateEditorModel";
import { emptyDraft, fromTemplate, moveInArray, newSection, sanitizeCode, toCode, toPreview, toRequest, validateDraft } from "./templateEditorModel";

type View = "edit" | "preview";
type Confirm = "publicar" | "archivar" | "eliminar" | "nueva-version" | null;

const FALLBACK_CATALOG: TemplateBuilderCatalog = {
  componentTypes: COMPONENT_TYPES.map((code) => ({ code, label: COMPONENT_TYPE_LABELS[code] })),
  layouts: (Object.keys(LAYOUT_LABELS) as TemplateLayout[]).map((code) => ({ code, label: LAYOUT_LABELS[code] })),
  optionPresets: [],
};

/**
 * Constructor de plantillas. Un BORRADOR se edita aqui (una sola columna:
 * datos generales, luego cada seccion con sus filas); "Vista previa" pinta
 * la plantilla con el MISMO renderizador que usara el delegado, y se puede
 * probar llenandola. Publicada o archivada ya no se edita: se ve en vista
 * previa y se crea una nueva version.
 */
export function PlantillaEditorPage() {
  const { id } = useParams();
  const isNew = !id || id === "nueva";
  const templateId = isNew ? null : Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast, showToast, closeToast } = useToast();

  const templateQuery = useQuery({
    queryKey: ["plantillas-formulario", templateId],
    queryFn: () => formTemplateApi.getPlantilla(templateId!),
    enabled: templateId !== null,
    refetchOnWindowFocus: false,
  });
  const template = templateQuery.data ?? null;

  const catalogQuery = useQuery({
    queryKey: ["plantillas-formulario", "catalogo-constructor"],
    queryFn: formTemplateApi.getCatalogoConstructor,
    staleTime: 30 * 60_000,
  });
  const catalog = catalogQuery.data ?? FALLBACK_CATALOG;
  const presets = useMemo(
    () => new Map<string, TemplateOption[]>(catalog.optionPresets.map((p) => [p.code, p.options])),
    [catalog]
  );

  const partiesQuery = useQuery({ queryKey: ["partidos-politicos"], queryFn: catalogApi.getPartidosPoliticos, staleTime: 5 * 60_000 });

  const [draft, setDraft] = useState<EditorDraft>(() => emptyDraft());
  const [dirty, setDirty] = useState(false);
  const [errors, setErrors] = useState<EditorErrors>({});
  const [serverErrors, setServerErrors] = useState<string[]>([]);
  const [view, setView] = useState<View>("edit");
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [previewAnswers, setPreviewAnswers] = useState<Answers>({});

  useEffect(() => {
    if (!template) return;
    setDraft(fromTemplate(template));
    setDirty(false);
    setErrors({});
    setServerErrors([]);
    setView(template.status === "BORRADOR" ? "edit" : "preview");
  }, [template]);

  const editable = isNew || template?.status === "BORRADOR";

  const change = useCallback((fn: (d: EditorDraft) => EditorDraft) => {
    setDraft(fn);
    setDirty(true);
  }, []);

  // Callbacks estables para que cada SectionEditor memoizado solo se redibuje cuando cambia lo suyo.
  const updateSection = useCallback(
    (index: number, fn: (s: EditorSection) => EditorSection) =>
      change((d) => ({ ...d, sections: d.sections.map((s, i) => (i === index ? fn(s) : s)) })),
    [change]
  );
  const moveSection = useCallback(
    (index: number, delta: -1 | 1) => change((d) => ({ ...d, sections: moveInArray(d.sections, index, index + delta) })),
    [change]
  );
  const removeSection = useCallback(
    (index: number) => change((d) => ({ ...d, sections: d.sections.filter((_, i) => i !== index) })),
    [change]
  );

  const setPreviewAnswer = useCallback((key: string, value: AnswerValue) => setPreviewAnswers((a) => ({ ...a, [key]: value })), []);

  // Errores visibles se recalculan en vivo una vez que se intento guardar.
  useEffect(() => {
    if (Object.keys(errors).length > 0) setErrors(validateDraft(draft, isNew));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  const onServerError = (error: unknown, fallback: string) => {
    const details = error instanceof AxiosError ? (error.response?.data as { details?: string[] } | undefined)?.details : undefined;
    setServerErrors(details && details.length > 0 ? details : []);
    showToast("error", getApiErrorMessage(error, fallback));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = toRequest(draft);
      return templateId === null ? formTemplateApi.crear(body) : formTemplateApi.actualizar(templateId, body);
    },
    onSuccess: (saved) => {
      setServerErrors([]);
      queryClient.setQueryData(["plantillas-formulario", saved.id], saved);
      queryClient.invalidateQueries({ queryKey: ["plantillas-formulario"], exact: false, refetchType: "none" });
      setDirty(false);
      if (isNew) {
        navigate(feRoutes.plantilla(saved.id), { replace: true });
        showToast("success", "Plantilla creada como borrador v1.");
      } else {
        showToast("success", "Cambios guardados.");
      }
    },
    onError: (error) => onServerError(error, "No se pudo guardar la plantilla."),
  });

  const validateOrStop = (): boolean => {
    const found = validateDraft(draft, isNew);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setView("edit");
      showToast("error", `Hay ${Object.keys(found).length} ${Object.keys(found).length === 1 ? "dato por corregir" : "datos por corregir"} (marcados en rojo).`);
      return false;
    }
    return true;
  };

  const handleSave = () => {
    if (validateOrStop()) saveMutation.mutate();
  };

  const lifecycleMutation = useMutation({
    mutationFn: async (action: Exclude<Confirm, null>): Promise<FormTemplateDto | null> => {
      if (templateId === null) return null;
      switch (action) {
        case "publicar":
          if (dirty) await formTemplateApi.actualizar(templateId, toRequest(draft));
          return formTemplateApi.publicar(templateId);
        case "archivar":
          return formTemplateApi.archivar(templateId);
        case "nueva-version":
          return formTemplateApi.nuevaVersion(templateId);
        case "eliminar":
          await formTemplateApi.eliminar(templateId);
          return null;
      }
    },
    onSuccess: (result, action) => {
      queryClient.invalidateQueries({ queryKey: ["plantillas-formulario"] });
      queryClient.invalidateQueries({ queryKey: ["fases"] });
      if (action === "eliminar") {
        showToast("success", "Borrador eliminado.");
        navigate(feRoutes.plantillas, { replace: true });
        return;
      }
      if (!result) return;
      queryClient.setQueryData(["plantillas-formulario", result.id], result);
      if (action === "nueva-version") {
        navigate(feRoutes.plantilla(result.id));
        showToast("success", `Borrador v${result.version} listo para editar.`);
      } else {
        setDirty(false);
        showToast("success", action === "publicar" ? `Publicada v${result.version}: las fases que la usan ya la toman.` : "Plantilla archivada.");
      }
    },
    onError: (error) => onServerError(error, "No se pudo completar la acción."),
  });

  const backButton = (
    <Button size="small" color="inherit" startIcon={<ArrowBackIcon />} onClick={() => navigate(feRoutes.plantillas)}>
      Plantillas
    </Button>
  );

  if (templateId !== null && templateQuery.isLoading) {
    return (
      <Stack spacing={2.5} sx={{ flexShrink: 0, maxWidth: 960 }} aria-busy="true">
        <Box>
          <Box sx={{ ml: -1, mb: 1 }}>{backButton}</Box>
          <Skeleton width={320} height={40} />
        </Box>
        <Surface>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={48} />
          ))}
        </Surface>
      </Stack>
    );
  }

  if (templateId !== null && (templateQuery.isError || !template)) {
    return (
      <Stack spacing={2} sx={{ flexShrink: 0 }}>
        <Box sx={{ ml: -1 }}>{backButton}</Box>
        <Callout tone="error" title="No se pudo cargar la plantilla">
          {getApiErrorMessage(templateQuery.error, "Puede que ya no exista.")}
        </Callout>
      </Stack>
    );
  }

  const errorCount = Object.keys(errors).length;
  const preview = toPreview(draft);
  const busy = saveMutation.isPending || lifecycleMutation.isPending;

  return (
    <Stack spacing={{ xs: 2, md: 2.5 }} sx={{ flexShrink: 0, pb: 2, maxWidth: 960 }}>
      <PageHeader
        back={backButton}
        title={draft.name || (isNew ? "Nueva plantilla" : "Plantilla sin nombre")}
        titleAdornment={
          template && (
            <Stack direction="row" alignItems="center" gap={1}>
              <TemplateStatusChip status={template.status} />
              <Typography variant="caption" sx={{ fontVariantNumeric: "tabular-nums" }}>
                v{template.version}
              </Typography>
            </Stack>
          )
        }
        subtitle={
          template
            ? [template.code, template.formatCode, template.updatedAt ? `Actualizada ${formatDateTime(template.updatedAt)}` : null].filter(Boolean).join(" · ")
            : "Se crea como borrador v1. Publícala cuando esté lista para que las fases la usen."
        }
        actions={
          <>
            {template?.status === "BORRADOR" && (
              <Button color="error" startIcon={<DeleteOutlineIcon />} onClick={() => setConfirm("eliminar")} disabled={busy}>
                Eliminar
              </Button>
            )}
            {template?.status === "PUBLICADA" && (
              <>
                <Button color="inherit" startIcon={<ArchiveOutlinedIcon />} onClick={() => setConfirm("archivar")} disabled={busy}>
                  Archivar
                </Button>
                <Button variant="contained" startIcon={<ContentCopyIcon />} onClick={() => setConfirm("nueva-version")} disabled={busy}>
                  Nueva versión
                </Button>
              </>
            )}
            {editable && (
              <Button
                variant={isNew ? "contained" : "outlined"}
                startIcon={saveMutation.isPending ? <CircularProgress size={16} color="inherit" /> : <SaveOutlinedIcon />}
                onClick={handleSave}
                disabled={busy || (!isNew && !dirty)}
              >
                {saveMutation.isPending ? "Guardando…" : isNew ? "Crear borrador" : dirty ? "Guardar cambios" : "Guardado"}
              </Button>
            )}
            {template?.status === "BORRADOR" && (
              <Button
                variant="contained"
                startIcon={<PublishOutlinedIcon />}
                onClick={() => validateOrStop() && setConfirm("publicar")}
                disabled={busy}
              >
                Publicar
              </Button>
            )}
          </>
        }
      />

      {template && template.status !== "BORRADOR" && (
        <Callout tone="info" title={template.status === "PUBLICADA" ? "Publicada: ya no se edita" : "Archivada"}>
          {template.status === "PUBLICADA"
            ? "Para cambiarla, crea una nueva versión, edita ese borrador y publícalo. Los informes ya llenos conservan la versión con la que se hicieron."
            : "Este formato fue retirado. Sus informes anteriores siguen intactos."}
        </Callout>
      )}

      <Collapse in={serverErrors.length > 0} unmountOnExit>
        <Callout tone="error" title="El servidor rechazó la plantilla">
          <Box component="ul" sx={{ m: 0, pl: 2.25 }}>
            {serverErrors.slice(0, 10).map((d) => (
              <li key={d}>{d}</li>
            ))}
          </Box>
        </Callout>
      </Collapse>

      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1.5}>
        <SegmentedControl<View>
          ariaLabel="Modo"
          options={[
            { value: "edit", label: editable ? "Editar" : "Estructura" },
            { value: "preview", label: "Vista previa" },
          ]}
          value={view}
          onChange={setView}
        />
        {view === "edit" && errorCount > 0 && (
          <Typography variant="caption" sx={{ color: designTokens.status.error.fg, fontVariantNumeric: "tabular-nums" }}>
            {errorCount} {errorCount === 1 ? "dato por corregir" : "datos por corregir"}
          </Typography>
        )}
        {view === "preview" && (
          <Typography variant="caption">Así la verá el delegado. Puedes probar llenarla: nada se guarda.</Typography>
        )}
      </Stack>

      {view === "preview" ? (
        preview.sections.length === 0 ? (
          <Surface>
            <Typography variant="body2">La plantilla todavía no tiene secciones.</Typography>
          </Surface>
        ) : (
          <TemplateRenderer
            template={preview}
            answers={previewAnswers}
            onChange={setPreviewAnswer}
            parties={partiesQuery.data ?? []}
            presets={presets}
          />
        )
      ) : (
        <fieldset disabled={!editable} style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}>
          <Stack spacing={{ xs: 2, md: 2.5 }}>
            <Surface>
              <SectionHeader title="Datos generales" subtitle="La fecha, el lugar, el distrito y los delegados no van aquí: salen de la actividad." />
              <Stack spacing={2}>
                <TextField
                  label="Nombre"
                  placeholder="Fiscalización de Capacitaciones JED"
                  value={draft.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    change((d) => ({ ...d, name, code: isNew && (!d.code || d.code === toCode(d.name)) ? toCode(name) : d.code }));
                  }}
                  error={!!errors.name}
                  helperText={errors.name}
                  inputProps={{ maxLength: 200 }}
                  fullWidth
                />
                <Stack direction={{ xs: "column", sm: "row" }} gap={2}>
                  <TextField
                    label="Código"
                    value={draft.code}
                    onChange={(e) => change((d) => ({ ...d, code: sanitizeCode(e.target.value) }))}
                    disabled={!isNew}
                    error={!!errors.code}
                    helperText={errors.code ?? (isNew ? "Las fases apuntan a la plantilla por este código." : "No cambia entre versiones.")}
                    inputProps={{ maxLength: 60 }}
                    sx={{ flex: 1, "& input": { fontVariantNumeric: "tabular-nums" } }}
                  />
                  <TextField
                    label="Código de formato (opcional)"
                    placeholder="104.04 - V.01"
                    value={draft.formatCode}
                    onChange={(e) => change((d) => ({ ...d, formatCode: e.target.value }))}
                    inputProps={{ maxLength: 60 }}
                    sx={{ flex: 1 }}
                  />
                </Stack>
                <TextField
                  label="Descripción (opcional)"
                  value={draft.description}
                  onChange={(e) => change((d) => ({ ...d, description: e.target.value }))}
                  multiline
                  minRows={2}
                  inputProps={{ maxLength: 1000 }}
                  fullWidth
                />
              </Stack>
            </Surface>

            {errors.sections && <Callout tone="error">{errors.sections}</Callout>}

            {draft.sections.map((s, i) => (
              <SectionEditor
                key={s._key}
                section={s}
                index={i}
                total={draft.sections.length}
                errors={errors}
                catalog={catalog}
                onUpdate={updateSection}
                onMove={moveSection}
                onRemove={removeSection}
              />
            ))}

            {editable && (
              <Stack direction={{ xs: "column", sm: "row" }} gap={1.25}>
                <AddRowButton onClick={() => change((d) => ({ ...d, sections: [...d.sections, newSection("FICHA")] }))}>
                  Sección tipo ficha
                </AddRowButton>
                <AddRowButton onClick={() => change((d) => ({ ...d, sections: [...d.sections, newSection("TABLA")] }))}>
                  Sección tipo tabla
                </AddRowButton>
              </Stack>
            )}
          </Stack>
        </fieldset>
      )}

      <ConfirmacionAccion
        open={confirm === "publicar"}
        titulo={`Publicar v${template?.version ?? 1}`}
        descripcion={`${dirty ? "Se guardarán tus cambios y se" : "Se"} publicará esta versión. La versión publicada anterior pasa a archivada, y las fases con el código ${draft.code} empiezan a usar esta en sus informes nuevos. Ya no se podrá editar.`}
        confirmLabel="Publicar"
        loading={lifecycleMutation.isPending}
        onConfirm={() => {
          setConfirm(null);
          lifecycleMutation.mutate("publicar");
        }}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmacionAccion
        open={confirm === "nueva-version"}
        titulo="Crear nueva versión"
        descripcion="Se crea un borrador a partir de esta versión. La publicada se sigue usando hasta que publiques el borrador."
        confirmLabel="Crear borrador"
        loading={lifecycleMutation.isPending}
        onConfirm={() => {
          setConfirm(null);
          lifecycleMutation.mutate("nueva-version");
        }}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmacionAccion
        open={confirm === "archivar"}
        titulo="Archivar plantilla"
        descripcion="El formato se retira. Si una fase todavía lo usa, sus actividades nuevas no tendrán plantilla publicada: cambia la plantilla de esa fase primero."
        variant="destructive"
        confirmLabel="Archivar"
        loading={lifecycleMutation.isPending}
        onConfirm={() => {
          setConfirm(null);
          lifecycleMutation.mutate("archivar");
        }}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmacionAccion
        open={confirm === "eliminar"}
        titulo="Eliminar borrador"
        descripcion="El borrador se borra por completo. Las versiones publicadas o archivadas no se tocan."
        variant="destructive"
        confirmLabel="Eliminar"
        loading={lifecycleMutation.isPending}
        onConfirm={() => {
          setConfirm(null);
          lifecycleMutation.mutate("eliminar");
        }}
        onCancel={() => setConfirm(null)}
      />

      <ToastSnackbar toast={toast} onClose={closeToast} />
    </Stack>
  );
}
