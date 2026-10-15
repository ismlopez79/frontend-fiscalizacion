import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from "@mui/material";
import { traineeAssignmentApi } from "@/api/electoralApi";
import { getApiErrorMessage } from "@/utils/apiError";
import type { UserDto } from "@/types/user";
import type { TemporaryDelegateDto, TraineeAssignmentDto } from "@/types/electoral";

interface TemporalACargoFormDialogProps {
  open: boolean;
  digitadores: UserDto[];
  /** Solo los activos: el backend rechaza (409) asignar un temporal inactivo. */
  temporales: TemporaryDelegateDto[];
  /** Lo ya asignado, para no ofrecer un temporal que ese permanente ya tiene. */
  aCargo: TraineeAssignmentDto[];
  defaultUserId: number | null;
  onClose: () => void;
  onAssigned: (count: number) => void;
}

interface AssignResult {
  assigned: number;
  failed: { delegate: TemporaryDelegateDto; message: string }[];
}

/**
 * El backend asigna de uno en uno (POST /delegados-a-cargo). Para ponerle
 * varios temporales al mismo permanente de una vez se mandan en fila; los que
 * fallen quedan seleccionados con su motivo para reintentar.
 */
export function TemporalACargoFormDialog({
  open,
  digitadores,
  temporales,
  aCargo,
  defaultUserId,
  onClose,
  onAssigned,
}: TemporalACargoFormDialogProps) {
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<number | null>(defaultUserId);
  const [selected, setSelected] = useState<TemporaryDelegateDto[]>([]);
  const [touched, setTouched] = useState(false);
  const [submitErrors, setSubmitErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setUserId(defaultUserId);
    setSelected([]);
    setTouched(false);
    setSubmitErrors([]);
  }, [open, defaultUserId]);

  const disponibles = useMemo(() => {
    const yaACargo = new Set(aCargo.filter((a) => a.userId === userId).map((a) => a.temporaryDelegateId));
    return temporales.filter((d) => !yaACargo.has(d.id));
  }, [temporales, aCargo, userId]);

  const mutation = useMutation({
    mutationFn: async (): Promise<AssignResult> => {
      const result: AssignResult = { assigned: 0, failed: [] };
      for (const delegate of selected) {
        try {
          await traineeAssignmentApi.asignar({ userId: userId!, temporaryDelegateId: delegate.id });
          result.assigned += 1;
        } catch (error) {
          result.failed.push({ delegate, message: getApiErrorMessage(error, "No se pudo asignar.") });
        }
      }
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["delegados-a-cargo"] });
      if (result.assigned > 0) onAssigned(result.assigned);
      if (result.failed.length === 0) {
        onClose();
        return;
      }
      setSelected(result.failed.map((f) => f.delegate));
      setSubmitErrors(result.failed.map((f) => `${f.delegate.fullName}: ${f.message}`));
    },
  });

  const userError = touched && userId === null ? "Selecciona un delegado permanente" : undefined;
  const selectedError = touched && selected.length === 0 ? "Selecciona al menos un delegado temporal" : undefined;

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setTouched(true);
    setSubmitErrors([]);
    if (userId === null || selected.length === 0) return;
    mutation.mutate();
  };

  return (
    <Dialog open={open} onClose={mutation.isPending ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Asignar temporales a cargo</DialogTitle>
      <Box component="form" onSubmit={onSubmit} noValidate>
        <DialogContent>
          <Stack spacing={2.25}>
            {submitErrors.length > 0 && (
              <Alert severity="error">
                {submitErrors.map((message) => (
                  <div key={message}>{message}</div>
                ))}
              </Alert>
            )}

            <Autocomplete
              options={digitadores}
              getOptionLabel={(u) => `${u.fullName} (${u.username})`}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              value={digitadores.find((u) => u.id === userId) ?? null}
              onChange={(_, user) => {
                setUserId(user?.id ?? null);
                // Lo disponible depende del permanente elegido.
                setSelected([]);
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Delegado permanente"
                  placeholder="Busca por nombre o usuario"
                  error={!!userError}
                  helperText={
                    userError ?? (digitadores.length === 0 ? "No hay usuarios activos con rol DIGITADOR." : undefined)
                  }
                />
              )}
            />

            <Autocomplete
              multiple
              disableCloseOnSelect
              disabled={userId === null}
              options={disponibles}
              getOptionLabel={(d) => `${d.fullName} (${d.dui})`}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              value={selected}
              onChange={(_, value) => setSelected(value)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Delegados temporales a cargo"
                  placeholder={selected.length === 0 ? "Busca por nombre o DUI" : undefined}
                  error={!!selectedError}
                  helperText={
                    selectedError ??
                    (userId === null
                      ? "Elige primero al delegado permanente."
                      : disponibles.length === 0
                        ? "Ya tiene a cargo a todos los delegados temporales activos."
                        : "Puedes elegir varios. Un temporal puede estar a cargo de más de un permanente.")
                  }
                />
              )}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} color="inherit" disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={mutation.isPending}>
            {mutation.isPending ? "Asignando…" : "Asignar"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
