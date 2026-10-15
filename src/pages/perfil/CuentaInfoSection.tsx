import { Box, Chip, Skeleton, Stack, Typography } from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { SectionHeader, Surface } from "@/components/ui/Surface";
import { DetailRow } from "@/components/ui/DetailRow";
import { designTokens } from "@/theme/theme";
import { formatDateTime } from "@/utils/dateFormat";
import type { MyAccountView } from "@/hooks/useMyAccount";

interface CuentaInfoSectionProps {
  profile: MyAccountView | undefined;
  loading: boolean;
  isTemporary: boolean;
}

/**
 * Datos de la cuenta que la persona puede VER pero no cambiar (los
 * administra un administrador). Se presentan como ficha de lectura, sin
 * campos deshabilitados que parezcan rotos — con un candado que explica
 * por que no se editan aqui.
 */
export function CuentaInfoSection({ profile, loading, isTemporary }: CuentaInfoSectionProps) {
  return (
    <Surface>
      <SectionHeader
        title="Información de la cuenta"
        subtitle={
          <Stack component="span" direction="row" alignItems="center" gap={0.5}>
            <LockOutlinedIcon sx={{ fontSize: 14 }} />
            Estos datos los administra un administrador. Si hay un error, contáctalo.
          </Stack>
        }
      />

      {loading || !profile ? (
        <Stack spacing={1.25}>
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} width={i % 2 ? "60%" : "75%"} />
          ))}
        </Stack>
      ) : (
        <Box
          component="dl"
          sx={{ m: 0, display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, columnGap: 4, rowGap: 1.5 }}
        >
          <DetailRow label="Nombre completo" value={profile.fullName} />
          <DetailRow label="Usuario" value={profile.username} />
          <DetailRow label="DUI" value={profile.dui} numeric />
          <DetailRow
            label="Estado"
            value={
              <Chip
                size="small"
                label={profile.active ? "Activa" : "Inactiva"}
                color={profile.active ? "success" : "default"}
              />
            }
          />
          {isTemporary ? (
            <>
              <DetailRow label="Período electoral" value={profile.electoralPeriodName} />
              <DetailRow label="Partido político" value={profile.politicalPartyName} />
            </>
          ) : (
            <>
              <DetailRow
                label="Roles"
                value={profile.roles && profile.roles.length > 0 ? profile.roles.map(formatRole).join(", ") : null}
              />
              {profile.linkedDelegateName && (
                <DetailRow label="Delegado JVE" value={profile.linkedDelegateName} />
              )}
              {profile.linkedDelegateName && (
                <DetailRow label="Partido político" value={profile.politicalPartyName} />
              )}
            </>
          )}
          <DetailRow label="Creada" value={formatDateTime(profile.createdAt)} numeric />
          <DetailRow label="Actualizada" value={formatDateTime(profile.updatedAt)} numeric />
        </Box>
      )}

      {!loading && profile && (
        <Typography variant="caption" component="div" sx={{ mt: 2, color: designTokens.textCaption, fontWeight: 500 }}>
          {isTemporary ? "Cuenta de delegado temporal." : "Cuenta de usuario permanente."}
        </Typography>
      )}
    </Surface>
  );
}

/** "DELEGADO_TEMPORAL" -> "Delegado temporal". */
function formatRole(role: string): string {
  const text = role.replace(/_/g, " ").toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}
