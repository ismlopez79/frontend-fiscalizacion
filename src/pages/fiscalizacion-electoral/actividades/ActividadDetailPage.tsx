import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Box, Button, CircularProgress, IconButton, Skeleton, Stack, Tooltip, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBackRounded";
import EditIcon from "@mui/icons-material/EditOutlined";
import EventBusyOutlinedIcon from "@mui/icons-material/EventBusyOutlined";
import EventAvailableOutlinedIcon from "@mui/icons-material/EventAvailableOutlined";
import PersonRemoveOutlinedIcon from "@mui/icons-material/PersonRemoveOutlined";
import PersonAddAltOutlinedIcon from "@mui/icons-material/PersonAddAltOutlined";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import { activityApi, activityFormApi, phaseApi } from "@/api/fiscalizacionFasesApi";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeader, Surface } from "@/components/ui/Surface";
import { Callout } from "@/components/ui/Callout";
import { DetailRow } from "@/components/ui/DetailRow";
import { EstadoActaChip } from "@/components/EstadoActaChip";
import { ConfirmacionAccion } from "@/components/ConfirmacionAccion";
import { ToastSnackbar } from "@/components/ToastSnackbar";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/hooks/useAuth";
import { useActiveElectoralPeriod } from "@/hooks/useActiveElectoralPeriod";
import { getApiErrorMessage } from "@/utils/apiError";
import { formatDate, formatDateTime } from "@/utils/dateFormat";
import { designTokens } from "@/theme/theme";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import type { ActivityDelegateDto, ActivityDelegateType, DelegateAvailabilityDto } from "@/types/fiscalizacionFases";
import { ELECTION_TYPE_LABELS } from "@/types/fiscalizacionFases";
import { ActivityStateChip, DelegateAvatar, districtLine, feRoutes } from "../fiscalizacionFasesUi";
import { ActividadFormDialog } from "./ActividadFormDialog";
import { DelegateSinglePicker, delegateKey, useDelegadosDisponibles } from "../components/DelegatePicker";

/** Temporales y permanentes se muestran y se agregan por separado. */
const DELEGATE_GROUPS: { type: ActivityDelegateType; title: string; short: string }[] = [
  { type: "TEMPORARY", title: "Delegados temporales", short: "Temporal" },
  { type: "PERMANENT", title: "Delegados permanentes (DIGITADOR)", short: "Permanente" },
];


/**
 * Detalle de una actividad para el admin: datos, equipo de delegados
 * (agregar/quitar) y el estado de su informe. Desde el primer envio del
 * informe el equipo queda fijado: el backend responde 409 a cualquier cambio.
 */
export function ActividadDetailPage() {
  const { id } = useParams();
  const activityId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast, showToast, closeToast } = useToast();
  const { user } = useAuth();
  const canManage = !!user?.roles.includes("ADMINISTRADOR");
  const { data: periodos } = useActiveElectoralPeriod();

  const activityQuery = useQuery({
    queryKey: ["actividades", activityId],
    queryFn: () => activityApi.getActividad(activityId),
    enabled: Number.isFinite(activityId),
  });
  const activity = activityQuery.data;

  const formQuery = useQuery({
    queryKey: ["actividades", activityId, "formulario"],
    queryFn: () => activityFormApi.getFormulario(activityId),
    enabled: Number.isFinite(activityId),
  });
  const form = formQuery.data ?? null;
  const locked = !!form?.submittedAt;

  const fasesQuery = useQuery({
    queryKey: ["fases", activity?.electoralPeriodId ?? null, "todas"],
    queryFn: () => phaseApi.getFasesTodas(activity!.electoralPeriodId),
    enabled: canManage && !!activity,
  });

  const [editOpen, setEditOpen] = useState(false);
  const [confirmToggle, setConfirmToggle] = useState(false);
  const [toRemove, setToRemove] = useState<ActivityDelegateDto | null>(null);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["actividades"] });
  };

  const toggleMutation = useMutation({
    mutationFn: () =>
      activityApi.actualizar(activityId, {
        activityDate: activity!.activityDate,
        districtId: activity!.districtId,
        placeName: activity!.placeName,
        address: activity!.address,
        electionType: activity!.electionType,
        notes: activity!.notes,
        active: !activity!.active,
      }),
    onSuccess: (saved) => {
      queryClient.setQueryData(["actividades", activityId], saved);
      refresh();
      showToast("success", saved.active ? "Actividad reactivada." : "Actividad cancelada.");
    },
    onError: (error) => showToast("error", getApiErrorMessage(error, "No se pudo cambiar la actividad.")),
  });

  const removeMutation = useMutation({
    mutationFn: (d: ActivityDelegateDto) => activityApi.quitarDelegado(activityId, d.id),
    onSuccess: (_, d) => {
      refresh();
      showToast("success", `${d.fullName} ya no está en el equipo.`);
    },
    onError: (error) => showToast("error", getApiErrorMessage(error, "No se pudo quitar al delegado.")),
  });

  const backButton = (
    <Button size="small" color="inherit" startIcon={<ArrowBackIcon />} onClick={() => navigate(feRoutes.actividades)}>
      Actividades
    </Button>
  );

  if (activityQuery.isLoading) {
    return (
      <Stack spacing={2.5} sx={{ flexShrink: 0, maxWidth: 960 }} aria-busy="true">
        <Box>
          <Box sx={{ ml: -1, mb: 1 }}>{backButton}</Box>
          <Skeleton width={320} height={40} />
        </Box>
        <Surface>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={34} />
          ))}
        </Surface>
      </Stack>
    );
  }

  if (!activity || activityQuery.isError) {
    return (
      <Stack spacing={2} sx={{ flexShrink: 0 }}>
        <Box sx={{ ml: -1 }}>{backButton}</Box>
        <Callout tone="error" title="No se pudo cargar la actividad">
          {getApiErrorMessage(activityQuery.error, "Puede que ya no exista.")}
        </Callout>
      </Stack>
    );
  }

  const period = (periodos ?? []).find((p) => p.id === activity.electoralPeriodId) ?? null;
  const canEditTeam = canManage && !locked;

  return (
    <Stack spacing={{ xs: 2, md: 2.5 }} sx={{ flexShrink: 0, pb: 2, maxWidth: 960 }}>
      <PageHeader
        back={backButton}
        title={activity.placeName}
        titleAdornment={<ActivityStateChip active={activity.active} />}
        subtitle={`${activity.phaseName} · ${formatDate(activity.activityDate)}`}
        actions={
          canManage && (
            <>
              <Tooltip title={locked ? "El informe ya se envió: la actividad no se puede cambiar." : ""}>
                <span>
                  <Button
                    color={activity.active ? "error" : "success"}
                    startIcon={activity.active ? <EventBusyOutlinedIcon /> : <EventAvailableOutlinedIcon />}
                    onClick={() => setConfirmToggle(true)}
                    disabled={locked || toggleMutation.isPending}
                  >
                    {activity.active ? "Cancelar actividad" : "Reactivar"}
                  </Button>
                </span>
              </Tooltip>
              <Tooltip title={locked ? "El informe ya se envió: la actividad no se puede cambiar." : ""}>
                <span>
                  <Button variant="outlined" startIcon={<EditIcon />} onClick={() => setEditOpen(true)} disabled={locked}>
                    Corregir
                  </Button>
                </span>
              </Tooltip>
            </>
          )
        }
      />

      {locked && (
        <Callout tone="info" title="Equipo y datos fijados">
          El informe ya se envió, así que la actividad y sus delegados no se pueden cambiar.
        </Callout>
      )}

      <Surface sx={{ containerType: "inline-size" }}>
        <SectionHeader title="Datos de la actividad" />
        <Box
          component="dl"
          sx={{ m: 0, display: "grid", gridTemplateColumns: "1fr", columnGap: 4, rowGap: 1.5, "@container (min-width: 640px)": { gridTemplateColumns: "1fr 1fr" } }}
        >
          <DetailRow label="Fecha" value={formatDate(activity.activityDate)} numeric />
          <DetailRow label="Fase" value={activity.phaseName} />
          <DetailRow label="Distrito" value={districtLine(activity)} />
          <DetailRow label="Departamento" value={activity.departmentName} />
          <DetailRow label="Lugar" value={activity.placeName} />
          <DetailRow label="Dirección" value={activity.address} />
          {activity.electionType && <DetailRow label="Elección" value={ELECTION_TYPE_LABELS[activity.electionType]} />}
          <DetailRow label="Indicaciones" value={activity.notes} />
        </Box>
      </Surface>

      <Surface>
        <SectionHeader
          title="Equipo"
          subtitle={
            <Box component="span" sx={{ fontVariantNumeric: "tabular-nums" }}>
              {activity.delegates.length === 1 ? "1 delegado" : `${activity.delegates.length} delegados`} · entregan un solo informe
            </Box>
          }
        />
        {activity.delegates.length === 0 ? (
          <Typography variant="body2" sx={{ mb: canEditTeam ? 2 : 0 }}>
            Todavía no hay delegados en esta actividad.
          </Typography>
        ) : (
          <Stack spacing={2.25} sx={{ mb: canEditTeam ? 2.5 : 0 }}>
            {DELEGATE_GROUPS.map(({ type, title }) => {
              const members = activity.delegates.filter((d) => d.delegateType === type);
              if (members.length === 0) return null;
              return (
                <Box key={type}>
                  <Typography
                    variant="caption"
                    component="h3"
                    sx={{ m: 0, mb: 0.75, fontWeight: 700, color: designTokens.textSecondary, fontVariantNumeric: "tabular-nums" }}
                  >
                    {title} · {members.length}
                  </Typography>
                  <Box component="ul" sx={{ m: 0, p: 0, listStyle: "none" }}>
                    {members.map((d) => (
                      <Stack
                        key={d.id}
                        component="li"
                        direction="row"
                        alignItems="center"
                        gap={1.5}
                        sx={{ py: 1.25, borderTop: "1px solid rgba(15, 23, 42, 0.06)", "&:first-of-type": { borderTop: "none", pt: 0.5 } }}
                      >
                        <DelegateAvatar name={d.fullName} size={34} />
                        <Typography variant="body2" sx={{ flex: 1, minWidth: 0, color: "text.primary", fontWeight: 600 }} noWrap>
                          {d.fullName}
                        </Typography>
                        {canEditTeam && (
                          <Tooltip title="Quitar del equipo">
                            <IconButton
                              size="small"
                              aria-label={`Quitar a ${d.fullName}`}
                              onClick={() => setToRemove(d)}
                              disabled={removeMutation.isPending}
                              sx={{ color: designTokens.status.error.fg }}
                            >
                              <PersonRemoveOutlinedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                    ))}
                  </Box>
                </Box>
              );
            })}
          </Stack>
        )}
        {canEditTeam && (
          <AddDelegateForm
            activityId={activityId}
            periodId={activity.electoralPeriodId}
            activityDate={activity.activityDate}
            current={activity.delegates}
            onAdded={(name) => {
              refresh();
              showToast("success", `${name} se sumó al equipo.`);
            }}
            onError={(msg) => showToast("error", msg)}
          />
        )}
      </Surface>

      <Surface>
        <SectionHeader
          title="Informe"
          actions={
            <Button variant={form ? "contained" : "outlined"} startIcon={<ArticleOutlinedIcon />} onClick={() => navigate(feRoutes.informe(activityId), { state: { from: { path: feRoutes.actividad(activityId), label: "Actividad" } } })}>
              {form ? "Abrir informe" : "Ver informe"}
            </Button>
          }
        />
        {formQuery.isLoading ? (
          <Skeleton height={34} />
        ) : !form ? (
          <Typography variant="body2">Ningún delegado lo ha iniciado todavía.</Typography>
        ) : (
          <Box component="dl" sx={{ m: 0, display: "grid", rowGap: 1.5 }}>
            <DetailRow label="Estado" value={<EstadoActaChip estado={form.status} />} />
            <DetailRow label="Número" value={form.formNumber} numeric />
            <DetailRow label="Enviado" value={form.submittedAt ? `${formatDateTime(form.submittedAt)}${form.submittedByName ? ` · ${form.submittedByName}` : ""}` : null} numeric />
            <DetailRow label="Última edición" value={formatDateTime(form.updatedAt)} numeric />
          </Box>
        )}
      </Surface>

      {canManage && (
        <ActividadFormDialog
          open={editOpen}
          activity={activity}
          period={period}
          phases={fasesQuery.data ?? []}
          onClose={() => setEditOpen(false)}
          onSaved={(saved) => {
            queryClient.setQueryData(["actividades", activityId], saved);
            setEditOpen(false);
            showToast("success", "Actividad actualizada.");
          }}
        />
      )}

      <ConfirmacionAccion
        open={confirmToggle}
        titulo={activity.active ? "Cancelar actividad" : "Reactivar actividad"}
        descripcion={
          activity.active
            ? "La actividad quedará cancelada y su equipo dejará de verla como pendiente."
            : "La actividad vuelve a quedar programada para su equipo."
        }
        variant={activity.active ? "destructive" : "default"}
        confirmLabel={activity.active ? "Cancelar actividad" : "Reactivar"}
        loading={toggleMutation.isPending}
        onConfirm={() => {
          setConfirmToggle(false);
          toggleMutation.mutate();
        }}
        onCancel={() => setConfirmToggle(false)}
      />

      <ConfirmacionAccion
        open={!!toRemove}
        titulo="Quitar delegado"
        descripcion={toRemove ? `${toRemove.fullName} dejará de ver esta actividad y su informe.` : undefined}
        variant="destructive"
        confirmLabel="Quitar"
        onConfirm={() => {
          if (toRemove) removeMutation.mutate(toRemove);
          setToRemove(null);
        }}
        onCancel={() => setToRemove(null)}
      />

      <ToastSnackbar toast={toast} onClose={closeToast} autoHideDuration={toast?.severity === "error" ? 9000 : 4000} />
    </Stack>
  );
}

/**
 * Agregar un delegado, uno a la vez. La lista viene con la disponibilidad
 * del dia de la actividad: quien ya esta en otra actividad activa esa fecha
 * aparece deshabilitado con el lugar donde esta. Para trasladarlo hay que
 * quitarlo primero de aquella actividad.
 */
function AddDelegateForm({
  activityId,
  periodId,
  activityDate,
  current,
  onAdded,
  onError,
}: {
  activityId: number;
  periodId: number;
  activityDate: string;
  current: ActivityDelegateDto[];
  onAdded: (name: string) => void;
  onError: (message: string) => void;
}) {
  const [type, setType] = useState<ActivityDelegateType>("TEMPORARY");
  const [selected, setSelected] = useState<DelegateAvailabilityDto | null>(null);
  const disponibilidad = useDelegadosDisponibles(periodId, activityDate);

  // Los que ya estan en este equipo no se ofrecen (saldrian "ocupados" en esta misma actividad).
  const inTeam = new Set(current.map(delegateKey));
  const options = (disponibilidad.data ?? []).filter(
    (d) => d.delegateType === type && !inTeam.has(delegateKey(d)) && d.busyIn?.activityId !== activityId
  );
  const busyCount = options.filter((d) => !d.available).length;

  const mutation = useMutation({
    mutationFn: (d: DelegateAvailabilityDto) =>
      activityApi.agregarDelegado(activityId, d.delegateType === "TEMPORARY" ? { temporaryDelegateId: d.delegateId } : { userId: d.delegateId }),
    onSuccess: (_, d) => {
      setSelected(null);
      onAdded(d.fullName);
    },
    onError: (error) => onError(getApiErrorMessage(error, "No se pudo agregar al delegado.")),
  });

  return (
    <Box sx={{ pt: 2, borderTop: "1px solid rgba(15, 23, 42, 0.06)" }}>
      <Typography variant="body2" sx={{ color: "text.primary", fontWeight: 600, mb: 1.25 }}>
        Agregar al equipo
      </Typography>
      <Box sx={{ mb: 1.25, maxWidth: 360 }}>
        <SegmentedControl<ActivityDelegateType>
          ariaLabel="Tipo de delegado"
          options={DELEGATE_GROUPS.map((g) => ({ value: g.type, label: g.short }))}
          value={type}
          onChange={(t) => {
            setType(t);
            setSelected(null);
          }}
        />
      </Box>
      <Stack direction={{ xs: "column", sm: "row" }} gap={1.25} alignItems={{ sm: "center" }}>
        <DelegateSinglePicker
          key={type}
          placeholder={type === "TEMPORARY" ? "Busca un delegado temporal" : "Busca un DIGITADOR"}
          options={options} loading={disponibilidad.isLoading} value={selected} onChange={setSelected} />
        <Button
          variant="contained"
          startIcon={mutation.isPending ? <CircularProgress size={16} color="inherit" /> : <PersonAddAltOutlinedIcon />}
          disabled={!selected || mutation.isPending}
          onClick={() => selected && mutation.mutate(selected)}
          sx={{ flexShrink: 0 }}
        >
          Agregar
        </Button>
      </Stack>
      {disponibilidad.isError ? (
        <Typography variant="caption" component="div" sx={{ mt: 0.75, color: designTokens.status.error.fg }}>
          {getApiErrorMessage(disponibilidad.error, "No se pudo revisar quién está libre ese día.")}
        </Typography>
      ) : (
        busyCount > 0 && (
          <Typography variant="caption" component="div" sx={{ mt: 0.75 }}>
            {busyCount === 1 ? "1 delegado está ocupado" : `${busyCount} delegados están ocupados`} ese día en otra actividad. Para traerlo aquí,
            quítalo primero de aquella.
          </Typography>
        )
      )}
    </Box>
  );
}
