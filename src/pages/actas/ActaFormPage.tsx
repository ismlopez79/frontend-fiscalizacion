import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Controller, FormProvider, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Collapse,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/AddRounded";
import CloudDoneOutlinedIcon from "@mui/icons-material/CloudDoneOutlined";
import CloudSyncOutlinedIcon from "@mui/icons-material/CloudSyncOutlined";
import CloudOffOutlinedIcon from "@mui/icons-material/CloudOffOutlined";
import { catalogApi } from "@/api/catalogApi";
import { numericDataSx } from "@/theme/theme";
import { getApiErrorMessage } from "@/utils/apiError";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { ToastSnackbar } from "@/components/ToastSnackbar";
import {
  actaFormSchema,
  buildDefaultProductionValues,
  buildDraftSnapshot,
  EMPTY_INCIDENTE,
  EMPTY_PRODUCCION,
  mapDraftSnapshotToFormValues,
} from "./actaFormSchema";
import type { ActaFormValues } from "./actaFormSchema";
import { ProduccionRow } from "./ProduccionRow";
import { IncidenteRow } from "./IncidenteRow";
import { DraftGoneError, useActaDraftAutosave } from "./useActaDraftAutosave";

const CAN_CHOOSE_JVE_ROLES = ["ADMINISTRADOR", "SUPERVISOR"];

const draftDateFormatter = new Intl.DateTimeFormat("es-SV", { day: "2-digit", month: "long", year: "numeric" });

function formatDraftDate(actaDate: string): string {
  if (!actaDate) return "sin fecha";
  const parsed = new Date(`${actaDate}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? actaDate : draftDateFormatter.format(parsed);
}

/** Chip numerado azul + titulo — encabezado de cada seccion del formulario. */
function SectionHeader({ n, title, subtitle }: { n: number; title: string; subtitle?: string }) {
  return (
    <Stack direction="row" spacing={1.5} alignItems="flex-start">
      <Box
        sx={{
          width: 28,
          height: 28,
          borderRadius: "8px",
          bgcolor: "primary.main",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "0.75rem",
          fontWeight: 800,
          flexShrink: 0,
        }}
      >
        {String(n).padStart(2, "0")}
      </Box>
      <Box>
        <Typography variant="h4">{title}</Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </Box>
    </Stack>
  );
}

/**
 * Indicador sutil de estado del autoguardado (feedback de status, no de
 * accion — no debe competir visualmente con el titulo). No se muestra nada
 * hasta que exista un borrador real: antes de elegir departamento+duicentro
 * +fecha no hay nada que autoguardar todavia.
 */
function AutosaveIndicator({ state, hasDraft }: { state: "idle" | "saving" | "saved" | "error"; hasDraft: boolean }) {
  if (!hasDraft && state === "idle") return null;

  const config = {
    idle: null,
    saving: { icon: CloudSyncOutlinedIcon, label: "Guardando borrador…", color: "text.secondary" },
    saved: { icon: CloudDoneOutlinedIcon, label: "Borrador guardado", color: "success.main" },
    error: { icon: CloudOffOutlinedIcon, label: "Sin conexión — reintentando guardar el borrador", color: "warning.main" },
  }[state];

  if (!config) return null;
  const Icon = config.icon;

  return (
    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
      <Icon fontSize="inherit" sx={{ color: config.color, fontSize: 16 }} />
      <Typography variant="caption" sx={{ color: config.color }}>
        {config.label}
      </Typography>
    </Stack>
  );
}

export function ActaFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const puedeElegirJve = CAN_CHOOSE_JVE_ROLES.some((r) => user?.roles.includes(r));

  // Las 4 categorias por defecto solo se pueden precargar con su id real una
  // vez que el catalogo termino de cargar — hasta entonces la produccion
  // inicial arranca con una fila vacia normal (ver efecto mas abajo).
  const [defaultCategoriesApplied, setDefaultCategoriesApplied] = useState(false);

  const methods = useForm<ActaFormValues>({
    resolver: zodResolver(actaFormSchema),
    defaultValues: {
      departmentId: 0,
      duicentroId: 0,
      actaDate: "",
      arrivalTime: "",
      departureTime: "",
      jveDelegateId: undefined,
      rnpnDelegateName: "",
      duicentroChiefName: "",
      observations: "",
      declaredTotal: undefined,
      producciones: [EMPTY_PRODUCCION],
      incidentes: [],
    },
  });

  const {
    control,
    register,
    watch,
    setValue,
    handleSubmit,
    formState: { errors },
  } = methods;

  const { fields: produccionFields, append: appendProduccion, remove: removeProduccion } = useFieldArray({
    control,
    name: "producciones",
  });

  // Acordeon de un solo panel: solo la produccion en este indice se muestra
  // expandida (arranca en la primera). Al agregar una nueva se abre ella y
  // se colapsa la anterior sola, para no acumular scroll — el usuario puede
  // reabrir cualquiera con un clic en su encabezado (ver onToggleProduccion).
  const [openProduccionIndex, setOpenProduccionIndex] = useState<number | null>(0);

  const { fields: incidenteFields, append: appendIncidente, remove: removeIncidente } = useFieldArray({
    control,
    name: "incidentes",
  });

  const departmentId = watch("departmentId");

  // Total acumulado del acta: suma de subtotales de TODAS las producciones
  // (cada subtotal ya es la suma de sus categorias). Puramente reactivo —
  // nunca se manda al backend, es la misma logica de "vista previa" que ya
  // usa cada ProduccionRow, solo que sumada entre producciones.
  const produccionesWatch = watch("producciones");
  const totalAcumulado = (produccionesWatch ?? []).reduce(
    (sum, p) => sum + (p.values ?? []).reduce((s, v) => s + (Number(v?.quantity) || 0), 0),
    0
  );

  const departamentosQuery = useQuery({
    queryKey: ["departamentos", "activos"],
    queryFn: catalogApi.getDepartamentos,
  });

  const duicentrosQuery = useQuery({
    queryKey: ["duicentros", departmentId || null],
    queryFn: () => catalogApi.getDuicentros(departmentId || undefined),
    enabled: !!departmentId,
  });

  const categoriasQuery = useQuery({
    queryKey: ["categorias"],
    queryFn: catalogApi.getCategorias,
  });

  const jveDelegadosQuery = useQuery({
    queryKey: ["delegados", "JVE"],
    queryFn: () => catalogApi.getDelegados("JVE"),
    enabled: puedeElegirJve,
  });

  const tiposIncidenteQuery = useQuery({
    queryKey: ["tipos-incidente"],
    queryFn: catalogApi.getTiposIncidente,
  });

  const skipNextDuicentroClearRef = useRef(false);

  // Al cambiar de departamento, el duicentro elegido ya no es valido —
  // salvo que el cambio venga de rehidratar un borrador (methods.reset),
  // donde departmentId y duicentroId ya llegan consistentes entre si.
  useEffect(() => {
    if (skipNextDuicentroClearRef.current) {
      skipNextDuicentroClearRef.current = false;
      return;
    }
    setValue("duicentroId", 0);
  }, [departmentId, setValue]);

  // Apenas carga el catalogo de categorias (una sola vez), precarga la
  // primera produccion con las 4 categorias de siempre (Primera vez,
  // Modificaciones, Reposiciones, Renovaciones) en cantidad 0 — el digitador
  // solo llena el numero. Sigue pudiendo borrar cualquiera o agregar otras.
  // No aplica si se recupero un borrador (ver efecto de rehidratacion abajo,
  // que fija defaultCategoriesApplied en true para no pisar su contenido).
  useEffect(() => {
    if (defaultCategoriesApplied) return;
    if (!categoriasQuery.data) return;
    setValue("producciones.0.values", buildDefaultProductionValues(categoriasQuery.data));
    setDefaultCategoriesApplied(true);
  }, [categoriasQuery.data, defaultCategoriesApplied, setValue]);

  const { toast, showToast, closeToast } = useToast();

  // enabled: !id — este flujo de borrador solo aplica a "nueva acta"; la
  // pantalla de edicion de una acta ya existente (mas abajo) no lo usa.
  const draftAutosave = useActaDraftAutosave({
    username: user?.username ?? "",
    enabled: !id,
  });

  // Si se recupero un borrador (backend o LocalStorage) al entrar, se le
  // pregunta al digitador que hacer ANTES de tocar el formulario — nunca se
  // rehidrata en automatico. false una vez que elige "Continuar" o
  // "Descartar" (o si nunca hubo nada que recuperar).
  const [draftDecisionMade, setDraftDecisionMade] = useState(false);
  const [discardingDraft, setDiscardingDraft] = useState(false);
  const pendingDraft = !draftDecisionMade ? draftAutosave.initialSnapshot : null;

  // Comparte cache con duicentrosQuery de mas abajo (misma queryKey) — solo
  // para poder mostrar el nombre del duicentro del borrador pendiente en el
  // aviso de recuperacion.
  const pendingDraftDuicentrosQuery = useQuery({
    queryKey: ["duicentros", pendingDraft?.departmentId || null],
    queryFn: () => catalogApi.getDuicentros(pendingDraft!.departmentId),
    enabled: !!pendingDraft,
  });

  const handleContinueDraft = useCallback(() => {
    if (!draftAutosave.initialSnapshot) return;
    const snapshot = draftAutosave.initialSnapshot;
    skipNextDuicentroClearRef.current = true;
    const restored = mapDraftSnapshotToFormValues(snapshot);
    methods.reset(restored);
    setDefaultCategoriesApplied(true);
    // Abre la ultima produccion del borrador (la que probablemente se estaba
    // llenando cuando se interrumpio la captura) en vez de siempre la primera.
    setOpenProduccionIndex(restored.producciones.length - 1);
    setDraftDecisionMade(true);
  }, [draftAutosave.initialSnapshot, methods]);

  const handleDiscardDraft = useCallback(async () => {
    setDiscardingDraft(true);
    try {
      await draftAutosave.discardDraft();
    } finally {
      setDiscardingDraft(false);
      setDraftDecisionMade(true);
    }
  }, [draftAutosave]);

  // Unico caso donde de verdad no hay nada que mantener: el borrador se
  // completo o se descarto desde otra sesion mientras este seguia
  // autoguardando. Un aviso y de vuelta al listado — no hay diálogo de
  // conflicto para nada mas, lo tecleado siempre gana (ver useActaDraftAutosave).
  useEffect(() => {
    if (!draftAutosave.draftGone) return;
    showToast("error", "Esta acta ya se completó o se descartó desde otra sesión.");
    navigate("/actas");
  }, [draftAutosave.draftGone, navigate, showToast]);

  // Cada cambio del formulario se le avisa al hook de autoguardado: el,
  // internamente, decide cuando respaldar en LocalStorage y cuando mandar
  // el PATCH con debounce — no hay costo extra por llamarlo en cada tecla.
  useEffect(() => {
    const subscription = watch((values) => {
      const snapshot = buildDraftSnapshot(values as ActaFormValues, { puedeElegirJve });
      draftAutosave.notifyChange(snapshot);
    });
    return () => subscription.unsubscribe();
  }, [watch, puedeElegirJve, draftAutosave.notifyChange]);

  const finalizeMutation = useMutation({
    mutationFn: (values: ActaFormValues) => {
      const snapshot = buildDraftSnapshot(values, { puedeElegirJve });
      return draftAutosave.finalize(snapshot);
    },
    onSuccess: (data) => {
      navigate(`/actas/${data.id}`, { replace: true });
    },
  });

  const onSubmit = handleSubmit((values) => {
    finalizeMutation.mutate(values);
  });

  if (id) {
    return (
      <Paper variant="outlined" sx={{ p: 4, maxWidth: 640 }}>
        <Typography variant="h3" gutterBottom>
          Edición de acta no disponible
        </Typography>
        <Typography variant="body2" color="text.secondary">
          La API todavía no expone un endpoint para editar los datos de un acta ya creada. Si el
          acta fue observada, usa el botón "Reanudar" en su detalle para volver a{" "}
          <strong>REGISTRADA</strong> y coordina la corrección de la información fuera del
          sistema mientras se agrega esa capacidad.
        </Typography>
        <Button sx={{ mt: 2 }} onClick={() => navigate(`/actas/${id}`)}>
          Ir al detalle del acta
        </Button>
      </Paper>
    );
  }

  if (draftAutosave.loadingInitial) {
    return (
      <Stack alignItems="center" sx={{ py: 8 }}>
        <CircularProgress />
      </Stack>
    );
  }

  if (pendingDraft) {
    const duicentroName = pendingDraftDuicentrosQuery.data?.find((d) => d.id === pendingDraft.duicentroId)?.name;
    return (
      <Paper variant="outlined" sx={{ p: 4, maxWidth: 640 }}>
        <Typography variant="h3" gutterBottom>
          Tienes un borrador sin terminar
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {duicentroName ? `De ${duicentroName}` : "Sin duicentro identificado todavía"} del{" "}
          {formatDraftDate(pendingDraft.actaDate)}. ¿Quieres continuar donde lo dejaste o empezar de cero?
        </Typography>
        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" color="error" onClick={handleDiscardDraft} disabled={discardingDraft}>
            {discardingDraft ? "Descartando…" : "Descartar y empezar de cero"}
          </Button>
          <Button variant="contained" onClick={handleContinueDraft} disabled={discardingDraft}>
            Continuar borrador
          </Button>
        </Stack>
      </Paper>
    );
  }

  return (
    <FormProvider {...methods}>
      <Box component="form" onSubmit={onSubmit} noValidate>
        <Stack spacing={2.5} sx={{ maxWidth: 900 }}>
          <Box>
            <Typography variant="h3">Nueva acta</Typography>
            <Typography variant="body2" color="text.secondary">
              Registre la información del acta y las producciones observadas. El sistema calcula
              automáticamente los totales.
            </Typography>
            <AutosaveIndicator state={draftAutosave.autosaveState} hasDraft={draftAutosave.draftId !== null} />
          </Box>

          <Collapse in={finalizeMutation.isError && !(finalizeMutation.error instanceof DraftGoneError)}>
            <Alert severity="error">
              {getApiErrorMessage(finalizeMutation.error, "No se pudo finalizar el acta.")}
            </Alert>
          </Collapse>

          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Stack spacing={2}>
              <SectionHeader n={1} title="Identificación" subtitle="Datos generales del acta" />

              <TextField
                label="Fecha del acta"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                error={!!errors.actaDate}
                helperText={errors.actaDate?.message}
                {...register("actaDate")}
              />

              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <Controller
                  name="departmentId"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      select
                      label="Departamento"
                      fullWidth
                      value={field.value || ""}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      error={!!errors.departmentId}
                      helperText={errors.departmentId?.message}
                    >
                      <MenuItem value="" disabled>
                        Selecciona
                      </MenuItem>
                      {(departamentosQuery.data ?? []).map((dep) => (
                        <MenuItem key={dep.id} value={dep.id}>
                          {dep.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />

                <Controller
                  name="duicentroId"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      select
                      label="Duicentro"
                      fullWidth
                      disabled={!departmentId}
                      value={field.value || ""}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      error={!!errors.duicentroId}
                      helperText={
                        errors.duicentroId?.message ??
                        (!departmentId ? "Elige primero un departamento" : undefined)
                      }
                    >
                      <MenuItem value="" disabled>
                        Selecciona
                      </MenuItem>
                      {(duicentrosQuery.data ?? []).map((d) => (
                        <MenuItem key={d.id} value={d.id}>
                          {d.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </Stack>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  label="Hora de llegada (opcional)"
                  type="time"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  {...register("arrivalTime")}
                />
                <TextField
                  label="Hora de salida (opcional)"
                  type="time"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  {...register("departureTime")}
                />
              </Stack>
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Stack spacing={2}>
              <SectionHeader n={2} title="Delegados" subtitle="Personal relacionado con el acta" />

              {puedeElegirJve ? (
                <Controller
                  name="jveDelegateId"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      select
                      label="Delegado JVE (opcional)"
                      fullWidth
                      value={field.value || ""}
                      onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                      helperText="Como admin/supervisor puedes elegir libremente, por si digitas en nombre de otro."
                    >
                      <MenuItem value="">Sin especificar</MenuItem>
                      {(jveDelegadosQuery.data ?? []).map((d) => (
                        <MenuItem key={d.id} value={d.id}>
                          {d.firstName} {d.lastName}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              ) : (
                <Alert severity="info">
                  El delegado JVE eres tú mismo — se fija automáticamente con tu usuario al crear
                  el acta.
                </Alert>
              )}

              <TextField
                label="Delegado RNPN (opcional)"
                placeholder="Nombre completo"
                fullWidth
                {...register("rnpnDelegateName")}
              />

              <TextField
                label="Jefe de duicentro (opcional)"
                placeholder="Nombre completo"
                fullWidth
                {...register("duicentroChiefName")}
              />
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Stack spacing={2}>
              <SectionHeader n={3} title="Observaciones" />
              <TextField
                label="Observaciones (opcional)"
                fullWidth
                multiline
                minRows={3}
                sx={{ "& .MuiInputBase-inputMultiline": { resize: "vertical" } }}
                {...register("observations")}
              />
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Stack spacing={2}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <SectionHeader
                  n={4}
                  title="Incidentes"
                  subtitle="Opcional — solo si pasó algo fuera de lo normal durante el registro"
                />
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => appendIncidente({ ...EMPTY_INCIDENTE })}
                  sx={{ flexShrink: 0 }}
                >
                  Agregar incidente
                </Button>
              </Stack>

              {incidenteFields.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  No se ha registrado ningún incidente.
                </Typography>
              )}

              <Stack spacing={1.5}>
                {incidenteFields.map((field, index) => (
                  <IncidenteRow
                    key={field.id}
                    index={index}
                    tiposIncidente={tiposIncidenteQuery.data ?? []}
                    onRemove={() => removeIncidente(index)}
                  />
                ))}
              </Stack>
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Stack spacing={2}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <SectionHeader n={5} title="Producciones" subtitle="Agregue una o más producciones al acta" />
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    appendProduccion({
                      productionDate: "",
                      declaredTotal: undefined,
                      values: buildDefaultProductionValues(categoriasQuery.data ?? []),
                    });
                    setOpenProduccionIndex(produccionFields.length);
                  }}
                  sx={{ flexShrink: 0 }}
                >
                  Agregar producción
                </Button>
              </Stack>

              <Collapse in={typeof errors.producciones?.message === "string"}>
                <Alert severity="error">
                  {typeof errors.producciones?.message === "string" ? errors.producciones.message : ""}
                </Alert>
              </Collapse>

              <Stack spacing={2}>
                {produccionFields.map((field, index) => (
                  <ProduccionRow
                    key={field.id}
                    index={index}
                    categorias={categoriasQuery.data ?? []}
                    onRemove={() => {
                      removeProduccion(index);
                      setOpenProduccionIndex((current) => {
                        if (current === null) return current;
                        if (current === index) return null;
                        return current > index ? current - 1 : current;
                      });
                    }}
                    canRemove={produccionFields.length > 1}
                    open={openProduccionIndex === index}
                    onToggle={() => setOpenProduccionIndex((current) => (current === index ? null : index))}
                  />
                ))}
              </Stack>
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Stack spacing={2}>
              <SectionHeader n={6} title="Total del acta" />
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body1">Total acumulado de producciones</Typography>
                <Typography variant="h4" sx={numericDataSx}>
                  {totalAcumulado > 0 ? totalAcumulado : ""}
                </Typography>
              </Stack>
              <TextField
                label="Total declarado del acta (opcional)"
                type="number"
                sx={{ maxWidth: 240 }}
                helperText="Lo que dice el papel a mano, si aplica."
                {...register("declaredTotal", { valueAsNumber: true })}
              />
            </Stack>
          </Paper>

          <Stack direction="row" spacing={1.5} justifyContent="flex-end">
            <Button variant="text" color="inherit" onClick={() => navigate("/actas")}>
              Cancelar
            </Button>
            <Button type="submit" variant="contained" disabled={finalizeMutation.isPending}>
              {finalizeMutation.isPending ? "Guardando…" : "Guardar acta"}
            </Button>
          </Stack>
        </Stack>
      </Box>

      <ToastSnackbar toast={toast} onClose={closeToast} />
    </FormProvider>
  );
}
