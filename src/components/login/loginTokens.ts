import { designTokens } from "@/theme/theme";

/**
 * Paleta institucional del login (TSE/JVE) — deliberadamente distinta del
 * tema interno de la app (que usa el azul #2563EB neutro de "Actas JVE"
 * v2). El login es la superficie publica/de acceso y conserva su propia
 * identidad de marca; no unificar estos colores con designTokens.accent.
 *
 * Este archivo existe solo para no repetir los mismos hex/curvas en cada
 * componente de login (violaba DRY sin ser, en si, un problema de marca).
 */
export const loginTokens = {
  navy: "#1B3A6B",
  navyDark: "#0D1B2A",
  gold: "#F8B018",
  borderIdle: "#D7DEE8",
  borderHover: "#B7C4D6",
  error: "#A32E2E",
  iconMuted: "#6B7280",
  ease: designTokens.easeOut,
} as const;

/**
 * Bloque de estilos compartido por FormInput y PasswordInput (antes
 * duplicado caracter por caracter en ambos). Curva de easing propia del
 * repo en vez del "ease-out" nativo, que es demasiado debil para un
 * glow de focus deliberado.
 */
export const loginInputSx = {
  height: 54,
  borderRadius: "12px",
  backgroundColor: "#FFFFFF",
  fontSize: 15.5,
  transition: `box-shadow 150ms ${loginTokens.ease}, border-color 150ms ${loginTokens.ease}`,
  "& fieldset": {
    borderColor: loginTokens.borderIdle,
    borderRadius: "12px",
  },
  "&:hover fieldset": {
    borderColor: loginTokens.borderHover,
  },
  "&.Mui-focused fieldset": {
    borderColor: loginTokens.navy,
    borderWidth: "1.5px",
  },
  "&.Mui-focused": {
    boxShadow: "0 0 0 3px rgba(27, 58, 107, 0.10)",
  },
  "&.Mui-error fieldset": {
    borderColor: loginTokens.error,
  },
} as const;
