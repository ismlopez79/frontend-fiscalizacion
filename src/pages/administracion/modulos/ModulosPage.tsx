import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, Box, Chip, Collapse, Paper, Skeleton, Stack, Switch, Typography } from "@mui/material";
import dayjs from "dayjs";
import { modulosApi } from "@/api/modulosApi";
import { getApiErrorMessage } from "@/utils/apiError";
import { useModulos, MODULOS_QUERY_KEY } from "@/hooks/useModulos";
import { ConfirmacionAccion } from "@/components/ConfirmacionAccion";
import { useToast } from "@/hooks/useToast";
import { ToastSnackbar } from "@/components/ToastSnackbar";
import type { ModuloDto } from "@/types/modulo";

/**
 * Textos de confirmacion por modulo — hoy solo ELECTIONS, pero el resto de
 * la pantalla ya itera sobre la lista completa que devuelva el backend.
 */
function confirmationCopy(modulo: ModuloDto, turningOn: boolean): string {
  if (modulo.code === "ELECTIONS") {
    return turningOn
      ? "Se permitirá el inicio de sesión de delegados temporales y la creación/revisión de formularios de fiscalización electoral. Requiere que exista un periodo electoral activo."
      : "Los delegados temporales no podrán iniciar sesión y, si tenían sesión abierta, se cerrará en su siguiente acción. Los delegados permanentes (digitadores, supervisores, administradores) perderán acceso a crear, editar y revisar formularios de fiscalización electoral. La preparación de la próxima elección (períodos, delegados temporales, centros de servicio, asignaciones) seguirá disponible para el administrador.";
  }
  return turningOn ? "¿Habilitar este módulo?" : "¿Deshabilitar este módulo?";
}

export function ModulosPage() {
  const queryClient = useQueryClient();
  const { modules, isLoading, isError, error } = useModulos();
  const { toast, showToast, closeToast } = useToast();
  const [pendingToggle, setPendingToggle] = useState<ModuloDto | null>(null);

  const toggleMutation = useMutation({
    mutationFn: (modulo: ModuloDto) => modulosApi.updateModulo(modulo.code, { enabled: !modulo.enabled }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: MODULOS_QUERY_KEY });
      showToast(
        "success",
        updated.enabled ? `Módulo "${updated.name}" habilitado.` : `Módulo "${updated.name}" deshabilitado.`
      );
      setPendingToggle(null);
    },
    onError: (err) => showToast("error", getApiErrorMessage(err, "No se pudo cambiar el estado del módulo.")),
  });

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h3">Módulos del sistema</Typography>
        <Typography variant="body2" color="text.secondary">
          Enciende o apaga módulos completos de la aplicación. Apagar un módulo no borra ningún dato — solo
          restringe el acceso mientras esté apagado.
        </Typography>
      </Box>

      <Collapse in={isError}>
        <Alert severity="error">{getApiErrorMessage(error, "No se pudo cargar la lista de módulos.")}</Alert>
      </Collapse>

      {isLoading ? (
        <Stack spacing={2}>
          <Skeleton variant="rounded" height={110} />
          <Skeleton variant="rounded" height={110} />
        </Stack>
      ) : (
        <Stack spacing={2}>
          {modules.map((modulo) => (
            <Paper key={modulo.code} variant="outlined" sx={{ p: 3 }}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                alignItems={{ xs: "flex-start", sm: "center" }}
                justifyContent="space-between"
              >
                <Box sx={{ minWidth: 0 }}>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" rowGap={0.5}>
                    <Typography variant="h4">{modulo.name}</Typography>
                    <Chip
                      size="small"
                      label={modulo.enabled ? "Habilitado" : "Deshabilitado"}
                      color={modulo.enabled ? "success" : "default"}
                      variant={modulo.enabled ? "filled" : "outlined"}
                    />
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {modulo.description}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Última actualización: {dayjs(modulo.updatedAt).format("DD/MM/YYYY HH:mm")}
                  </Typography>
                </Box>

                <Switch
                  checked={modulo.enabled}
                  disabled={toggleMutation.isPending}
                  onChange={() => setPendingToggle(modulo)}
                  inputProps={{ "aria-label": `Cambiar estado de ${modulo.name}` }}
                />
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}

      <ConfirmacionAccion
        open={!!pendingToggle}
        titulo={
          pendingToggle
            ? pendingToggle.enabled
              ? `¿Deshabilitar "${pendingToggle.name}"?`
              : `¿Habilitar "${pendingToggle.name}"?`
            : ""
        }
        descripcion={pendingToggle ? confirmationCopy(pendingToggle, !pendingToggle.enabled) : undefined}
        variant={pendingToggle?.enabled ? "destructive" : "default"}
        confirmLabel={pendingToggle?.enabled ? "Deshabilitar" : "Habilitar"}
        loading={toggleMutation.isPending}
        onConfirm={() => pendingToggle && toggleMutation.mutate(pendingToggle)}
        onCancel={() => setPendingToggle(null)}
      />

      <ToastSnackbar toast={toast} onClose={closeToast} />
    </Stack>
  );
}
