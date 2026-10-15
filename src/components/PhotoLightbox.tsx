import { useEffect, useState } from "react";
import { Box, Modal } from "@mui/material";
import { designTokens } from "@/theme/theme";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const ENTER_MS = 260;
const EXIT_MS = 180;

interface PhotoLightboxProps {
  open: boolean;
  src: string | null;
  alt: string;
  onClose: () => void;
}

/**
 * Foto de perfil ampliada en un circulo al centro de la pantalla. Se cierra
 * al pulsar fuera de la foto o con Escape. Modal de MUI por debajo: bloquea
 * el scroll, atrapa el foco y, si se abre encima del drawer de perfil,
 * Escape solo cierra la foto (el modal de arriba).
 */
export function PhotoLightbox({ open, src, alt, onClose }: PhotoLightboxProps) {
  const reducedMotion = useReducedMotion();
  // mounted: el Modal existe en el DOM. visible: estado final de la transicion.
  // Separados para poder animar la salida antes de desmontar.
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      // Doble rAF: garantiza que el estado inicial (oculto) se pinte antes de transicionar.
      let raf2 = 0;
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => setVisible(true));
      });
      return () => {
        cancelAnimationFrame(raf1);
        cancelAnimationFrame(raf2);
      };
    }
    setVisible(false);
    const timeout = setTimeout(() => setMounted(false), reducedMotion ? 0 : EXIT_MS);
    return () => clearTimeout(timeout);
  }, [open, reducedMotion]);

  if (!mounted || !src) return null;

  const duration = visible ? ENTER_MS : EXIT_MS;
  const hiddenTransform = reducedMotion ? "scale(1)" : "scale(0.92)";

  return (
    <Modal open={mounted} onClose={onClose} hideBackdrop aria-label={alt}>
      <Box
        onClick={onClose}
        sx={{
          position: "fixed",
          inset: 0,
          display: "grid",
          placeItems: "center",
          p: 2,
          cursor: "zoom-out",
          outline: "none",
          bgcolor: "rgba(15, 23, 42, 0.72)",
          backdropFilter: "blur(6px)",
          opacity: visible ? 1 : 0,
          transition: `opacity ${duration}ms ${designTokens.easeOut}`,
        }}
      >
        <Box
          component="img"
          src={src}
          alt={alt}
          // Pulsar la foto no cierra: solo el area de afuera.
          onClick={(e) => e.stopPropagation()}
          sx={{
            width: "min(72vmin, 380px)",
            aspectRatio: "1",
            borderRadius: "50%",
            objectFit: "cover",
            cursor: "default",
            border: "4px solid rgba(255, 255, 255, 0.9)",
            boxShadow: "0 24px 64px rgba(15, 23, 42, 0.45), 0 4px 12px rgba(15, 23, 42, 0.25)",
            userSelect: "none",
            opacity: visible ? 1 : 0,
            transform: visible ? "scale(1)" : hiddenTransform,
            transition: `opacity ${duration}ms ${designTokens.easeOut}, transform ${duration}ms ${designTokens.easeOut}`,
          }}
        />
      </Box>
    </Modal>
  );
}
