import { forwardRef } from "react";
import type { ReactNode } from "react";
import { InputAdornment, TextField } from "@mui/material";
import type { TextFieldProps } from "@mui/material";
import { loginInputSx } from "./loginTokens";

type FormInputProps = TextFieldProps & {
  icon: ReactNode;
};

/**
 * Input de texto estandar del login: icono a la izquierda, borde gris que
 * pasa a azul institucional con glow suave en focus. forwardRef para que
 * react-hook-form pueda registrarlo directamente.
 */
export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(function FormInput(
  { icon, ...textFieldProps },
  ref
) {
  return (
    <TextField
      inputRef={ref}
      fullWidth
      variant="outlined"
      InputProps={{
        startAdornment: (
          <InputAdornment position="start" sx={{ color: "#6B7280" }}>
            {icon}
          </InputAdornment>
        ),
      }}
      sx={{
        "& .MuiOutlinedInput-root": loginInputSx,
        "& .MuiFormHelperText-root": {
          ml: 0.5,
          fontSize: 12.5,
        },
        ...textFieldProps.sx,
      }}
      {...textFieldProps}
    />
  );
});
