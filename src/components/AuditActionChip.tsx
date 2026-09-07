import { Chip } from "@mui/material";
import type { ChipProps } from "@mui/material";
import type { AuditAction } from "@/types/audit";

/**
 * Color por accion de auditoria. Mismo criterio que EstadoActaChip: un
 * unico punto que decide el color, para no duplicar esta logica en cada
 * pantalla que liste audit_logs.
 */
const ACTION_COLOR: Record<string, ChipProps["color"]> = {
  CREATE: "success",
  LOGIN: "success",
  APPROVE: "success",
  UPDATE: "info",
  OBSERVE: "warning",
  REJECT: "error",
  DELETE: "error",
  LOGIN_FAILED: "error",
};

interface AuditActionChipProps {
  action: AuditAction;
  size?: "small" | "medium";
}

export function AuditActionChip({ action, size = "small" }: AuditActionChipProps) {
  return (
    <Chip
      size={size}
      label={action}
      color={ACTION_COLOR[action] ?? "default"}
      variant="outlined"
      sx={{ fontWeight: 600, letterSpacing: 0.2 }}
    />
  );
}
