import { useState } from "react";
import { Box, ButtonBase, Collapse, Stack, Typography } from "@mui/material";
import SupportAgentOutlinedIcon from "@mui/icons-material/SupportAgentOutlined";
import { loginTokens } from "./loginTokens";

/**
 * "¿Olvidaste tu contraseña?" — no hay autoservicio de recuperacion: la
 * contraseña solo la restablece un administrador. En vez de un enlace
 * muerto o un modal, al tocarlo se despliega en linea el aviso de a quien
 * acudir, justo debajo, sin sacar al usuario del formulario.
 */
export function ForgotPasswordHint() {
  const [open, setOpen] = useState(false);

  return (
    <Box>
      <Stack direction="row" justifyContent="flex-end">
        <ButtonBase
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="forgot-password-hint"
          sx={{
            px: 0.75,
            py: 0.5,
            mr: -0.75,
            borderRadius: "8px",
            fontSize: 14,
            fontWeight: 600,
            color: loginTokens.navy,
            transition: `color 150ms ${loginTokens.ease}, opacity 150ms ease`,
            "&:active": { opacity: 0.6 },
            "&.Mui-focusVisible": { boxShadow: "0 0 0 3px rgba(27, 58, 107, 0.18)" },
            "@media (hover: hover) and (pointer: fine)": { "&:hover": { color: loginTokens.navyDark } },
          }}
        >
          ¿Olvidaste tu contraseña?
        </ButtonBase>
      </Stack>

      <Collapse in={open} timeout={220}>
        <Stack
          id="forgot-password-hint"
          role="status"
          direction="row"
          gap={1.25}
          alignItems="flex-start"
          sx={{
            mt: 1,
            px: 1.75,
            py: 1.5,
            borderRadius: "14px",
            bgcolor: "rgba(27, 58, 107, 0.06)",
            boxShadow: "inset 0 0 0 1px rgba(27, 58, 107, 0.08)",
          }}
        >
          <SupportAgentOutlinedIcon sx={{ fontSize: 20, color: loginTokens.navy, mt: "1px" }} />
          <Box>
            <Typography sx={{ fontSize: 14, fontWeight: 700, color: loginTokens.navyDark }}>
              Contacta a un administrador
            </Typography>
            <Typography sx={{ fontSize: 13.5, color: "#4B5563", lineHeight: 1.5 }}>
              Solo un administrador del sistema puede restablecer tu contraseña.
            </Typography>
          </Box>
        </Stack>
      </Collapse>
    </Box>
  );
}
