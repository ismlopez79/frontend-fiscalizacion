import { createTheme, responsiveFontSizes } from "@mui/material/styles";
import "@fontsource/plus-jakarta-sans/400.css";
import "@fontsource/plus-jakarta-sans/500.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";
import "@fontsource/plus-jakarta-sans/800.css";

/**
 * Sistema de diseño "Actas JVE" v2 — SaaS suave, un solo acento.
 * Un unico color de marca (azul) para toda accion primaria; el resto de la
 * paleta es neutro. Los estados semanticos (activo/pendiente/fallo) viven
 * aparte, en pastillas con borde, nunca mezclados con el acento de marca.
 */
const palette = {
  primary: {
    main: "#2563EB",
    light: "#EEF4FF",
    dark: "#1D4ED8",
    contrastText: "#FFFFFF",
  },
  secondary: {
    main: "#0F172A",
    light: "#334155",
    dark: "#0B1220",
    contrastText: "#FFFFFF",
  },
  background: {
    default: "#F4F5F7",
    paper: "#FFFFFF",
  },
  text: {
    primary: "#0F172A",
    secondary: "#475569",
  },
  divider: "#E7E9EE",
  success: { main: "#15803D", light: "#ECFDF3" },
  warning: { main: "#B45309", light: "#FEF6E7" },
  error: { main: "#B42318", light: "#FEF3F2" },
  info: { main: "#2563EB", light: "#EEF4FF" },
};

/**
 * Tokens fuera de la paleta MUI (no hay slot nativo para "caption color" o
 * "placeholder color" separado de text.secondary): se exponen como
 * constantes propias y se documentan aqui para que todo el equipo use el
 * mismo valor en vez de inventar grises nuevos por pantalla.
 */
export const designTokens = {
  canvasBg: "#F4F5F7",
  cardBg: "#FFFFFF",
  cardBorder: "#E7E9EE",
  cardShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
  cardRadiusSm: 11,
  cardRadiusLg: 16,
  accent: "#2563EB",
  accentHover: "#1D4ED8",
  accentSoft: "#EEF4FF",
  textPrimary: "#0F172A",
  textSecondary: "#475569",
  textCaption: "#64748B",
  textDisabled: "#94A3B8",
  focusRing: "0 0 0 4px rgba(37, 99, 235, 0.16)",
  status: {
    success: { bg: "#ECFDF3", fg: "#15803D", border: "#B7E9CB" },
    warning: { bg: "#FEF6E7", fg: "#B45309", border: "#F6DFAE" },
    error: { bg: "#FEF3F2", fg: "#B42318", border: "#F6C9C4" },
    neutral: { bg: "#F1F5F9", fg: "#475569", border: "#E2E8F0" },
  },
  space: (n: number) => n * 8,
  transitionFast: "150ms ease",
  transitionCard: "180ms ease",
  /**
   * Curvas de easing fuertes para entradas/salidas y movimiento en pantalla
   * (las nativas de CSS son demasiado debiles para sentirse intencionales).
   * Fuente: animations.dev / skill "animate". Usar en vez de escribir
   * "ease-out"/"ease-in-out" a mano en cualquier @keyframes o transition
   * de una animacion deliberada (entradas de card, stagger, modales).
   */
  easeOut: "cubic-bezier(0.23, 1, 0.32, 1)",
  easeInOut: "cubic-bezier(0.77, 0, 0.175, 1)",
  easeDrawer: "cubic-bezier(0.32, 0.72, 0, 1)",
} as const;

export const cardShadow = designTokens.cardShadow;

/**
 * Breakpoints del brief responsive: 480 (movil), 768 (tablet portrait),
 * 1024 (tablet landscape / limite antes de escritorio). Se mapean a los
 * slots de MUI (sm/md/lg) para poder seguir usando la sintaxis habitual
 * `sx={{ display: { xs: ..., lg: ... } }}` y `theme.breakpoints.down(...)`
 * en vez de escribir media queries a mano.
 */
const breakpoints = {
  values: {
    xs: 0,
    sm: 480,
    md: 768,
    lg: 1024,
    xl: 1536,
  },
};

const baseTheme = createTheme({
  palette,
  breakpoints,
  typography: {
    fontFamily: '"Plus Jakarta Sans", "Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    // Display: titulos de pantalla, 24-30px/800, tracking negativo.
    h1: { fontWeight: 800, fontSize: "1.875rem", letterSpacing: "-0.03em" },
    h2: { fontWeight: 800, fontSize: "1.625rem", letterSpacing: "-0.03em" },
    h3: { fontWeight: 800, fontSize: "1.5rem", letterSpacing: "-0.03em" },
    // Body: texto de trabajo, 13-14.5px.
    h4: { fontWeight: 700, fontSize: "1.0625rem", letterSpacing: "-0.01em" },
    subtitle1: { fontWeight: 500, fontSize: "0.875rem", color: palette.text.secondary },
    body1: { fontSize: "0.90625rem" },
    body2: { fontSize: "0.8125rem", color: palette.text.secondary },
    // Caption: 11-12.5px en 600, siempre #64748B minimo (nunca mas claro en texto real).
    caption: { fontSize: "0.75rem", fontWeight: 600, color: designTokens.textCaption },
    button: { fontWeight: 700, textTransform: "none", fontSize: "0.875rem" },
  },
  shape: {
    borderRadius: designTokens.cardRadiusSm,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        "*:focus-visible": {
          outline: "none",
          boxShadow: designTokens.focusRing,
          borderRadius: 8,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
        outlined: {
          border: `1px solid ${designTokens.cardBorder}`,
          boxShadow: designTokens.cardShadow,
          borderRadius: designTokens.cardRadiusLg,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 700,
          fontSize: "0.75rem",
          letterSpacing: "0.02em",
          textTransform: "uppercase",
          color: designTokens.textCaption,
          backgroundColor: "#FBFCFD",
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 10,
          transition: designTokens.transitionFast,
          [theme.breakpoints.down("lg")]: {
            minHeight: 44,
          },
        }),
        containedPrimary: {
          "&:hover": { backgroundColor: palette.primary.dark },
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        size: "small",
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          transition: designTokens.transitionFast,
          "&.Mui-focused": {
            boxShadow: designTokens.focusRing,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 700,
          fontSize: "0.75rem",
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 10,
          marginLeft: 8,
          marginRight: 8,
          marginBottom: 2,
          width: "auto",
          transition: designTokens.transitionFast,
          // Area tactil minima de 44px en movil/tablet (WCAG 2.5.5) — en
          // escritorio se mantiene el alto compacto habitual.
          [theme.breakpoints.down("lg")]: {
            minHeight: 46,
          },
          "&.Mui-selected": {
            backgroundColor: designTokens.accentSoft,
            color: palette.primary.main,
            "& .MuiListItemIcon-root": {
              color: palette.primary.main,
            },
            "&:hover": {
              backgroundColor: designTokens.accentSoft,
            },
          },
        }),
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: ({ theme }) => ({
          [theme.breakpoints.down("md")]: {
            padding: 10,
          },
        }),
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          transition: designTokens.transitionFast,
        },
      },
    },
  },
});

/**
 * Escala automatica de h1-h6 entre movil y escritorio (MUI interpola segun
 * los breakpoints del tema) — evita tener que fijar a mano un tamaño de
 * fuente distinto por pantalla para cada variante de titulo.
 */
export const theme = responsiveFontSizes(baseTheme, { breakpoints: ["sm", "md", "lg"] });

/**
 * Clase utilitaria de tipografia para datos numericos de produccion.
 * Se usa via sx={numericDataSx} en los inputs/celdas de cantidades:
 * numeros tabulares, peso medio, ligeramente mas grandes que el texto
 * normal, para que se lean "a distancia" como un panel de control.
 */
export const numericDataSx = {
  fontVariantNumeric: "tabular-nums",
  fontWeight: 600,
  fontSize: "1.125rem",
};
