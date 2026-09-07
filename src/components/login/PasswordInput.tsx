import { forwardRef, useState } from "react";
import { IconButton, InputAdornment, TextField, Tooltip } from "@mui/material";
import type { TextFieldProps } from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import { loginInputSx, loginTokens } from "./loginTokens";

type PasswordInputProps = Omit<TextFieldProps, "type">;

/**
 * Input de contraseña: candado a la izquierda, boton mostrar/ocultar a la
 * derecha con icono de ojo, tooltip accesible y transicion suave del icono.
 */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(function PasswordInput(
  { ...textFieldProps },
  ref
) {
  const [visible, setVisible] = useState(false);

  return (
    <TextField
      inputRef={ref}
      fullWidth
      variant="outlined"
      type={visible ? "text" : "password"}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start" sx={{ color: "#6B7280" }}>
            <LockOutlinedIcon fontSize="small" />
          </InputAdornment>
        ),
        endAdornment: (
          <InputAdornment position="end">
            <Tooltip title={visible ? "Ocultar contraseña" : "Mostrar contraseña"}>
              <IconButton
                aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
                onClick={() => setVisible((v) => !v)}
                edge="end"
                size="small"
                sx={{
                  color: loginTokens.iconMuted,
                  transition: `color 150ms ${loginTokens.ease}, transform 120ms ${loginTokens.ease}`,
                  "&:hover": { color: loginTokens.navy },
                  "&:active": { transform: "scale(0.9)" },
                }}
              >
                {visible ? (
                  <VisibilityOffOutlinedIcon fontSize="small" />
                ) : (
                  <VisibilityOutlinedIcon fontSize="small" />
                )}
              </IconButton>
            </Tooltip>
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
