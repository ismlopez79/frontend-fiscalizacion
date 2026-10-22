import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Box, Button, ButtonBase, Collapse, Skeleton, Stack, TextField, Typography } from "@mui/material";
import ChevronRightIcon from "@mui/icons-material/ChevronRightRounded";
import EventBusyOutlinedIcon from "@mui/icons-material/EventBusyOutlined";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import { activityApi, activityFormApi } from "@/api/fiscalizacionFasesApi";
import { getApiErrorMessage } from "@/utils/apiError";
import { PageHeader } from "@/components/ui/PageHeader";
import { Callout } from "@/components/ui/Callout";
import { EmptyState } from "@/components/ui/EmptyState";
import { surfaceSx } from "@/components/ui/Surface";
import { EstadoActaChip } from "@/components/EstadoActaChip";
import { designTokens } from "@/theme/theme";
import { ELECTION_TYPE_LABELS } from "@/types/fiscalizacionFases";
import type { ActivityDto, ActivityFormDto } from "@/types/fiscalizacionFases";
import { ActivityStateChip, DelegateStack, districtLine, feRoutes, relativeDay } from "../fiscalizacionFasesUi";

/**
 * Pantalla de inicio del delegado: sus actividades agrupadas por dia (sin
 * fecha: de hoy a 60 dias). Cada una abre el informe compartido del equipo.
 */
export function MisActividadesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const notice = (location.state as { notice?: string } | null)?.notice;
  const [fecha, setFecha] = useState("");

  const query = useQuery({
    queryKey: ["actividades", "mias", fecha || null],
    queryFn: () => activityApi.getMias(fecha || undefined),
  });

  const activities = useMemo(
    () => [...(query.data ?? [])].sort((a, b) => a.activityDate.localeCompare(b.activityDate) || a.placeName.localeCompare(b.placeName)),
    [query.data]
  );

  // Estado del informe de cada actividad (pocas por delegado): cada uno se pide por separado.
  const formQueries = useQueries({
    queries: activities.map((a) => ({
      queryKey: ["actividades", a.id, "formulario"],
      queryFn: () => activityFormApi.getFormulario(a.id),
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    })),
  });
  const formByActivity = new Map<number, { loading: boolean; form: ActivityFormDto | null }>();
  activities.forEach((a, i) => formByActivity.set(a.id, { loading: formQueries[i]?.isLoading ?? true, form: formQueries[i]?.data ?? null }));

  const groups = useMemo(() => {
    const map = new Map<string, ActivityDto[]>();
    for (const a of activities) map.set(a.activityDate, [...(map.get(a.activityDate) ?? []), a]);
    return [...map.entries()];
  }, [activities]);

  return (
    <Stack spacing={{ xs: 2, md: 2.5 }} sx={{ flexShrink: 0, pb: 2, maxWidth: 880 }}>
      <PageHeader
        title="Mis actividades"
        subtitle={fecha ? "Actividades de ese día donde estás asignado." : "Lo que tienes programado de hoy a 60 días. Toca una para abrir su informe."}
        actions={
          <Stack direction="row" alignItems="center" gap={1}>
            <TextField
              type="date"
              size="small"
              aria-label="Ver un día"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              sx={{ width: 170, "& input": { fontVariantNumeric: "tabular-nums" } }}
            />
            {fecha && (
              <Button size="small" color="inherit" onClick={() => setFecha("")}>
                Ver próximas
              </Button>
            )}
          </Stack>
        }
      />

      {notice && <Callout tone="info">{notice}</Callout>}

      <Collapse in={query.isError} unmountOnExit>
        <Callout tone="error" title="No se pudieron cargar tus actividades">
          {getApiErrorMessage(query.error, "Revisa tu conexión e inténtalo de nuevo.")}
        </Callout>
      </Collapse>

      {query.isLoading ? (
        <Stack spacing={1.25} aria-busy="true">
          <Skeleton width={120} />
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} variant="rounded" height={104} sx={{ borderRadius: "20px" }} />
          ))}
        </Stack>
      ) : activities.length === 0 && !query.isError ? (
        <Box sx={{ ...surfaceSx }}>
          <EmptyState
            icon={<EventBusyOutlinedIcon />}
            title={fecha ? "No tienes actividades ese día" : "No tienes actividades programadas"}
            hint="Cuando la administración te asigne a una actividad aparecerá aquí, con su informe listo para llenar."
          />
        </Box>
      ) : (
        groups.map(([date, items]) => (
          <Box component="section" key={date} aria-label={relativeDay(date)}>
            <Stack direction="row" alignItems="baseline" gap={1} sx={{ mb: 1.25, px: 0.5 }}>
              <Typography component="h2" sx={{ fontWeight: 800, fontSize: "1rem", letterSpacing: "-0.01em", color: "text.primary" }}>
                {relativeDay(date)}
              </Typography>
              <Typography variant="caption" sx={{ fontVariantNumeric: "tabular-nums" }}>
                {date.split("-").reverse().join("/")}
              </Typography>
            </Stack>
            <Stack spacing={1.25}>
              {items.map((a) => (
                <ActivityRow
                  key={a.id}
                  activity={a}
                  formState={formByActivity.get(a.id)}
                  onOpen={() => navigate(feRoutes.informe(a.id))}
                />
              ))}
            </Stack>
          </Box>
        ))
      )}
    </Stack>
  );
}

function ActivityRow({
  activity: a,
  formState,
  onOpen,
}: {
  activity: ActivityDto;
  formState?: { loading: boolean; form: ActivityFormDto | null };
  onOpen: () => void;
}) {
  let status;
  if (!a.active) status = <ActivityStateChip active={false} />;
  else if (!formState || formState.loading) status = <Skeleton variant="rounded" width={96} height={24} sx={{ borderRadius: 999 }} />;
  else if (formState.form) status = <EstadoActaChip estado={formState.form.status} />;
  else
    status = (
      <Box
        component="span"
        sx={{
          display: "inline-flex",
          alignItems: "center",
          height: 24,
          px: 1,
          borderRadius: 999,
          fontSize: "0.75rem",
          fontWeight: 700,
          color: designTokens.accentHover,
          bgcolor: designTokens.accentSoft,
        }}
      >
        Por iniciar
      </Box>
    );

  return (
    <ButtonBase
      onClick={onOpen}
      sx={{
        ...surfaceSx,
        display: "flex",
        width: "100%",
        textAlign: "left",
        alignItems: "stretch",
        gap: 2,
        p: { xs: 2, md: 2.5 },
        opacity: a.active ? 1 : 0.72,
        transition: `box-shadow 180ms ease, transform 160ms ${designTokens.easeOut}`,
        "&:active": { transform: "scale(0.99)" },
        "&.Mui-focusVisible": { boxShadow: `${designTokens.focusRing}, ${surfaceSx.boxShadow}` },
        "@media (hover: hover) and (pointer: fine)": {
          "&:hover": {
            boxShadow: "0 0 0 1px rgba(15, 23, 42, 0.06), 0 2px 4px rgba(15, 23, 42, 0.05), 0 16px 36px -16px rgba(15, 23, 42, 0.18)",
          },
          "&:hover .row-chevron": { transform: "translateX(2px)", color: designTokens.accent },
        },
      }}
    >
      <Stack spacing={0.75} sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1.5}>
          <Typography variant="caption" sx={{ letterSpacing: "0.01em" }} noWrap>
            {a.phaseName}
            {a.electionType ? ` · ${ELECTION_TYPE_LABELS[a.electionType]}` : ""}
          </Typography>
          {status}
        </Stack>
        <Typography sx={{ fontWeight: 700, fontSize: "1rem", color: "text.primary", letterSpacing: "-0.01em", textWrap: "balance" }}>
          {a.placeName}
        </Typography>
        <Stack direction="row" alignItems="center" gap={0.5} sx={{ color: designTokens.textSecondary, minWidth: 0 }}>
          <PlaceOutlinedIcon sx={{ fontSize: 16, flexShrink: 0 }} />
          <Typography variant="body2" noWrap>
            {districtLine(a)} · {a.departmentName}
          </Typography>
        </Stack>
        {a.notes && (
          <Typography variant="body2" sx={{ color: "text.primary", whiteSpace: "pre-line" }}>
            {a.notes}
          </Typography>
        )}
        <Box sx={{ pt: 0.5 }}>
          <DelegateStack names={a.delegates.map((d) => d.fullName)} max={4} />
        </Box>
      </Stack>
      <ChevronRightIcon
        className="row-chevron"
        sx={{ alignSelf: "center", color: designTokens.textDisabled, transition: `transform 180ms ${designTokens.easeOut}, color 150ms ease` }}
      />
    </ButtonBase>
  );
}
