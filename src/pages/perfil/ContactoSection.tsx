import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Box, Button, Collapse, Skeleton, Stack, TextField } from "@mui/material";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import { SectionHeader, Surface } from "@/components/ui/Surface";
import { Callout } from "@/components/ui/Callout";
import { designTokens } from "@/theme/theme";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { getApiErrorMessage } from "@/utils/apiError";
import { PHONE_HELPER_TEXT, PHONE_REGEX, formatPhoneInput } from "@/utils/phone";
import type { SelfProfileUpdateRequest } from "@/types/user";
import type { MyAccountView } from "@/hooks/useMyAccount";

const optionalSchema = z.object({
  email: z.union([z.literal(""), z.string().trim().email("Correo inválido").max(150, "Máximo 150 caracteres")]),
  phone: z.union([z.literal(""), z.string().regex(PHONE_REGEX, "Formato inválido, debe ser 1234-5678")]),
});

/** Para todos menos ADMINISTRADOR: sin correo o telefono el backend bloquea la cuenta. */
const requiredSchema = z.object({
  email: z.string().trim().min(1, "El correo es obligatorio").email("Correo inválido").max(150, "Máximo 150 caracteres"),
  phone: z.string().min(1, "El teléfono es obligatorio").regex(PHONE_REGEX, "Formato inválido, debe ser 1234-5678"),
});

type FormValues = z.infer<typeof optionalSchema>;

interface ContactoSectionProps {
  profile: MyAccountView | undefined;
  loading: boolean;
  saving: boolean;
  onSave: (body: SelfProfileUpdateRequest) => Promise<unknown>;
  /** Correo y telefono obligatorios (todos menos ADMINISTRADOR). */
  required?: boolean;
}

/**
 * Lo unico que la persona puede editar de su propia cuenta: correo y
 * telefono (PATCH .../me). Los campos se ven siempre editables — no hay un
 * modo "editar" aparte — y el boton de guardar solo se habilita cuando algo
 * cambio de verdad respecto a lo guardado.
 */
export function ContactoSection({ profile, loading, saving, onSave, required = false }: ContactoSectionProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const savedTimeout = useRef<ReturnType<typeof setTimeout>>();
  const reducedMotion = useReducedMotion();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(required ? requiredSchema : optionalSchema),
    defaultValues: { email: "", phone: "" },
  });

  // Rellena el formulario con lo guardado (al cargar y tras cada guardado).
  useEffect(() => {
    if (!profile) return;
    reset({ email: profile.email ?? "", phone: profile.phone ?? "" });
  }, [profile, reset]);

  useEffect(() => () => clearTimeout(savedTimeout.current), []);

  const onSubmit = handleSubmit(async (values) => {
    if (!isDirty) return;
    setSubmitError(null);
    try {
      await onSave({ email: values.email.trim() || null, phone: values.phone || null });
      reset(values);
      setJustSaved(true);
      clearTimeout(savedTimeout.current);
      savedTimeout.current = setTimeout(() => setJustSaved(false), 1800);
    } catch (error) {
      setSubmitError(getApiErrorMessage(error, "No se pudieron guardar tus datos de contacto."));
    }
  });

  const state: "idle" | "saving" | "done" = saving ? "saving" : justSaved && !isDirty ? "done" : "idle";

  return (
    <Surface>
      <SectionHeader title="Datos de contacto" subtitle="Puedes actualizar tu correo y tu teléfono cuando quieras." />

      {loading ? (
        <Stack spacing={2}>
          <Skeleton variant="rounded" height={40} sx={{ borderRadius: "10px" }} />
          <Skeleton variant="rounded" height={40} sx={{ borderRadius: "10px" }} />
        </Stack>
      ) : (
        <Box component="form" onSubmit={onSubmit} noValidate>
          <Collapse in={!!submitError}>
            <Box sx={{ mb: 2 }}>
              <Callout tone="error" title="No se guardaron los cambios">
                {submitError}
              </Callout>
            </Box>
          </Collapse>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            {/* Controlado (no register): con register, el valor guardado se escribia en
                el input despues de montarlo y MUI no se enteraba de que ya tenia texto,
                asi que la etiqueta se quedaba DENTRO de la casilla, encima del correo. */}
            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  inputRef={field.ref}
                  label="Correo electrónico"
                  type="email"
                  fullWidth
                  autoComplete="email"
                  inputProps={{ autoCapitalize: "none", autoCorrect: "off", spellCheck: false }}
                  // Siempre arriba: el autocompletado de Safari/Chrome tambien puede llenar
                  // el campo sin avisar a React, y la etiqueta no debe tapar el texto.
                  InputLabelProps={{ shrink: true }}
                  placeholder="nombre@ejemplo.com"
                  error={!!errors.email}
                  helperText={errors.email?.message ?? (required ? "Obligatorio." : "Opcional.")}
                />
              )}
            />
            <Controller
              name="phone"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  inputRef={field.ref}
                  InputLabelProps={{ shrink: true }}
                  label="Teléfono"
                  fullWidth
                  placeholder="7123-4567"
                  inputProps={{ inputMode: "numeric", autoComplete: "tel" }}
                  onChange={(e) => field.onChange(formatPhoneInput(e.target.value))}
                  error={!!errors.phone}
                  helperText={errors.phone?.message ?? (required ? "Obligatorio. Formato 1234-5678." : PHONE_HELPER_TEXT)}
                  sx={{ "& input": { fontVariantNumeric: "tabular-nums" } }}
                />
              )}
            />
          </Stack>

          <Stack direction="row" gap={1.25} justifyContent="flex-end" sx={{ mt: 2.5 }}>
            {isDirty && !saving && (
              <Button color="inherit" onClick={() => reset()}>
                Descartar
              </Button>
            )}
            <Button
              type="submit"
              variant={state === "done" ? "outlined" : "contained"}
              color={state === "done" ? "success" : "primary"}
              disabled={saving || (!isDirty && state !== "done")}
              aria-live="polite"
              sx={{ position: "relative", minWidth: 156 }}
            >
              {/* Reserva el ancho de la etiqueta mas larga: el boton no cambia de tamaño entre estados. */}
              <Box component="span" aria-hidden sx={{ visibility: "hidden" }}>
                Guardar cambios
              </Box>
              {(
                [
                  { key: "idle", label: "Guardar cambios", icon: null },
                  { key: "saving", label: "Guardando…", icon: null },
                  { key: "done", label: "Guardado", icon: <CheckRoundedIcon sx={{ fontSize: 18 }} /> },
                ] as const
              ).map((l) => {
                const visible = l.key === state;
                return (
                  <Box
                    key={l.key}
                    component="span"
                    aria-hidden={!visible}
                    sx={{
                      position: "absolute",
                      inset: 0,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 0.75,
                      opacity: visible ? 1 : 0,
                      filter: visible || reducedMotion ? "blur(0px)" : "blur(3px)",
                      transform: visible || reducedMotion ? "scale(1)" : "scale(0.94)",
                      transition: `opacity 200ms ${designTokens.easeOut}, filter 200ms ${designTokens.easeOut}, transform 200ms ${designTokens.easeOut}`,
                    }}
                  >
                    {l.icon}
                    {l.label}
                  </Box>
                );
              })}
            </Button>
          </Stack>
        </Box>
      )}
    </Surface>
  );
}
