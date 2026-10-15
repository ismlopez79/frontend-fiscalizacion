import { Stack } from "@mui/material";
import ConstructionIcon from "@mui/icons-material/ConstructionOutlined";
import { PageHeader } from "@/components/ui/PageHeader";
import { Surface } from "@/components/ui/Surface";
import { EmptyState } from "@/components/ui/EmptyState";

interface PageStubProps {
  title: string;
  description: string;
  /** Bloque del roadmap de frontend donde se implementa esta pantalla. */
  block: string;
}

/**
 * Placeholder explicito para pantallas todavia no implementadas.
 * Existe para que ninguna ruta del inventario quede omitida en silencio
 * (regla del prompt de frontend, seccion 4): el usuario ve exactamente
 * que pantalla falta y en que bloque del roadmap se construye.
 */
export function PageStub({ title, description, block }: PageStubProps) {
  return (
    <Stack spacing={{ xs: 2, md: 2.5 }} sx={{ flexShrink: 0, pb: 2 }}>
      <PageHeader title={title} subtitle={description} />
      <Surface>
        <EmptyState
          icon={<ConstructionIcon />}
          title="Pantalla en construcción"
          hint={`Pendiente de implementación — ${block} del roadmap de frontend.`}
        />
      </Surface>
    </Stack>
  );
}
