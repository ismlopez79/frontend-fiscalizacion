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
  borderRadius: "14px",
  // Campo blanco casi opaco sobre la tarjeta de vidrio: legible sin importar
  // el color que pase por detras. Sin borde duro en reposo, solo un anillo tenue.
  backgroundColor: "rgba(255, 255, 255, 0.86)",
  fontSize: 15.5,
  transition: `box-shadow 150ms ${loginTokens.ease}, background-color 150ms ${loginTokens.ease}`,
  "& fieldset": {
    borderColor: "rgba(13, 27, 42, 0.08)",
    borderRadius: "14px",
    transition: `border-color 150ms ${loginTokens.ease}`,
  },
  "@media (hover: hover) and (pointer: fine)": {
    "&:hover fieldset": { borderColor: "rgba(13, 27, 42, 0.18)" },
  },
  "&.Mui-focused": {
    backgroundColor: "#FFFFFF",
    boxShadow: "0 0 0 4px rgba(27, 58, 107, 0.12)",
  },
  "&.Mui-focused fieldset": {
    borderColor: loginTokens.navy,
    borderWidth: "1.5px",
  },
  "&.Mui-error fieldset": {
    borderColor: loginTokens.error,
  },
} as const;
