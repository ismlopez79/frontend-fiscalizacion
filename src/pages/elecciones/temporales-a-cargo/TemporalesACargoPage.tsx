import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Autocomplete,
  Box,
  Button,
  ButtonBase,
  Chip,
  Collapse,
  IconButton,
  Paper,
  Skeleton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/AddRounded";
import ExpandMoreIcon from "@mui/icons-material/ExpandMoreRounded";
import PersonRemoveIcon from "@mui/icons-material/PersonRemoveOutlined";
import SupervisorAccountIcon from "@mui/icons-material/SupervisorAccountOutlined";
import { temporaryDelegateApi, traineeAssignmentApi } from "@/api/electoralApi";
import { userApi } from "@/api/userApi";
import { PageHeader } from "@/components/ui/PageHeader";
import { Callout } from "@/components/ui/Callout";
import { EmptyState } from "@/components/ui/EmptyState";
import { FloatingToolbar } from "@/components/ui/FloatingToolbar";
import { getApiErrorMessage } from "@/utils/apiError";
import { ConfirmacionAccion } from "@/components/ConfirmacionAccion";
import { useToast } from "@/hooks/useToast";
import { ToastSnackbar } from "@/components/ToastSnackbar";
import { designTokens } from "@/theme/theme";
import { DIGITADOR_ROLE_NAME } from "@/types/user";
import type { TraineeAssignmentDto } from "@/types/electoral";
import { TemporalACargoFormDialog } from "./TemporalACargoFormDialog";

interface PermanenteGroup {
  userId: number;
  userFullName: string;
  temporales: TraineeAssignmentDto[];
}

/**
 * Quien tiene a cargo a quien: cada delegado permanente (DIGITADOR) solo
 * puede marcar como acompañantes de su acta a los temporales que tenga aqui.
 * Una fila por permanente con su cantidad de temporales; al presionarla se
 * despliega el detalle. El listado completo se trae una vez y se agrupa aqui.
 */
export function TemporalesACargoPage() {
  const queryClient = useQueryClient();
  const { toast, showToast, closeToast } = useToast();

  const [userFilter, setUserFilter] = useState<number | null>(null);
  const [expandedUserId, setExpandedUserId] = useState<number | null>(null);
  // undefined = cerrado; null = abierto sin permanente elegido.
  const [dialogUserId, setDialogUserId] = useState<number | null | undefined>(undefined);
  const [toRemove, setToRemove] = useState<TraineeAssignmentDto | null>(null);

  const aCargoQuery = useQuery({
    queryKey: ["delegados-a-cargo"],
    queryFn: () => traineeAssignmentApi.getDelegadosACargo(),
  });

  const usuariosQuery = useQuery({
    queryKey: ["usuarios"],
    queryFn: userApi.getUsuarios,
  });
  const digitadores = useMemo(
    () => (usuariosQuery.data ?? []).filter((u) => u.active && u.roles.includes(DIGITADOR_ROLE_NAME)),
    [usuariosQuery.data]
  );

  const temporalesQuery = useQuery({
    queryKey: ["delegados-temporales", null],
    queryFn: () => temporaryDelegateApi.getDelegadosTemporales(),
  });
  const temporalesActivos = useMemo(
    () => (temporalesQuery.data ?? []).filter((d) => d.active),
    [temporalesQuery.data]
  );

  const removeMutation = useMutation({
    mutationFn: (id: number) => traineeAssignmentApi.quitar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delegados-a-cargo"] });
      showToast("success", "Listo: ya no lo tiene a cargo.");
    },
    onError: (error) => showToast("error", getApiErrorMessage(error, "No se pudo quitar al delegado temporal.")),
  });

  const groups = useMemo(() => {
    const byUser = new Map<number, PermanenteGroup>();
    (aCargoQuery.data ?? []).forEach((a) => {
      if (userFilter !== null && a.userId !== userFilter) return;
      const group = byUser.get(a.userId) ?? { userId: a.userId, userFullName: a.userFullName, temporales: [] };
      group.temporales.push(a);
      byUser.set(a.userId, group);
    });
    const sorted = [...byUser.values()].sort((a, b) => a.userFullName.localeCompare(b.userFullName, "es"));
    sorted.forEach((g) =>
      g.temporales.sort((a, b) => a.temporaryDelegateName.localeCompare(b.temporaryDelegateName, "es"))
    );
    return sorted;
  }, [aCargoQuery.data, userFilter]);

  return (
    <Stack spacing={{ xs: 2, md: 2.5 }} sx={{ flexShrink: 0, pb: 2 }}>
      <PageHeader
        title="Temporales a cargo"
        subtitle="Qué delegados temporales tiene a cargo cada delegado permanente (DIGITADOR). Al registrar su acta, el permanente solo puede marcar como acompañantes a los que tenga aquí. Presiona un delegado para ver a quiénes tiene."
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogUserId(userFilter)}>
            Asignar temporales
          </Button>
        }
      />

      <FloatingToolbar>
        <Autocomplete
          size="small"
          sx={{ width: { xs: "100%", sm: 340 } }}
          options={digitadores}
          loading={usuariosQuery.isLoading}
          getOptionLabel={(u) => `${u.fullName} (${u.username})`}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          value={digitadores.find((u) => u.id === userFilter) ?? null}
          onChange={(_, selected) => setUserFilter(selected?.id ?? null)}
          renderInput={(params) => (
            <TextField {...params} label="Delegado permanente" placeholder="Todos" InputLabelProps={{ shrink: true }} />
          )}
        />
      </FloatingToolbar>

      <Collapse in={aCargoQuery.isError}>
        <Callout tone="error" title="No se pudo cargar el listado">
          {getApiErrorMessage(aCargoQuery.error, "Revisa tu conexión e inténtalo de nuevo.")}
        </Callout>
      </Collapse>

      <Paper variant="outlined" sx={{ overflow: "hidden" }}>
        {aCargoQuery.isLoading ? (
          <Stack spacing={1} sx={{ p: 2 }} aria-busy="true">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} variant="rounded" height={48} sx={{ borderRadius: "12px" }} />
            ))}
          </Stack>
        ) : groups.length === 0 ? (
          <EmptyState
            icon={<SupervisorAccountIcon />}
            title={userFilter === null ? "Nadie tiene temporales a cargo todavía" : "Este delegado no tiene temporales a cargo"}
            hint="Usa «Asignar temporales» para ponerle a un delegado permanente los temporales que lo acompañan."
          />
        ) : (
          groups.map((group, index) => {
            const expanded = expandedUserId === group.userId;
            const panelId = `temporales-a-cargo-${group.userId}`;
            const count = group.temporales.length;
            return (
              <Box key={group.userId} sx={{ borderTop: index === 0 ? "none" : "1px solid rgba(15, 23, 42, 0.06)" }}>
                <ButtonBase
                  aria-expanded={expanded}
                  aria-controls={panelId}
                  onClick={() => setExpandedUserId(expanded ? null : group.userId)}
                  sx={{
                    width: "100%",
                    px: 2,
                    py: 1.5,
                    gap: 1.5,
                    justifyContent: "flex-start",
                    textAlign: "left",
                    transition: "background-color 120ms ease",
                    "@media (hover: hover) and (pointer: fine)": {
                      "&:hover": { bgcolor: "rgba(15, 23, 42, 0.03)" },
                    },
                    "&:focus-visible": { boxShadow: `inset ${designTokens.focusRing}` },
                  }}
                >
                  <Typography variant="body2" noWrap sx={{ flex: 1, minWidth: 0, fontWeight: 700, color: "text.primary" }}>
                    {group.userFullName}
                  </Typography>
                  <Chip
                    size="small"
                    label={count === 1 ? "1 temporal" : `${count} temporales`}
                    sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}
                  />
                  <ExpandMoreIcon
                    sx={{
                      color: designTokens.textCaption,
                      transition: `transform 200ms ${designTokens.easeOut}`,
                      transform: expanded ? "rotate(180deg)" : "none",
                    }}
                  />
                </ButtonBase>

                <Collapse in={expanded} unmountOnExit>
                  <Box id={panelId} sx={{ px: 2, pb: 1.5, bgcolor: "rgba(15, 23, 42, 0.02)" }}>
                    <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
                      {group.temporales.map((t) => (
                        <Stack
                          component="li"
                          key={t.id}
                          direction="row"
                          alignItems="center"
                          gap={1.5}
                          sx={{ py: 1, borderTop: "1px solid rgba(15, 23, 42, 0.05)", "&:first-of-type": { borderTop: "none" } }}
                        >
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" noWrap sx={{ fontWeight: 600, color: "text.primary" }}>
                              {t.temporaryDelegateName}
                            </Typography>
                            <Typography variant="caption" noWrap component="div" sx={{ fontVariantNumeric: "tabular-nums" }}>
                              DUI {t.temporaryDelegateDui} · {t.politicalPartyName ?? "Sin partido"}
                            </Typography>
                          </Box>
                          <Tooltip title="Quitárselo">
                            <span>
                              <IconButton
                                size="small"
                                color="error"
                                aria-label={`Quitar a ${t.temporaryDelegateName} de ${group.userFullName}`}
                                disabled={removeMutation.isPending}
                                onClick={() => setToRemove(t)}
                              >
                                <PersonRemoveIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Stack>
                      ))}
                    </Box>
                    <Button size="small" startIcon={<AddIcon />} onClick={() => setDialogUserId(group.userId)} sx={{ mt: 0.5 }}>
                      Asignarle otro temporal
                    </Button>
                  </Box>
                </Collapse>
              </Box>
            );
          })
        )}
      </Paper>

      <TemporalACargoFormDialog
        open={dialogUserId !== undefined}
        digitadores={digitadores}
        temporales={temporalesActivos}
        aCargo={aCargoQuery.data ?? []}
        defaultUserId={dialogUserId ?? null}
        onClose={() => setDialogUserId(undefined)}
        onAssigned={(count) =>
          showToast("success", count === 1 ? "Delegado temporal asignado." : `${count} delegados temporales asignados.`)
        }
      />

      <ConfirmacionAccion
        open={!!toRemove}
        titulo="Quitar temporal a cargo"
        descripcion={
          toRemove
            ? `"${toRemove.userFullName}" ya no podrá agregar a "${toRemove.temporaryDelegateName}" en actas nuevas. Las actas ya registradas donde figura como acompañante no cambian.`
            : undefined
        }
        variant="destructive"
        confirmLabel="Quitar"
        loading={removeMutation.isPending}
        onConfirm={() => {
          if (toRemove) removeMutation.mutate(toRemove.id);
          setToRemove(null);
        }}
        onCancel={() => setToRemove(null)}
      />

      <ToastSnackbar toast={toast} onClose={closeToast} />
    </Stack>
  );
}
