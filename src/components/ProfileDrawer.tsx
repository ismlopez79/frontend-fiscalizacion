import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  Alert,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  Link,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/CloseRounded";
import ContentCopyIcon from "@mui/icons-material/ContentCopyOutlined";
import CheckIcon from "@mui/icons-material/CheckRounded";
import EditIcon from "@mui/icons-material/EditOutlined";
import { designTokens } from "@/theme/theme";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/** Curva tipo iOS para drawers: arranca rapido y se asienta suave. */
const DRAWER_EASING = "cubic-bezier(0.32, 0.72, 0, 1)";

export interface ProfileField {
  label: string;
  /** null/"" se muestra como "No registrado" en vez de un guion suelto. */
  value: ReactNode | null;
  /** tel:/mailto: — vuelve el valor un enlace accionable. */
  href?: string;
  /** Texto plano a copiar al portapapeles (muestra el boton de copiar). */
  copyValue?: string | null;
  /** DUI, telefono, fechas: cifras alineadas. */
  numeric?: boolean;
}

export interface ProfileSection {
  title: string;
  fields: ProfileField[];
}

interface ProfileDrawerProps {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  error: string | null;
  avatar: ReactNode;
  fullName?: string;
  username?: string;
  /** Pastillas de estado bajo el nombre (activo, bloqueada, primer ingreso). */
  badges?: ReactNode;
  sections: ProfileSection[];
  /** Si se pasa, el pie del drawer ofrece saltar directo al formulario de edicion. */
  onEdit?: () => void;
}

/**
 * Ficha de solo lectura de una persona (usuario permanente o delegado
 * temporal). Se abre desde el listado sin perder la posicion de la tabla —
 * por eso es un drawer lateral y no una pagina aparte ni un modal.
 */
export function ProfileDrawer({
  open,
  onClose,
  loading,
  error,
  avatar,
  fullName,
  username,
  badges,
  sections,
  onEdit,
}: ProfileDrawerProps) {
  const reducedMotion = useReducedMotion();

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      transitionDuration={reducedMotion ? 0 : { enter: 320, exit: 200 }}
      SlideProps={{ easing: { enter: DRAWER_EASING, exit: DRAWER_EASING } }}
      PaperProps={{
        sx: {
          width: { xs: "100%", sm: 420 },
          display: "flex",
          flexDirection: "column",
          borderLeft: "1px solid",
          borderColor: "divider",
        },
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 3, pt: 2, pb: 1 }}>
        <Typography variant="subtitle2" color="text.secondary">
          Perfil
        </Typography>
        <IconButton aria-label="Cerrar perfil" onClick={onClose} size="small" edge="end">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Stack>

      <Box sx={{ flex: 1, overflowY: "auto", px: 3, pb: 3 }}>
        {error ? (
          <Alert severity="error" sx={{ mt: 1 }}>
            {error}
          </Alert>
        ) : (
          <>
            <Stack alignItems="center" spacing={1.25} sx={{ pt: 1, pb: 3, textAlign: "center" }}>
              {loading ? <Skeleton variant="circular" width={88} height={88} /> : avatar}
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700, textWrap: "balance" }}>
                  {loading ? <Skeleton width={200} sx={{ mx: "auto" }} /> : fullName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {loading ? <Skeleton width={110} sx={{ mx: "auto" }} /> : `@${username}`}
                </Typography>
              </Box>
              {!loading && badges && (
                <Stack direction="row" spacing={0.75} justifyContent="center" flexWrap="wrap" rowGap={0.75}>
                  {badges}
                </Stack>
              )}
            </Stack>

            <Stack spacing={2.5} divider={<Divider flexItem />}>
              {sections.map((section) => (
                <Box key={section.title}>
                  <Typography
                    variant="overline"
                    sx={{ color: designTokens.textCaption, letterSpacing: "0.06em", lineHeight: 1.6 }}
                  >
                    {section.title}
                  </Typography>
                  <Stack component="dl" spacing={1.25} sx={{ m: 0, mt: 1 }}>
                    {section.fields.map((field) => (
                      <FieldRow key={field.label} field={field} loading={loading} />
                    ))}
                  </Stack>
                </Box>
              ))}
            </Stack>
          </>
        )}
      </Box>

      {onEdit && !error && (
        <Box sx={{ px: 3, py: 2, borderTop: "1px solid", borderColor: "divider" }}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<EditIcon />}
            disabled={loading}
            onClick={onEdit}
            sx={{
              transition: `transform 160ms ${designTokens.easeOut}, background-color 150ms ease`,
              "&:active": { transform: "scale(0.97)" },
            }}
          >
            Editar datos
          </Button>
        </Box>
      )}
    </Drawer>
  );
}

function FieldRow({ field, loading }: { field: ProfileField; loading: boolean }) {
  const isEmpty = field.value === null || field.value === "";

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "116px 1fr auto", alignItems: "center", columnGap: 1.5, minHeight: 28 }}>
      <Typography component="dt" variant="body2" sx={{ color: designTokens.textCaption }}>
        {field.label}
      </Typography>
      <Typography
        component="dd"
        variant="body2"
        sx={{
          m: 0,
          fontWeight: isEmpty ? 400 : 500,
          color: isEmpty ? designTokens.textDisabled : "text.primary",
          fontVariantNumeric: field.numeric ? "tabular-nums" : undefined,
          overflowWrap: "anywhere",
        }}
      >
        {loading ? (
          <Skeleton width="70%" />
        ) : isEmpty ? (
          "No registrado"
        ) : field.href ? (
          <Link href={field.href} underline="hover" sx={{ textUnderlineOffset: "3px" }}>
            {field.value}
          </Link>
        ) : (
          field.value
        )}
      </Typography>
      {!loading && field.copyValue ? <CopyButton value={field.copyValue} label={field.label} /> : <span />}
    </Box>
  );
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(timeout.current), []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      clearTimeout(timeout.current);
      timeout.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      // Portapapeles bloqueado (http sin TLS, permisos): el valor sigue visible para copiarlo a mano.
    }
  };

  // Ambos iconos montados y apilados: el cambio es un crossfade con leve
  // escala + blur, interrumpible si se vuelve a pulsar antes de que termine.
  const iconSx = (visible: boolean) => ({
    position: "absolute" as const,
    inset: 0,
    m: "auto",
    fontSize: 16,
    opacity: visible ? 1 : 0,
    transform: visible ? "scale(1)" : "scale(0.6)",
    filter: visible ? "blur(0px)" : "blur(2px)",
    transition: `opacity 180ms ${designTokens.easeOut}, transform 180ms ${designTokens.easeOut}, filter 180ms ${designTokens.easeOut}`,
  });

  return (
    <Tooltip title={copied ? "Copiado" : `Copiar ${label.toLowerCase()}`} placement="left">
      <IconButton
        size="small"
        aria-label={`Copiar ${label.toLowerCase()}`}
        onClick={handleCopy}
        sx={{
          width: 28,
          height: 28,
          position: "relative",
          color: copied ? "success.main" : designTokens.textCaption,
          transition: `transform 160ms ${designTokens.easeOut}, color 150ms ease`,
          "&:active": { transform: "scale(0.92)" },
        }}
      >
        <ContentCopyIcon sx={iconSx(!copied)} />
        <CheckIcon sx={iconSx(copied)} />
      </IconButton>
    </Tooltip>
  );
}
