/**
 * Tokens de color por estado de acta. Un solo lugar de verdad: cualquier chip,
 * borde de tarjeta o indicador de lista debe leer de aqui, nunca hardcodear el color.
 *
 * Cada estado combina color + icono (nunca solo color) para no depender
 * exclusivamente de la percepcion de color del usuario.
 */
import type { SvgIconComponent } from "@mui/icons-material";
import EditNoteIcon from "@mui/icons-material/EditNote";
import CheckIcon from "@mui/icons-material/Check";
import ScheduleIcon from "@mui/icons-material/Schedule";
import ReportProblemIcon from "@mui/icons-material/ReportProblem";
import VerifiedIcon from "@mui/icons-material/Verified";
import CancelIcon from "@mui/icons-material/Cancel";
import BlockIcon from "@mui/icons-material/Block";

export type ActaStatus =
  | "BORRADOR"
  | "REGISTRADA"
  | "PENDIENTE_REVISION"
  | "OBSERVADA"
  | "APROBADA"
  | "RECHAZADA"
  | "ANULADA";

interface StatusToken {
  label: string;
  color: string;
  backgroundColor: string;
  borderColor: string;
  icon: SvgIconComponent;
  strikethrough?: boolean;
}

/**
 * Pastilla con borde, paleta v2: verde/ambar/rojo son los 3 estados
 * semanticos "duros" del spec (activo-aprobada / pendiente / fallo). Los
 * demas estados de acta (borrador, registrada, observada, anulada) usan
 * tonos neutros o informativos propios para no perder la distincion entre
 * los 7 estados, siempre acompañados de icono y etiqueta (nunca solo color).
 */
export const ACTA_STATUS_TOKENS: Record<ActaStatus, StatusToken> = {
  BORRADOR: {
    label: "Borrador",
    color: "#475569",
    backgroundColor: "#F1F5F9",
    borderColor: "#E2E8F0",
    icon: EditNoteIcon,
  },
  REGISTRADA: {
    label: "Registrada",
    color: "#1D4ED8",
    backgroundColor: "#EEF4FF",
    borderColor: "#C7D9FB",
    icon: CheckIcon,
  },
  PENDIENTE_REVISION: {
    label: "Pendiente de revisión",
    color: "#B45309",
    backgroundColor: "#FEF6E7",
    borderColor: "#F6DFAE",
    icon: ScheduleIcon,
  },
  OBSERVADA: {
    label: "Observada",
    color: "#9A3412",
    backgroundColor: "#FEF0E6",
    borderColor: "#F7CDA8",
    icon: ReportProblemIcon,
  },
  APROBADA: {
    label: "Aprobada",
    color: "#15803D",
    backgroundColor: "#ECFDF3",
    borderColor: "#B7E9CB",
    icon: VerifiedIcon,
  },
  RECHAZADA: {
    label: "Rechazada",
    color: "#B42318",
    backgroundColor: "#FEF3F2",
    borderColor: "#F6C9C4",
    icon: CancelIcon,
  },
  ANULADA: {
    label: "Anulada",
    color: "#475569",
    backgroundColor: "#F1F5F9",
    borderColor: "#E2E8F0",
    icon: BlockIcon,
    strikethrough: true,
  },
};
