import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Box, Chip, Collapse, Divider, Skeleton, Stack, Switch, Typography } from "@mui/material";
import dayjs from "dayjs";
import { modulosApi } from "@/api/modulosApi";
import { getApiErrorMessage } from "@/utils/apiError";
import { useModulos, MODULOS_QUERY_KEY } from "@/hooks/useModulos";
import { ConfirmacionAccion } from "@/components/ConfirmacionAccion";
import { useToast } from "@/hooks/useToast";
import { ToastSnackbar } from "@/components/ToastSnackbar";
import { PageHeader } from "@/components/ui/PageHeader";
import { Surface } from "@/components/ui/Surface";
import { Callout } from "@/components/ui/Callout";
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
  if (modulo.code === "TRAINING") {
    return turningOn
      ? "Digitadores y delegados temporales verán la opción «Acta de práctica»: llenan el mismo formulario de acta, pero nada se guarda ni consume numeración. Las actas reales siguen funcionando normal."
      : "La opción «Acta de práctica» dejará de mostrarse. No hay nada que limpiar: las prácticas nunca se guardaron.";
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
    <Stack spacing={{ xs: 2, md: 2.5 }} sx={{ flexShrink: 0, pb: 2 }}>
      <PageHeader
        title="Módulos del sistema"
        subtitle="Enciende o apaga módulos completos de la aplicación. Apagar un módulo no borra ningún dato — solo restringe el acceso mientras esté apagado."
      />

      <Collapse in={isError}>
        <Callout tone="error" title="No se pudo cargar la lista de módulos">
          {getApiErrorMessage(error, "Revisa tu conexión e inténtalo de nuevo.")}
        </Callout>
      </Collapse>

      {/* Lista estilo Ajustes: una superficie, un modulo por fila, el interruptor a la derecha. */}
      <Surface sx={{ py: { xs: 0.5, md: 1 } }}>
        {isLoading ? (
          <Stack divider={<Divider flexItem sx={{ borderColor: "rgba(15, 23, 42, 0.06)" }} />}>
            {[0, 1].map((i) => (
              <Box key={i} sx={{ py: 2.5 }}>
                <Skeleton width={180} height={28} />
                <Skeleton width="80%" />
              </Box>
            ))}
          </Stack>
        ) : (
          <Stack divider={<Divider flexItem sx={{ borderColor: "rgba(15, 23, 42, 0.06)" }} />}>
            {modules.map((modulo) => (
              <Stack
                key={modulo.code}
                direction="row"
                gap={2}
                alignItems="center"
                justifyContent="space-between"
                sx={{ py: 2.5 }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap" rowGap={0.5}>
                    <Typography sx={{ fontWeight: 700, color: "text.primary", fontSize: "0.9375rem" }}>
                      {modulo.name}
                    </Typography>
                    <Chip
                      size="small"
                      label={modulo.enabled ? "Habilitado" : "Deshabilitado"}
                      color={modulo.enabled ? "success" : "default"}
                    />
                  </Stack>
                  <Typography variant="body2" sx={{ mt: 0.5, maxWidth: "70ch" }}>
                    {modulo.description}
                  </Typography>
                  <Typography variant="caption" component="div" sx={{ mt: 0.75, fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>
                    Actualizado el {dayjs(modulo.updatedAt).format("DD/MM/YYYY HH:mm")}
                  </Typography>
                </Box>

                <Switch
                  checked={modulo.enabled}
                  disabled={toggleMutation.isPending}
                  onChange={() => setPendingToggle(modulo)}
                  inputProps={{ "aria-label": `Cambiar estado de ${modulo.name}` }}
                  sx={{ flexShrink: 0 }}
                />
              </Stack>
            ))}
          </Stack>
        )}
      </Surface>

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
