import { useEffect, useRef, useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { Box, Button, ButtonBase, Checkbox, Collapse, FormControlLabel, FormHelperText, Stack, Typography } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMoreRounded";
import { designTokens } from "@/theme/theme";
import { MAX_ACOMPANANTES } from "./actaFormSchema";
import type { ActaFormValues } from "./actaFormSchema";

export interface AcompananteOption {
  temporaryDelegateId: number;
  fullName: string;
  dui: string;
  politicalPartyName: string | null;
}

interface AcompanantesFieldProps {
  options: AcompananteOption[];
  /** false al corregir un acta ajena: solo se conservan o quitan los ya registrados. */
  canAddAll?: boolean;
}

const CONTENT_ID = "acompanantes-contenido";

/**
 * Delegados temporales a cargo que acompañaron al permanente. Mismo acordeon
 * que ProduccionRow/IncidenteRow: contraido muestra a quienes se marco, y se
 * contrae solo en cuanto se toca o enfoca cualquier cosa fuera de el, para no
 * ocupar espacio mientras se llena el resto del acta. Se pueden agregar todos
 * de una vez o marcar uno por uno. No marcar ninguno deja el acta igual que
 * siempre.
 */
export function AcompanantesField({ options, canAddAll = true }: AcompanantesFieldProps) {
  const {
    control,
    formState: { errors },
  } = useFormContext<ActaFormValues>();

  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const closeIfOutside = (event: Event) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeIfOutside);
    document.addEventListener("focusin", closeIfOutside);
    return () => {
      document.removeEventListener("pointerdown", closeIfOutside);
      document.removeEventListener("focusin", closeIfOutside);
    };
  }, [open]);

  const errorMessage = errors.acompananteIds?.message;

  return (
    <Controller
      name="acompananteIds"
      control={control}
      render={({ field }) => {
        const selected = field.value ?? [];
        const limitReached = selected.length >= MAX_ACOMPANANTES;
        const toggle = (id: number, checked: boolean) =>
          field.onChange(checked ? [...selected, id] : selected.filter((s) => s !== id));

        const selectedOptions = options.filter((o) => selected.includes(o.temporaryDelegateId));
        // "Todos" respeta el tope del backend: conserva los ya marcados y completa con el resto.
        const allIds = [
          ...selected,
          ...options.map((o) => o.temporaryDelegateId).filter((id) => !selected.includes(id)),
        ].slice(0, MAX_ACOMPANANTES);
        const allSelected = allIds.length === selected.length;

        return (
          <Box
            ref={rootRef}
            sx={{
              borderRadius: "16px",
              bgcolor: open ? "rgba(15, 23, 42, 0.025)" : "transparent",
              boxShadow: errorMessage
                ? `inset 0 0 0 1px ${designTokens.status.error.border}`
                : "inset 0 0 0 1px rgba(15, 23, 42, 0.08)",
              transition: "background-color 200ms ease",
            }}
          >
            <Stack direction="row" alignItems="center" sx={{ pr: 1.25 }}>
              <ButtonBase
                onClick={() => setOpen((current) => !current)}
                aria-expanded={open}
                aria-controls={CONTENT_ID}
                sx={{
                  flex: 1,
                  minWidth: 0,
                  justifyContent: "flex-start",
                  gap: 1.5,
                  px: 2,
                  py: 1.75,
                  borderRadius: "16px",
                  textAlign: "left",
                }}
              >
                <ExpandMoreIcon
                  fontSize="small"
                  sx={{
                    color: designTokens.textCaption,
                    transform: open ? "rotate(0deg)" : "rotate(-90deg)",
                    transition: `transform 200ms ${designTokens.easeOut}`,
                  }}
                />
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography sx={{ fontWeight: 700, color: "text.primary", fontSize: "0.9375rem" }} noWrap>
                    {selected.length === 0
                      ? "Sin acompañantes"
                      : selected.length === 1
                        ? "1 acompañante"
                        : `${selected.length} acompañantes`}
                  </Typography>
                  <Typography variant="body2" noWrap>
                    {errorMessage ? (
                      <Box component="span" sx={{ color: designTokens.status.error.fg, fontWeight: 600 }}>
                        {errorMessage}
                      </Box>
                    ) : selectedOptions.length > 0 ? (
                      selectedOptions.map((o) => o.fullName).join(", ")
                    ) : open ? (
                      "Marca a quienes te acompañaron."
                    ) : (
                      "Toca para elegir uno por uno."
                    )}
                  </Typography>
                </Box>
              </ButtonBase>
              {canAddAll && options.length > 1 && !allSelected && (
                <Button size="small" onClick={() => field.onChange(allIds)} sx={{ flexShrink: 0 }}>
                  Agregar a todos
                </Button>
              )}
              {selected.length > 1 && (allSelected || !canAddAll) && (
                <Button size="small" color="inherit" onClick={() => field.onChange([])} sx={{ flexShrink: 0 }}>
                  Quitar a todos
                </Button>
              )}
            </Stack>

            <Collapse in={open} id={CONTENT_ID}>
              <Box sx={{ px: 2, pb: 2 }}>
                <Stack component="ul" spacing={0.5} sx={{ listStyle: "none", m: 0, p: 0 }}>
                  {options.map((option) => {
                    const checked = selected.includes(option.temporaryDelegateId);
                    return (
                      <Box
                        component="li"
                        key={option.temporaryDelegateId}
                        sx={{
                          borderRadius: "14px",
                          bgcolor: checked ? designTokens.accentSoft : "#FFFFFF",
                          transition: "background-color 150ms ease",
                        }}
                      >
                        <FormControlLabel
                          sx={{ m: 0, width: "100%", px: 0.75, py: 0.5, alignItems: "center" }}
                          control={
                            <Checkbox
                              checked={checked}
                              disabled={!checked && limitReached}
                              onChange={(e) => toggle(option.temporaryDelegateId, e.target.checked)}
                            />
                          }
                          label={
                            <Box sx={{ minWidth: 0, py: 0.5 }}>
                              <Typography variant="body2" sx={{ fontWeight: 700, color: "text.primary" }}>
                                {option.fullName}
                              </Typography>
                              <Typography variant="caption" component="div" sx={{ fontVariantNumeric: "tabular-nums" }}>
                                DUI {option.dui} · {option.politicalPartyName ?? "Sin partido"}
                              </Typography>
                            </Box>
                          }
                        />
                      </Box>
                    );
                  })}
                </Stack>
                <FormHelperText sx={{ mt: 1 }}>
                  {selected.length === 0
                    ? "Ninguno marcado: el acta se registra solo a tu nombre."
                    : "Los marcados aparecerán en el PDF del acta. Se guardan solos al seguir con el resto del formulario."}
                </FormHelperText>
              </Box>
            </Collapse>
          </Box>
        );
      }}
    />
  );
}
