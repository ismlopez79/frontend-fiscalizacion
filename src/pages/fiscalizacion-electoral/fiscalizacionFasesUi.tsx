import type { ReactNode } from "react";
import { Box, Stack, Typography } from "@mui/material";
import { DetailRow } from "@/components/ui/DetailRow";
import { designTokens } from "@/theme/theme";
import { formatDate } from "@/utils/dateFormat";
import { ELECTION_TYPE_LABELS, TEMPLATE_STATUS_LABELS } from "@/types/fiscalizacionFases";
import type { ActivityDto, ActivityFormDelegate, TemplateStatus } from "@/types/fiscalizacionFases";

/** Raiz de las rutas del modulo "Fiscalización electoral". */
export const FE = "/fiscalizacion-electoral";

export const feRoutes = {
  misActividades: `${FE}/mis-actividades`,
  actividades: `${FE}/actividades`,
  actividad: (id: number) => `${FE}/actividades/${id}`,
  informe: (id: number) => `${FE}/actividades/${id}/informe`,
  informes: `${FE}/informes`,
  fases: `${FE}/fases`,
  plantillas: `${FE}/plantillas`,
  plantilla: (id: number) => `${FE}/plantillas/${id}`,
  plantillaNueva: `${FE}/plantillas/nueva`,
};

/** Delegado temporal o permanente (DIGITADOR): llenan informes de sus actividades. */
export const DELEGATE_ROLES = ["DELEGADO_TEMPORAL", "DIGITADOR"];
export const REVIEWER_ROLES = ["ADMINISTRADOR", "SUPERVISOR"];

/** "San Salvador, San Salvador Centro" — distrito y municipio; el departamento va aparte. */
export function districtLine(a: Pick<ActivityDto, "districtName" | "municipalityName">): string {
  return a.districtName === a.municipalityName ? a.districtName : `${a.districtName}, ${a.municipalityName}`;
}

const dayFormatter = new Intl.DateTimeFormat("es-SV", { weekday: "long", day: "numeric", month: "long" });

/** "Hoy", "Mañana" o "jueves 14 de febrero". */
export function relativeDay(isoDate: string, today = new Date()): string {
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diff = Math.round((d.getTime() - start.getTime()) / 86_400_000);
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Mañana";
  if (diff === -1) return "Ayer";
  const text = dayFormatter.format(d);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function Pill({ bg, fg, children, strike }: { bg: string; fg: string; children: ReactNode; strike?: boolean }) {
  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.625,
        height: 24,
        px: 1,
        borderRadius: 999,
        bgcolor: bg,
        color: fg,
        fontSize: "0.75rem",
        fontWeight: 700,
        whiteSpace: "nowrap",
        textDecoration: strike ? "line-through" : undefined,
      }}
    >
      {children}
    </Box>
  );
}

export function ActivityStateChip({ active }: { active: boolean }) {
  return active ? (
    <Pill bg={designTokens.status.success.bg} fg={designTokens.status.success.fg}>
      Programada
    </Pill>
  ) : (
    <Pill bg="#F1F5F9" fg="#475569" strike>
      Cancelada
    </Pill>
  );
}

const TEMPLATE_STATUS_TONE: Record<TemplateStatus, { bg: string; fg: string }> = {
  BORRADOR: { bg: "#F1F5F9", fg: "#475569" },
  PUBLICADA: designTokens.status.success,
  ARCHIVADA: { bg: "#F1F5F9", fg: "#64748B" },
};

export function TemplateStatusChip({ status }: { status: TemplateStatus }) {
  const tone = TEMPLATE_STATUS_TONE[status];
  return (
    <Pill bg={tone.bg} fg={tone.fg}>
      {TEMPLATE_STATUS_LABELS[status]}
    </Pill>
  );
}

/** Iniciales para el avatar de un delegado (sin foto: la lista de equipo es solo nombres). */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

export function DelegateAvatar({ name, size = 28 }: { name: string; size?: number }) {
  return (
    <Box
      aria-hidden
      sx={{
        width: size,
        height: size,
        borderRadius: "50%",
        flexShrink: 0,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: designTokens.accentSoft,
        color: designTokens.accentHover,
        fontSize: size * 0.4,
        fontWeight: 800,
        letterSpacing: "-0.02em",
        boxShadow: "0 0 0 2px #FFFFFF",
      }}
    >
      {initials(name)}
    </Box>
  );
}

/** Pila de avatares (+N) para listas densas. */
export function DelegateStack({ names, max = 3 }: { names: string[]; max?: number }) {
  if (names.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: designTokens.textDisabled }}>
        Sin delegados
      </Typography>
    );
  }
  const shown = names.slice(0, max);
  return (
    <Stack direction="row" alignItems="center" gap={1} sx={{ minWidth: 0 }} title={names.join(", ")}>
      <Stack direction="row" sx={{ "& > *:not(:first-of-type)": { ml: -0.75 } }}>
        {shown.map((n, i) => (
          <DelegateAvatar key={`${i}-${n}`} name={n} size={26} />
        ))}
      </Stack>
      <Typography variant="body2" noWrap sx={{ minWidth: 0 }}>
        {names.length === 1 ? names[0] : `${names.length} delegados`}
      </Typography>
    </Stack>
  );
}

/**
 * Encabezado del informe: lo que NO viene en la plantilla (fecha, lugar,
 * distrito, delegados) sale de la actividad.
 */
export function ActivityFacts({
  activity,
  delegates,
  delegatesNote,
}: {
  activity: ActivityDto;
  delegates?: ActivityFormDelegate[];
  delegatesNote?: ReactNode;
}) {
  const team = delegates ?? activity.delegates;
  return (
    <Box>
      <Box
        component="dl"
        sx={{
          m: 0,
          display: "grid",
          gridTemplateColumns: "1fr",
          columnGap: 4,
          rowGap: 1.5,
          "@container (min-width: 640px)": { gridTemplateColumns: "1fr 1fr" },
        }}
      >
        <DetailRow label="Fecha" value={formatDate(activity.activityDate)} numeric />
        <DetailRow label="Fase" value={activity.phaseName} />
        <DetailRow label="Lugar" value={activity.placeName} />
        <DetailRow label="Dirección" value={activity.address} />
        <DetailRow label="Distrito" value={districtLine(activity)} />
        <DetailRow label="Departamento" value={activity.departmentName} />
        {activity.electionType && <DetailRow label="Elección" value={ELECTION_TYPE_LABELS[activity.electionType]} />}
        {activity.notes && <DetailRow label="Indicaciones" value={activity.notes} />}
      </Box>
      <Box sx={{ mt: 2.5, pt: 2, borderTop: "1px solid rgba(15, 23, 42, 0.06)" }}>
        <Stack direction="row" alignItems="baseline" justifyContent="space-between" gap={1} sx={{ mb: 1.25 }}>
          <Typography variant="body2" sx={{ color: designTokens.textCaption }}>
            Delegados
          </Typography>
          {delegatesNote}
        </Stack>
        {team.length === 0 ? (
          <Typography variant="body2" sx={{ color: designTokens.textDisabled }}>
            Sin delegados asignados.
          </Typography>
        ) : (
          <Stack direction="row" flexWrap="wrap" gap={1}>
            {team.map((d) => (
              <Stack
                key={`${d.delegateType}-${d.delegateId}`}
                direction="row"
                alignItems="center"
                gap={0.875}
                sx={{ pl: 0.5, pr: 1.25, height: 34, borderRadius: 999, bgcolor: "rgba(15, 23, 42, 0.04)" }}
              >
                <DelegateAvatar name={d.fullName} size={26} />
                <Typography variant="body2" sx={{ color: "text.primary", fontWeight: 600 }}>
                  {d.fullName}
                </Typography>
                {d.delegateType === "PERMANENT" && (
                  <Typography variant="caption" sx={{ color: designTokens.textCaption }}>
                    · Permanente
                  </Typography>
                )}
              </Stack>
            ))}
          </Stack>
        )}
      </Box>
    </Box>
  );
}
