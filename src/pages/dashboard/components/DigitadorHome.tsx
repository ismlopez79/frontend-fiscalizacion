import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Box, Button, ButtonBase, Divider, Skeleton, Stack, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/AddRounded";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import { actaApi } from "@/api/actaApi";
import { EstadoActaChip } from "@/components/EstadoActaChip";
import { PageHeader } from "@/components/ui/PageHeader";
import { Callout } from "@/components/ui/Callout";
import { SectionHeader, Surface } from "@/components/ui/Surface";
import { EmptyState } from "@/components/ui/EmptyState";
import { designTokens } from "@/theme/theme";
import { formatDate } from "@/utils/dateFormat";

/**
 * Inicio de quien no ve el dashboard de metricas (REPORT_VIEW): accesos
 * directos a lo que si puede hacer y sus actas recientes para retomar el
 * trabajo sin pasar por el listado. No le pega a /dashboard/* (403).
 */
export function DigitadorHome({ fullName }: { fullName: string }) {
  const navigate = useNavigate();
  const firstName = fullName.split(" ")[0] || fullName;

  const recientesQuery = useQuery({
    queryKey: ["actas", "mias", "recientes"],
    queryFn: () => actaApi.getActas({ createdByMe: true }, 0, 5),
  });
  const recientes = recientesQuery.data?.content ?? [];

  // Actas devueltas por el revisor: se corrigen y se reenvian (rechazar ya no es definitivo).
  const rechazadasQuery = useQuery({
    queryKey: ["actas", "mias", "por-corregir", "RECHAZADA"],
    queryFn: () => actaApi.getActas({ createdByMe: true, status: "RECHAZADA" }, 0, 1),
  });
  const observadasQuery = useQuery({
    queryKey: ["actas", "mias", "por-corregir", "OBSERVADA"],
    queryFn: () => actaApi.getActas({ createdByMe: true, status: "OBSERVADA" }, 0, 1),
  });
  const rechazadas = rechazadasQuery.data?.totalElements ?? 0;
  const observadas = observadasQuery.data?.totalElements ?? 0;

  return (
    <Stack spacing={{ xs: 2, md: 2.5 }} sx={{ flexShrink: 0, pb: 2, maxWidth: 880, width: "100%" }}>
      <PageHeader title={`Hola, ${firstName}`} subtitle="Desde aquí puedes crear tus actas y darles seguimiento." />

      {(rechazadas > 0 || observadas > 0) && (
        <Callout
          tone={rechazadas > 0 ? "error" : "warning"}
          title={
            rechazadas + observadas === 1 ? "Tienes 1 acta por corregir" : `Tienes ${rechazadas + observadas} actas por corregir`
          }
        >
          El revisor te las devolvió con un comentario. Corrígelas y reenvíalas a revisión.
          <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 1 }}>
            {rechazadas > 0 && (
              <Button size="small" variant="outlined" color="error" onClick={() => navigate("/actas?estado=RECHAZADA")}>
                {rechazadas === 1 ? "Ver 1 rechazada" : `Ver ${rechazadas} rechazadas`}
              </Button>
            )}
            {observadas > 0 && (
              <Button size="small" variant="outlined" color="warning" onClick={() => navigate("/actas?estado=OBSERVADA")}>
                {observadas === 1 ? "Ver 1 observada" : `Ver ${observadas} observadas`}
              </Button>
            )}
          </Stack>
        </Callout>
      )}

      <Surface sx={{ py: { xs: 0.5, md: 1 } }}>
        <Stack divider={<Divider flexItem sx={{ borderColor: "rgba(15, 23, 42, 0.06)" }} />}>
          <ActionRow
            primary
            icon={<AddIcon />}
            title="Nueva acta"
            description="Captura una nueva acta con sus producciones y adjunta las fotos del papel físico."
            onClick={() => navigate("/actas/nueva")}
          />
          <ActionRow
            icon={<DescriptionOutlinedIcon />}
            title="Mis actas"
            description="Consulta el estado de tus actas, corrige las observadas o rechazadas y envíalas a revisión."
            onClick={() => navigate("/actas")}
          />
        </Stack>
      </Surface>

      {!recientesQuery.isError && (
        <Surface>
          <SectionHeader
            title="Tus actas recientes"
            actions={
              recientes.length > 0 && (
                <Button size="small" endIcon={<ChevronRightRoundedIcon />} onClick={() => navigate("/actas")}>
                  Ver todas
                </Button>
              )
            }
          />
          {recientesQuery.isLoading ? (
            <Stack spacing={1}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} height={48} />
              ))}
            </Stack>
          ) : recientes.length === 0 ? (
            <EmptyState
              icon={<DescriptionOutlinedIcon />}
              title="Aún no tienes actas"
              hint="Cuando crees tu primera acta aparecerá aquí para retomarla rápido."
            />
          ) : (
            <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, mx: -1 }}>
              {recientes.map((acta) => (
                <Box component="li" key={acta.id}>
                  <ButtonBase
                    onClick={() => navigate(`/actas/${acta.id}`)}
                    sx={{
                      width: "100%",
                      justifyContent: "flex-start",
                      textAlign: "left",
                      gap: 1.5,
                      px: 1,
                      py: 1.25,
                      borderRadius: "12px",
                      transition: "background-color 120ms ease",
                      "@media (hover: hover) and (pointer: fine)": { "&:hover": { bgcolor: "rgba(15, 23, 42, 0.03)" } },
                      "&.Mui-focusVisible": { boxShadow: designTokens.focusRing },
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: "text.primary", fontVariantNumeric: "tabular-nums" }}>
                        {acta.actaNumber}
                      </Typography>
                      <Typography variant="body2" noWrap>
                        {acta.duicentroName} · {formatDate(acta.actaDate)}
                      </Typography>
                    </Box>
                    <EstadoActaChip estado={acta.status} />
                    <ChevronRightRoundedIcon sx={{ color: designTokens.textDisabled, flexShrink: 0 }} />
                  </ButtonBase>
                </Box>
              ))}
            </Box>
          )}
        </Surface>
      )}
    </Stack>
  );
}

function ActionRow({
  icon,
  title,
  description,
  onClick,
  primary,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <ButtonBase
      onClick={onClick}
      sx={{
        width: "100%",
        justifyContent: "flex-start",
        textAlign: "left",
        gap: 1.75,
        py: 2.25,
        px: 1,
        mx: -1,
        borderRadius: "14px",
        transition: `background-color 120ms ease, transform 160ms ${designTokens.easeOut}`,
        "&:active": { transform: "scale(0.99)" },
        "@media (hover: hover) and (pointer: fine)": { "&:hover": { bgcolor: "rgba(15, 23, 42, 0.03)" } },
        "&.Mui-focusVisible": { boxShadow: designTokens.focusRing },
      }}
    >
      <Box
        sx={{
          width: 46,
          height: 46,
          borderRadius: "13px",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: primary ? designTokens.accent : designTokens.accentSoft,
          color: primary ? "#FFFFFF" : designTokens.accent,
          boxShadow: primary ? "0 6px 16px -6px rgba(37, 99, 235, 0.55)" : "none",
        }}
      >
        {icon}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontWeight: 700, color: "text.primary", fontSize: "0.9375rem" }}>{title}</Typography>
        <Typography variant="body2" sx={{ mt: 0.25 }}>
          {description}
        </Typography>
      </Box>
      <ChevronRightRoundedIcon sx={{ color: designTokens.textDisabled, flexShrink: 0 }} />
    </ButtonBase>
  );
}
