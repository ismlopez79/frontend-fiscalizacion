import { forwardRef } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { WordCountTextField } from "@/components/ui/WordCountTextField";
import type { ActaFormValues } from "./actaFormSchema";

export const OBSERVACIONES_FIELD_ID = "acta-observaciones";

/** Observaciones del acta: minimo de palabras con contador en vivo (ver WordCountTextField). */
export const ObservacionesField = forwardRef<HTMLDivElement>(function ObservacionesField(_props, ref) {
  const {
    control,
    formState: { errors },
  } = useFormContext<ActaFormValues>();

  return (
    <Controller
      name="observations"
      control={control}
      render={({ field }) => (
        <WordCountTextField
          ref={ref}
          id={OBSERVACIONES_FIELD_ID}
          value={field.value ?? ""}
          onChange={field.onChange}
          onBlur={field.onBlur}
          inputRef={field.ref}
          error={errors.observations?.message}
          placeholder="Describe lo observado durante el levantamiento del acta."
        />
      )}
    />
  );
});
