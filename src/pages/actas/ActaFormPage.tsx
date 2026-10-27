import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMatch, useNavigate, useParams } from "react-router-dom";
import { Controller, FormProvider, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { actaApi } from "@/api/actaApi";
import { Box, Button, Chip, Collapse, MenuItem, Skeleton, Stack, TextField, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBackRounded";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import EditOffOutlinedIcon from "@mui/icons-material/EditOffOutlined";
import RestorePageOutlinedIcon from "@mui/icons-material/RestorePageOutlined";
import { catalogApi } from "@/api/catalogApi";
import { traineeAssignmentApi } from "@/api/electoralApi";
import { designTokens } from "@/theme/theme";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeader, Surface } from "@/components/ui/Surface";
import { Callout } from "@/components/ui/Callout";
import { AutosaveIndicator } from "@/components/ui/AutosaveIndicator";
import { AddRowButton } from "@/components/ui/AddRowButton";
import { CenteredNotice } from "@/components/ui/CenteredNotice";
import { getApiErrorMessage } from "@/utils/apiError";
import { useAuth } from "@/hooks/useAuth";
import { useModulos } from "@/hooks/useModulos";
import { useIsTemporaryDelegate } from "@/hooks/useMyAccount";
import type { ActaPracticaResponse } from "@/types/acta";
import { ActaPracticaResultado } from "./ActaPracticaResultado";
import { useToast } from "@/hooks/useToast";
import { ToastSnackbar } from "@/components/ToastSnackbar";
import {
  actaFormSchema,
  buildDefaultProductionValues,
  buildDraftSnapshot,
  EMPTY_INCIDENTE,
  EMPTY_PRODUCCION,
  mapActaToFormValues,
  mapDraftSnapshotToFormValues,
  OBSERVATIONS_MIN_WORDS,
} from "./actaFormSchema";
import type { ActaFormValues } from "./actaFormSchema";
import { ProduccionRow } from "./ProduccionRow";
import { IncidenteRow } from "./IncidenteRow";
import { AcompanantesField } from "./AcompanantesField";
import type { AcompananteOption } from "./AcompanantesField";
import { DraftGoneError, snapshotToCreateRequest, useActaDraftAutosave } from "./useActaDraftAutosave";
import { OBSERVACIONES_FIELD_ID, ObservacionesField } from "./ObservacionesField";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { actaNumberFormatter as fmt, formatActaDate } from "./actaUi";

const CAN_CHOOSE_JVE_ROLES = ["ADMINISTRADOR", "SUPERVISOR"];

const draftDateFormatter = new Intl.DateTimeFormat("es-SV", { day: "2-digit", month: "long", year: "numeric" });

function formatDraftDate(actaDate: string): string {
  if (!actaDate) return "sin fecha";
  const parsed = new Date(`${actaDate}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? actaDate : draftDateFormatter.format(parsed);
}

const EMPTY_FORM: ActaFormValues = {
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
  acompananteIds: [],
};

export function ActaFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const puedeElegirJve = CAN_CHOOSE_JVE_ROLES.some((r) => user?.roles.includes(r));

  // Modo practica (/actas/practica): este MISMO formulario, pero el borrador
  // vive solo en el navegador y al final se manda un unico POST
  // /practica/actas que no registra nada (ver useActaDraftAutosave).
  const isPractice = !!useMatch("/actas/practica");
  const modulos = useModulos();
  const [practiceResult, setPracticeResult] = useState<ActaPracticaResponse | null>(null);

  // Las 4 categorias por defecto solo se pueden precargar con su id real una
  // vez que el catalogo termino de cargar — hasta entonces la produccion
  // inicial arranca con una fila vacia normal (ver efecto mas abajo).
  const [defaultCategoriesApplied, setDefaultCategoriesApplied] = useState(false);

  const methods = useForm<ActaFormValues>({
    resolver: zodResolver(actaFormSchema),
    defaultValues: EMPTY_FORM,
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

  // Mismo acordeon de un solo panel que producciones: al agregar un
  // incidente nuevo se abre el y el anterior se contrae a su resumen.
  const [openIncidenteIndex, setOpenIncidenteIndex] = useState<number | null>(null);

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

  // El total declarado del acta sigue solo al total calculado mientras el
  // digitador no lo toque; en cuanto escribe otra cifra (lo que dice el
  // papel) deja de sincronizarse, para que una discrepancia real se note.
  const [declaredManual, setDeclaredManual] = useState(false);
  useEffect(() => {
    if (declaredManual) return;
    setValue("declaredTotal", totalAcumulado > 0 ? totalAcumulado : undefined);
  }, [totalAcumulado, declaredManual, setValue]);

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
    if (defaultCategoriesApplied || id) return;
    if (!categoriasQuery.data) return;
    setValue("producciones.0.values", buildDefaultProductionValues(categoriasQuery.data));
    setDefaultCategoriesApplied(true);
  }, [categoriasQuery.data, defaultCategoriesApplied, id, setValue]);

  // Corregir un acta ya registrada (/actas/:id/editar): este mismo formulario
  // precargado, que guarda con PUT /actas/{id}. Sin borrador ni autoguardado.
  const isEdit = !!id;
  const editId = Number(id);
  const queryClient = useQueryClient();
  const editActaQuery = useQuery({
    queryKey: ["actas", editId],
    queryFn: () => actaApi.getActa(editId),
    enabled: isEdit && Number.isFinite(editId),
  });
  const editActa = editActaQuery.data;
  const [editLoaded, setEditLoaded] = useState(false);
  useEffect(() => {
    if (editLoaded || !editActa) return;
    const restored = mapActaToFormValues(editActa);
    skipNextDuicentroClearRef.current = true;
    methods.reset(restored);
    setDefaultCategoriesApplied(true);
    // Un total declarado distinto al calculado fue escrito a mano: se respeta.
    setDeclaredManual(restored.declaredTotal !== undefined && restored.declaredTotal !== editActa.calculatedTotal);
    setEditLoaded(true);
  }, [editActa, editLoaded, methods]);

  // El acta trae el delegado JVE solo por nombre: quien puede elegirlo (admin
  // o supervisor) lo recupera buscandolo en el catalogo, una sola vez. Si no
  // aparece, se avisa junto al campo — guardar sin elegirlo lo quitaria.
  const jveResolvedRef = useRef(false);
  const [jveUnmatched, setJveUnmatched] = useState(false);
  useEffect(() => {
    if (jveResolvedRef.current || !editLoaded || !editActa || !puedeElegirJve || !jveDelegadosQuery.data) return;
    jveResolvedRef.current = true;
    const name = editActa.jveDelegateName?.trim().toLowerCase();
    if (!name || editActa.createdByType === "TEMPORARY") return;
    const match = jveDelegadosQuery.data.find((d) => `${d.firstName} ${d.lastName}`.trim().toLowerCase() === name);
    if (match) setValue("jveDelegateId", match.id);
    else setJveUnmatched(true);
  }, [editLoaded, editActa, puedeElegirJve, jveDelegadosQuery.data, setValue]);

  // Acompañantes: los temporales que el permanente tiene a cargo. Un delegado
  // temporal nunca tiene a nadie a cargo (y el backend le rechaza mandar
  // acompañantes), asi que ni se consulta.
  const isTemporary = useIsTemporaryDelegate();
  const misTemporalesQuery = useQuery({
    queryKey: ["delegados-a-cargo", "mios"],
    queryFn: traineeAssignmentApi.getMios,
    enabled: !isTemporary,
  });
  // Al corregir un acta ajena (administrador) no se ofrecen los temporales
  // propios: el backend valida contra los del DUEÑO del acta. Solo se pueden
  // conservar o quitar los que el acta ya tiene.
  const isEditOfOthersActa =
    !!editActa && (editActa.createdByUsername !== user?.username || editActa.createdByType === "TEMPORARY");
  const acompananteOptions = useMemo<AcompananteOption[]>(() => {
    const options: AcompananteOption[] = isEditOfOthersActa
      ? []
      : (misTemporalesQuery.data ?? []).map((t) => ({
          temporaryDelegateId: t.temporaryDelegateId,
          fullName: t.temporaryDelegateName,
          dui: t.temporaryDelegateDui,
          politicalPartyName: t.politicalPartyName,
        }));
    // Un acompañante ya registrado se conserva aunque despues le hayan quitado
    // ese temporal al permanente: sigue apareciendo para no perderlo al guardar.
    (editActa?.acompanantes ?? []).forEach((a) => {
      if (!options.some((o) => o.temporaryDelegateId === a.temporaryDelegateId)) options.push(a);
    });
    return options;
  }, [misTemporalesQuery.data, editActa, isEditOfOthersActa]);

  // Un borrador recuperado puede traer marcado a un temporal que ya no esta a
  // cargo: se desmarca solo, porque guardar con el daria 409.
  const acompananteIdsWatch = watch("acompananteIds");
  const acompanantesReady = (isTemporary || misTemporalesQuery.isSuccess) && (!isEdit || editLoaded);
  useEffect(() => {
    if (!acompanantesReady) return;
    const current = acompananteIdsWatch ?? [];
    const valid = current.filter((idSel) => acompananteOptions.some((o) => o.temporaryDelegateId === idSel));
    if (valid.length !== current.length) setValue("acompananteIds", valid);
  }, [acompanantesReady, acompananteIdsWatch, acompananteOptions, setValue]);

  const { toast, showToast, closeToast } = useToast();

  // enabled: !id — este flujo de borrador solo aplica a "nueva acta"; la
  // pantalla de edicion de una acta ya existente (mas abajo) no lo usa.
  const draftAutosave = useActaDraftAutosave({
    username: user?.username ?? "",
    enabled: !id,
    practice: isPractice,
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
    // Si el borrador traia un total declarado distinto al calculado, fue escrito
    // a mano: se respeta y no se vuelve a sincronizar solo.
    const restoredTotal = restored.producciones.reduce(
      (sum, p) => sum + (p.values ?? []).reduce((s, v) => s + (Number(v?.quantity) || 0), 0),
      0
    );
    setDeclaredManual(
      typeof restored.declaredTotal === "number" &&
        Number.isFinite(restored.declaredTotal) &&
        restored.declaredTotal !== restoredTotal
    );
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
      if (isEdit) return actaApi.updateActa(editId, snapshotToCreateRequest(snapshot));
      return draftAutosave.finalize(snapshot);
    },
    onSuccess: (data) => {
      // El acta de practica no existe en el servidor (id null): no hay
      // detalle al cual navegar, su resultado se muestra aqui mismo.
      if (data.id === null) {
        setPracticeResult(data);
        return;
      }
      // Detalle y listados (mis actas, pendientes) muestran datos del acta.
      queryClient.invalidateQueries({ queryKey: ["actas"] });
      navigate(`/actas/${data.id}`, { replace: true });
    },
  });

  const handleRestartPractice = () => {
    methods.reset(EMPTY_FORM);
    setDefaultCategoriesApplied(false);
    setDeclaredManual(false);
    setOpenProduccionIndex(0);
    setOpenIncidenteIndex(null);
    finalizeMutation.reset();
    setPracticeResult(null);
  };

  // Si al guardar las observaciones no alcanzan el minimo, no se envia nada:
  // se avisa junto al boton y se lleva a la persona al campo para corregirlo.
  const observacionesRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const [observacionesBlocked, setObservacionesBlocked] = useState(false);
  const goToObservaciones = useCallback(() => {
    observacionesRef.current?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });
    document.getElementById(OBSERVACIONES_FIELD_ID)?.focus({ preventScroll: true });
  }, [reducedMotion]);

  const onSubmit = handleSubmit(
    (values) => {
      setObservacionesBlocked(false);
      finalizeMutation.mutate(values);
    },
    (formErrors) => {
      if (formErrors.observations) {
        setObservacionesBlocked(true);
        // Solo si Observaciones es el unico problema: si hay otros, react-hook-form
        // ya enfoca el primer campo con error (en orden del formulario).
        if (Object.keys(formErrors).length === 1) goToObservaciones();
      } else {
        setObservacionesBlocked(false);
      }
    }
  );

  // El aviso se retira solo en cuanto se completan las palabras que faltaban.
  const observacionesError = errors.observations?.message;
  useEffect(() => {
    if (!observacionesError) setObservacionesBlocked(false);
  }, [observacionesError]);

  const declaredTotalWatch = watch("declaredTotal");
  const declaredTotal = typeof declaredTotalWatch === "number" && Number.isFinite(declaredTotalWatch) ? declaredTotalWatch : null;
  const declaredMismatch = declaredTotal !== null && totalAcumulado > 0 && declaredTotal !== totalAcumulado;

  const exitPath = isEdit ? `/actas/${id}` : "/actas";

  if (isEdit) {
    if (editActaQuery.isError) {
      return (
        <Callout tone="error" title="No se pudo cargar el acta">
          {getApiErrorMessage(editActaQuery.error, "Puede que ya no exista o que no tengas acceso a ella.")}
        </Callout>
      );
    }
    if (!editActa || !editLoaded) {
      return (
        <Stack spacing={2.5} sx={{ flexShrink: 0 }} aria-busy="true">
          <Skeleton width={200} height={40} />
          <Surface>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} height={56} />
            ))}
          </Surface>
        </Stack>
      );
    }
    if (editActa.status !== "REGISTRADA" && editActa.status !== "OBSERVADA" && editActa.status !== "RECHAZADA") {
      return (
        <CenteredNotice
          icon={<EditOffOutlinedIcon />}
          title="Esta acta ya no se puede corregir"
          body="Solo se corrigen actas en estado Registrada, Observada o Rechazada. Una vez enviada a revisión, el acta queda bloqueada hasta que un revisor la apruebe, la observe o la rechace."
          actions={
            <Button variant="contained" onClick={() => navigate(`/actas/${id}`)}>
              Ir al detalle del acta
            </Button>
          }
        />
      );
    }
  }

  if (isPractice && !modulos.isLoading && !modulos.isTrainingEnabled) {
    return (
      <CenteredNotice
        icon={<SchoolOutlinedIcon />}
        title="El modo práctica está apagado"
        body="Un administrador lo enciende desde «Módulos del sistema» cuando hay una jornada de práctica. Mientras tanto puedes registrar actas reales con normalidad."
        actions={
          <Button variant="contained" onClick={() => navigate("/actas")}>
            Ir a Actas
          </Button>
        }
      />
    );
  }

  if (practiceResult) {
    return (
      <ActaPracticaResultado
        acta={practiceResult}
        onRestart={handleRestartPractice}
        onExit={() => navigate("/actas")}
      />
    );
  }

  if (draftAutosave.loadingInitial) {
    return (
      <Stack spacing={2.5} sx={{ flexShrink: 0 }} aria-busy="true">
        <Skeleton width={200} height={40} />
        <Surface>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={56} />
          ))}
        </Surface>
      </Stack>
    );
  }

  if (pendingDraft) {
    const duicentroName = pendingDraftDuicentrosQuery.data?.find((d) => d.id === pendingDraft.duicentroId)?.name;
    return (
      <CenteredNotice
        icon={<RestorePageOutlinedIcon />}
        title={isPractice ? "Tienes una práctica sin terminar" : "Tienes un borrador sin terminar"}
        body={
          <>
            {duicentroName ? `De ${duicentroName}` : "Sin duicentro identificado todavía"} del{" "}
            {formatDraftDate(pendingDraft.actaDate)}. ¿Quieres continuar donde lo dejaste o empezar de cero?
          </>
        }
        actions={
          <>
            <Button color="error" onClick={handleDiscardDraft} disabled={discardingDraft}>
              {discardingDraft ? "Descartando…" : "Descartar y empezar de cero"}
            </Button>
            <Button variant="contained" onClick={handleContinueDraft} disabled={discardingDraft}>
              Continuar borrador
            </Button>
          </>
        }
      />
    );
  }

  return (
    <FormProvider {...methods}>
      <Box component="form" onSubmit={onSubmit} noValidate sx={{ flexShrink: 0 }}>
        <Stack spacing={{ xs: 2, md: 2.5 }}>
          <PageHeader
            back={
              <Button size="small" color="inherit" startIcon={<ArrowBackIcon />} onClick={() => navigate(exitPath)}>
                {isEdit ? "Detalle del acta" : "Actas"}
              </Button>
            }
            title={isEdit ? `Corregir acta ${editActa?.actaNumber ?? ""}` : isPractice ? "Acta de práctica" : "Nueva acta"}
            titleAdornment={
              isEdit ? undefined : isPractice ? (
                <Chip label="MODO PRÁCTICA" color="warning" size="small" sx={{ fontWeight: 800, letterSpacing: "0.04em" }} />
              ) : (
                <AutosaveIndicator state={draftAutosave.autosaveState} hasDraft={draftAutosave.draftId !== null} />
              )
            }
            subtitle={
              isEdit
                ? "Corrige los datos y guarda. El acta conserva su número y su estado; el total se recalcula."
                : isPractice
                  ? "Llena el acta igual que una real para practicar. El sistema calcula los totales por ti."
                  : "Registra los datos del acta y sus producciones. El sistema calcula los totales por ti."
            }
          />

          {isEdit && editActa?.reviewComment && (editActa.status === "OBSERVADA" || editActa.status === "RECHAZADA") && (
            <Callout
              tone={editActa.status === "RECHAZADA" ? "error" : "warning"}
              title={editActa.status === "RECHAZADA" ? "Motivo del rechazo" : "El revisor pidió correcciones"}
            >
              <Box component="span" sx={{ whiteSpace: "pre-line" }}>
                {editActa.reviewComment}
              </Box>
            </Callout>
          )}

          {isPractice && (
            <Callout tone="warning" title="MODO PRÁCTICA — nada de esto se registra">
              Esta acta es solo para practicar: no se guarda en el sistema, no consume numeración y ningún revisor la
              verá. Lo que escribas se conserva únicamente en este navegador hasta que termines.
            </Callout>
          )}

          <Collapse in={finalizeMutation.isError && !(finalizeMutation.error instanceof DraftGoneError)}>
            <Callout tone="error" title="No se pudo guardar el acta">
              {getApiErrorMessage(finalizeMutation.error, "Revisa los datos e inténtalo de nuevo.")}
            </Callout>
          </Collapse>

          {/* Una sola columna, en el orden de siempre. Todo estatico, nada flota. */}
          <Stack spacing={{ xs: 2, md: 2.5 }}>
                <Surface>
                  <SectionHeader title="Identificación" subtitle="Dónde y cuándo se levantó el acta." />
                  <Stack spacing={2}>
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
                            // Al corregir no se cambia: el numero de acta pertenece a ese departamento.
                            disabled={isEdit}
                            value={field.value || ""}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                            error={!!errors.departmentId}
                            helperText={
                              errors.departmentId?.message ??
                              (isEdit ? "No se puede cambiar: el número de acta pertenece a este departamento." : undefined)
                            }
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
                              errors.duicentroId?.message ?? (!departmentId ? "Elige primero un departamento" : undefined)
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
                </Surface>

                <Surface>
                  <SectionHeader title="Delegados" subtitle="Personas presentes en el levantamiento." />
                  <Stack spacing={2}>
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
                            error={jveUnmatched && !field.value}
                            helperText={
                              jveUnmatched && !field.value
                                ? `Esta acta tiene como delegado JVE a «${editActa?.jveDelegateName}». Vuelve a elegirlo: si guardas sin especificar, se quita (salvo que el acta sea de un digitador, que conserva el suyo).`
                                : isEdit
                                  ? "Si el acta es de un digitador o de un delegado temporal, su delegado JVE no cambia."
                                  : "Como admin o supervisor puedes elegirlo, por si digitas en nombre de otra persona."
                            }
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
                      <Callout tone="info">
                        El delegado JVE eres tú: se asigna automáticamente con tu usuario al crear el acta.
                      </Callout>
                    )}

                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
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
                  </Stack>
                </Surface>

                {acompananteOptions.length > 0 && (
                  <Surface>
                    <SectionHeader
                      title="Delegados temporales acompañantes"
                      subtitle={
                        isEditOfOthersActa
                          ? "Los que registró el dueño del acta. Puedes quitar a quien no corresponda; solo el dueño puede agregar otros."
                          : "Opcional: marca a los delegados temporales a tu cargo que te acompañaron en esta acta."
                      }
                    />
                    <AcompanantesField options={acompananteOptions} canAddAll={!isEditOfOthersActa} />
                  </Surface>
                )}

                <Surface>
                  <SectionHeader
                    title="Observaciones"
                    subtitle={`Obligatorio: describe lo observado en al menos ${OBSERVATIONS_MIN_WORDS} palabras.`}
                  />
                  <ObservacionesField ref={observacionesRef} />
                </Surface>

                <Surface>
                  <SectionHeader
                    title="Incidentes"
                    subtitle="Opcional: solo si pasó algo fuera de lo normal durante el registro."
                  />
                  <Stack spacing={1.25}>
                    {incidenteFields.map((field, index) => (
                      <IncidenteRow
                        key={field.id}
                        index={index}
                        tiposIncidente={tiposIncidenteQuery.data ?? []}
                        onRemove={() => {
                          removeIncidente(index);
                          setOpenIncidenteIndex((current) => {
                            if (current === null) return current;
                            if (current === index) return null;
                            return current > index ? current - 1 : current;
                          });
                        }}
                        open={openIncidenteIndex === index}
                        onToggle={() => setOpenIncidenteIndex((current) => (current === index ? null : index))}
                      />
                    ))}
                    <AddRowButton
                      onClick={() => {
                        appendIncidente({ ...EMPTY_INCIDENTE });
                        setOpenIncidenteIndex(incidenteFields.length);
                      }}
                    >
                      {incidenteFields.length === 0 ? "Agregar incidente" : "Agregar otro incidente"}
                    </AddRowButton>
                  </Stack>
                </Surface>

                <Surface>
                  <SectionHeader
                    title="Producciones"
                    subtitle="Una por cada día de producción del acta."
                  />

                  <Collapse in={typeof errors.producciones?.message === "string"}>
                    <Box sx={{ mb: 1.5 }}>
                      <Callout tone="error">
                        {typeof errors.producciones?.message === "string" ? errors.producciones.message : ""}
                      </Callout>
                    </Box>
                  </Collapse>

                  <Stack spacing={1.25}>
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
                    <AddRowButton
                      onClick={() => {
                        appendProduccion({
                          productionDate: "",
                          declaredTotal: undefined,
                          values: buildDefaultProductionValues(categoriasQuery.data ?? []),
                        });
                        setOpenProduccionIndex(produccionFields.length);
                      }}
                    >
                      Agregar producción
                    </AddRowButton>
                  </Stack>
                </Surface>

            <Surface sx={{ containerType: "inline-size" }}>
              <SectionHeader title="Total del acta" subtitle="Vista previa: el sistema recalcula los totales al guardar." />
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "1fr",
                  "@container (min-width: 520px)": { gridTemplateColumns: "1fr 1fr" },
                  columnGap: 4,
                  rowGap: 2.5,
                  alignItems: "start",
                }}
              >
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Total acumulado de producciones
                  </Typography>
                  <Typography
                    aria-live="polite"
                    sx={{
                      fontSize: "2.5rem",
                      fontWeight: 700,
                      letterSpacing: "-0.035em",
                      lineHeight: 1.1,
                      fontVariantNumeric: "tabular-nums",
                      color: totalAcumulado > 0 ? "text.primary" : designTokens.textDisabled,
                    }}
                  >
                    {fmt.format(totalAcumulado)}
                  </Typography>

                  {(produccionesWatch ?? []).length > 1 && (
                    <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, mt: 1.5 }}>
                      {(produccionesWatch ?? []).map((p, i) => {
                        const sub = (p.values ?? []).reduce((s, v) => s + (Number(v?.quantity) || 0), 0);
                        return (
                          <Stack
                            component="li"
                            key={i}
                            direction="row"
                            justifyContent="space-between"
                            sx={{ py: 0.625, borderTop: "1px solid rgba(15, 23, 42, 0.06)" }}
                          >
                            <Typography variant="body2">
                              Producción {i + 1}
                              {p.productionDate && (
                                <Box component="span" sx={{ color: designTokens.textCaption, ml: 0.75 }}>
                                  {formatActaDate(p.productionDate)}
                                </Box>
                              )}
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 700, color: "text.primary", fontVariantNumeric: "tabular-nums" }}
                            >
                              {fmt.format(sub)}
                            </Typography>
                          </Stack>
                        );
                      })}
                    </Box>
                  )}
                </Box>

                <Box>
                  <TextField
                    label="Total declarado del acta"
                    type="number"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    helperText={
                      declaredMismatch
                        ? `No coincide con el total calculado (${fmt.format(totalAcumulado)}). Se marcará como discrepancia.`
                        : declaredManual
                          ? "Escrito a mano, según el papel."
                          : "Se llena solo con el total calculado. Cámbialo si el papel dice otra cifra."
                    }
                    FormHelperTextProps={{
                      sx: declaredMismatch ? { color: designTokens.status.warning.fg, fontWeight: 600 } : undefined,
                    }}
                    {...register("declaredTotal", { valueAsNumber: true, onChange: () => setDeclaredManual(true) })}
                  />
                  {declaredManual && totalAcumulado > 0 && declaredTotal !== totalAcumulado && (
                    <Button size="small" onClick={() => setDeclaredManual(false)} sx={{ mt: 1 }}>
                      Usar el total calculado ({fmt.format(totalAcumulado)})
                    </Button>
                  )}
                </Box>
              </Box>
            </Surface>
          </Stack>

          <Collapse in={observacionesBlocked && !!observacionesError}>
            <Callout
              tone="error"
              title="Falta completar las observaciones"
              action={
                <Button size="small" color="error" variant="outlined" onClick={goToObservaciones} sx={{ flexShrink: 0, alignSelf: "center" }}>
                  Ir a Observaciones
                </Button>
              }
            >
              {observacionesError}
            </Callout>
          </Collapse>

          <Stack direction="row" spacing={1.5} justifyContent="flex-end">
            <Button color="inherit" onClick={() => navigate(exitPath)}>
              Cancelar
            </Button>
            <Button type="submit" variant="contained" size="large" disabled={finalizeMutation.isPending}>
              {finalizeMutation.isPending
                ? "Guardando…"
                : isEdit
                  ? "Guardar cambios"
                  : isPractice
                    ? "Guardar acta de práctica"
                    : "Guardar acta"}
            </Button>
          </Stack>
        </Stack>
      </Box>

      <ToastSnackbar toast={toast} onClose={closeToast} />
    </FormProvider>
  );
}
