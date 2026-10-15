import { createTheme, responsiveFontSizes } from "@mui/material/styles";
import type {} from "@mui/x-data-grid/themeAugmentation";
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
  cardShadow: "0 0 0 1px rgba(15, 23, 42, 0.04), 0 1px 2px rgba(15, 23, 42, 0.04), 0 12px 32px -16px rgba(15, 23, 42, 0.10)",
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
        html: {
          // Sin el destello gris/azul del navegador al tocar: cada control ya tiene su propio :active.
          WebkitTapHighlightColor: "transparent",
          WebkitTextSizeAdjust: "100%",
        },
        // Sin retraso de 300ms en el toque y sin seleccionar el texto del boton con una pulsacion larga.
        "button, a, [role='button'], [role='radio'], .MuiButtonBase-root": {
          touchAction: "manipulation",
        },
        "button, [role='button'], [role='radio'], .MuiButtonBase-root": {
          userSelect: "none",
          WebkitUserSelect: "none",
        },
        // iOS/iPadOS hace zoom al enfocar un input con letra menor a 16px y no
        // regresa: la barra superior queda fuera de la vista hasta que el usuario
        // aleja el zoom a mano. Dos condiciones, porque un iPad con teclado o
        // trackpad se reporta como puntero "fino" y no entra en la primera:
        //  - pantallas tactiles en general (Android, tablets);
        //  - cualquier Safari de iOS/iPadOS (-webkit-touch-callout solo existe ahi),
        //    tenga o no teclado/trackpad conectado.
        // En escritorio se conserva el tamaño compacto. Nunca se bloquea el zoom.
        "@media (pointer: coarse), (hover: none)": {
          "input, textarea, select, .MuiInputBase-input": { fontSize: "16px !important" },
        },
        "@supports (-webkit-touch-callout: none)": {
          "input, textarea, select, .MuiInputBase-input": { fontSize: "16px !important" },
        },
        // El <input> interno no dibuja su propio anillo: el campo (OutlinedInput) ya
        // muestra el suyo alrededor; si no, se veian dos anillos anidados al enfocar.
        "input:focus-visible, textarea:focus-visible, select:focus-visible": {
          boxShadow: "none !important",
          outline: "none",
        },
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
        // Superficie del sistema (misma que el dashboard): sin borde duro,
        // radio amplio y sombra de contacto + ambiente apenas perceptible.
        outlined: {
          border: "none",
          boxShadow: designTokens.cardShadow,
          borderRadius: 20,
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
          transition: `background-color 150ms ease, color 150ms ease, border-color 150ms ease, box-shadow 150ms ease, transform 160ms ${designTokens.easeOut}`,
          // Respuesta al presionar: la interfaz confirma que escucho el toque.
          "&:active:not(.Mui-disabled)": { transform: "scale(0.97)" },
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
    // Pastillas: fondo tintado del tono, sin borde. "outlined" deja de ser un
    // contorno y pasa a ser la version neutra/suave del mismo tono, asi un
    // Activo/Inactivo/Bloqueada se lee igual en toda la app.
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 700,
          fontSize: "0.75rem",
          borderRadius: 999,
          height: 24,
          "&.MuiChip-outlined": { border: "none" },
          "&.MuiChip-colorDefault": { backgroundColor: designTokens.status.neutral.bg, color: designTokens.status.neutral.fg },
          "&.MuiChip-colorPrimary.MuiChip-outlined, &.MuiChip-colorInfo": {
            backgroundColor: designTokens.accentSoft,
            color: palette.primary.dark,
          },
          "&.MuiChip-colorSuccess": { backgroundColor: designTokens.status.success.bg, color: designTokens.status.success.fg },
          "&.MuiChip-colorWarning": { backgroundColor: designTokens.status.warning.bg, color: designTokens.status.warning.fg },
          "&.MuiChip-colorError": { backgroundColor: designTokens.status.error.bg, color: designTokens.status.error.fg },
          "& .MuiChip-icon": { color: "inherit", fontSize: 15, marginLeft: 7, marginRight: -3 },
        },
        sizeSmall: { height: 24 },
        label: { paddingLeft: 9, paddingRight: 9 },
      },
    },
    // Switch estilo iOS: pista redondeada que se tiñe al activarse y perilla
    // blanca con sombra; el recorrido usa la curva fuerte del sistema.
    MuiSwitch: {
      styleOverrides: {
        root: {
          width: 46,
          height: 28,
          padding: 0,
          margin: "0 10px 0 8px",
        },
        switchBase: {
          padding: 3,
          transitionProperty: "transform",
          transitionDuration: "220ms",
          transitionTimingFunction: designTokens.easeOut,
          "&.Mui-checked": {
            transform: "translateX(18px)",
            color: "#FFFFFF",
            "& + .MuiSwitch-track": { backgroundColor: designTokens.status.success.fg, opacity: 1 },
          },
          "&.Mui-disabled + .MuiSwitch-track": { opacity: 0.4 },
          "&.Mui-focusVisible .MuiSwitch-thumb": { boxShadow: designTokens.focusRing },
        },
        thumb: {
          width: 22,
          height: 22,
          boxShadow: "0 2px 4px rgba(15, 23, 42, 0.2), 0 0 0 0.5px rgba(15, 23, 42, 0.04)",
          color: "#FFFFFF",
        },
        track: {
          borderRadius: 14,
          backgroundColor: "rgba(15, 23, 42, 0.16)",
          opacity: 1,
          transition: "background-color 220ms ease",
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
          transition: `background-color 150ms ease, color 150ms ease, transform 160ms ${designTokens.easeOut}`,
          "&:active:not(.Mui-disabled)": { transform: "scale(0.92)" },
          [theme.breakpoints.down("md")]: {
            padding: 10,
          },
        }),
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 20,
          boxShadow: "0 0 0 1px rgba(15, 23, 42, 0.06), 0 24px 64px -16px rgba(15, 23, 42, 0.30)",
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: { fontSize: "1.125rem", fontWeight: 700, letterSpacing: "-0.015em", padding: "22px 24px 8px" },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: { padding: "8px 24px 16px", "& > .MuiStack-root:first-of-type": { paddingTop: 8 } },
      },
    },
    // Pie del dialogo separado por una linea tenue; en movil los botones ocupan el ancho.
    MuiDialogActions: {
      styleOverrides: {
        root: ({ theme }) => ({
          padding: "14px 24px 20px",
          gap: 8,
          borderTop: "1px solid rgba(15, 23, 42, 0.06)",
          "& > :not(style) ~ :not(style)": { marginLeft: 0 },
          [theme.breakpoints.down("sm")]: {
            flexDirection: "column-reverse",
            alignItems: "stretch",
          },
        }),
      },
    },
    // Fondo de modales: solo atenuado, sin blur — el blur de pantalla
    // completa se paga en cada frame y es lo primero que baja el rendimiento.
    MuiBackdrop: {
      styleOverrides: {
        root: {
          "&:not(.MuiBackdrop-invisible)": { backgroundColor: "rgba(15, 23, 42, 0.36)" },
        },
      },
    },
    // Menus, selects y popovers: piezas chicas que flotan -> vidrio (barato a este tamaño).
    MuiPopover: {
      styleOverrides: {
        paper: {
          borderRadius: 14,
          backgroundColor: "rgba(255, 255, 255, 0.86)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          border: "1px solid rgba(255, 255, 255, 0.8)",
          boxShadow: "0 0 0 1px rgba(15, 23, 42, 0.06), 0 16px 40px -12px rgba(15, 23, 42, 0.25)",
          "@media (prefers-reduced-transparency: reduce)": {
            backgroundColor: "#FFFFFF",
            backdropFilter: "none",
          },
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          marginLeft: 6,
          marginRight: 6,
          fontSize: "0.875rem",
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: "rgba(15, 23, 42, 0.88)",
          borderRadius: 8,
          fontSize: "0.75rem",
          fontWeight: 500,
          padding: "6px 10px",
          boxShadow: "0 8px 24px -8px rgba(15, 23, 42, 0.35)",
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 14, alignItems: "flex-start" },
        standardInfo: { backgroundColor: designTokens.accentSoft },
      },
    },
    MuiSkeleton: {
      styleOverrides: {
        root: { backgroundColor: "rgba(15, 23, 42, 0.06)" },
      },
    },
    // Tablas: sin marco ni separadores de columna; encabezado discreto,
    // filas con hover tenue. La tabla vive dentro de una superficie.
    MuiDataGrid: {
      styleOverrides: {
        root: {
          border: "none",
          fontSize: "0.8125rem",
          "--DataGrid-rowBorderColor": "rgba(15, 23, 42, 0.06)",
          "--DataGrid-containerBackground": "transparent",
          "& .MuiDataGrid-columnHeaders": { borderBottom: "1px solid rgba(15, 23, 42, 0.08)" },
          "& .MuiDataGrid-columnHeaderTitle": {
            fontWeight: 600,
            fontSize: "0.75rem",
            color: designTokens.textCaption,
          },
          "& .MuiDataGrid-columnSeparator": { display: "none" },
          "& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within, & .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within":
            { outline: "none" },
          "& .MuiDataGrid-cell:focus-visible": { outline: `2px solid ${palette.primary.main}`, outlineOffset: -2 },
          "& .MuiDataGrid-row": { transition: "background-color 120ms ease" },
          // Hover solo con mouse: en touch el :hover se queda "pegado" tras tocar una fila.
          "@media (hover: hover) and (pointer: fine)": {
            "& .MuiDataGrid-row:hover": { backgroundColor: "rgba(15, 23, 42, 0.025)" },
          },
          "@media (hover: none)": {
            "& .MuiDataGrid-row:hover": { backgroundColor: "transparent" },
          },
          "& .MuiDataGrid-footerContainer": { borderTop: "1px solid rgba(15, 23, 42, 0.06)" },
          "& .MuiDataGrid-overlay": { backgroundColor: "rgba(255, 255, 255, 0.6)" },
        },
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
