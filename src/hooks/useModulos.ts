import { useQuery } from "@tanstack/react-query";
import { modulosApi } from "@/api/modulosApi";

export const MODULOS_QUERY_KEY = ["modulos"];

/**
 * Se llama desde AppShell (no solo en login) porque el estado puede cambiar
 * en caliente mientras el usuario tiene la sesion abierta — ver seccion 4.2
 * del prompt de frontend. El ocultamiento de menu que resulta de esto es
 * solo UX: la seguridad real la impone el backend negando los permisos
 * FORM_* cuando el modulo esta apagado.
 *
 * Mientras la query esta cargando asumimos habilitado (evita el parpadeo de
 * ocultar y volver a mostrar el item de menu en el caso comun).
 */
export function useModulos() {
  const query = useQuery({
    queryKey: MODULOS_QUERY_KEY,
    queryFn: modulosApi.getModulos,
  });

  const electionsModule = query.data?.find((m) => m.code === "ELECTIONS") ?? null;
  const isElectionsEnabled = electionsModule?.enabled ?? true;

  // Modo practica (actas simuladas que no se guardan): viene apagado y es una
  // opcion extra, no algo que se quita — mientras carga se asume apagado.
  const isTrainingEnabled = query.data?.find((m) => m.code === "TRAINING")?.enabled ?? false;

  return { ...query, modules: query.data ?? [], electionsModule, isElectionsEnabled, isTrainingEnabled };
}
