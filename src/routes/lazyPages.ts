import { lazy } from "react";
import type { ComponentType } from "react";

/**
 * Carga bajo demanda de las pantallas (code splitting). Cada pantalla vive
 * en su propio archivo JS que solo se descarga al abrirla: el login ya no
 * baja el codigo de las tablas (DataGrid), las graficas (recharts) ni el
 * resto de la app.
 *
 * Los importadores quedan en un solo mapa para poder PRECARGARLOS en
 * segundo plano una vez que la app ya se pinto (ver prefetchPages): asi la
 * primera carga es liviana y navegar despues sigue siendo instantaneo.
 */
const loaders = {
  ChangePasswordPage: () => import("@/pages/auth/ChangePasswordPage"),
  DashboardPage: () => import("@/pages/dashboard/DashboardPage"),
  ActasListPage: () => import("@/pages/actas/ActasListPage"),
  ActasPendientesPage: () => import("@/pages/actas/ActasPendientesPage"),
  ActaFormPage: () => import("@/pages/actas/ActaFormPage"),
  ActaDetailPage: () => import("@/pages/actas/ActaDetailPage"),
  ReportesPage: () => import("@/pages/reportes/ReportesPage"),
  DepartamentosPage: () => import("@/pages/administracion/departamentos/DepartamentosPage"),
  DuicentrosPage: () => import("@/pages/administracion/duicentros/DuicentrosPage"),
  DelegadosPage: () => import("@/pages/administracion/delegados/DelegadosPage"),
  PartidosPoliticosPage: () => import("@/pages/administracion/partidos-politicos/PartidosPoliticosPage"),
  CategoriasPage: () => import("@/pages/administracion/categorias/CategoriasPage"),
  TiposIncidentePage: () => import("@/pages/administracion/tipos-incidente/TiposIncidentePage"),
  UsuariosPage: () => import("@/pages/administracion/usuarios/UsuariosPage"),
  RolesPage: () => import("@/pages/administracion/roles/RolesPage"),
  AuditoriaPage: () => import("@/pages/administracion/auditoria/AuditoriaPage"),
  ModulosPage: () => import("@/pages/administracion/modulos/ModulosPage"),
  PerfilPage: () => import("@/pages/perfil/PerfilPage"),
  PeriodosElectoralesPage: () => import("@/pages/elecciones/periodos-electorales/PeriodosElectoralesPage"),
  DelegadosTemporalesPage: () => import("@/pages/elecciones/delegados-temporales/DelegadosTemporalesPage"),
  CentrosServicioPage: () => import("@/pages/elecciones/centros-servicio/CentrosServicioPage"),
  AsignacionesPage: () => import("@/pages/elecciones/asignaciones/AsignacionesPage"),
  TemporalesACargoPage: () => import("@/pages/elecciones/temporales-a-cargo/TemporalesACargoPage"),
  // Fiscalizacion por fases
  MisActividadesPage: () => import("@/pages/fiscalizacion-electoral/mis-actividades/MisActividadesPage"),
  InformeActividadPage: () => import("@/pages/fiscalizacion-electoral/informe/InformeActividadPage"),
  ActividadesPage: () => import("@/pages/fiscalizacion-electoral/actividades/ActividadesPage"),
  ActividadDetailPage: () => import("@/pages/fiscalizacion-electoral/actividades/ActividadDetailPage"),
  BandejaInformesPage: () => import("@/pages/fiscalizacion-electoral/informes/BandejaInformesPage"),
  FasesPage: () => import("@/pages/fiscalizacion-electoral/fases/FasesPage"),
  PlantillasPage: () => import("@/pages/fiscalizacion-electoral/plantillas/PlantillasPage"),
  PlantillaEditorPage: () => import("@/pages/fiscalizacion-electoral/plantillas/PlantillaEditorPage"),
} as const;

type PageName = keyof typeof loaders;

/** Las paginas usan export con nombre (export function XPage); React.lazy necesita un default. */
function lazyPage<K extends PageName>(name: K) {
  return lazy(async () => {
    const mod = (await loaders[name]()) as unknown as Record<K, ComponentType>;
    return { default: mod[name] };
  });
}

export const ChangePasswordPage = lazyPage("ChangePasswordPage");
export const DashboardPage = lazyPage("DashboardPage");
export const ActasListPage = lazyPage("ActasListPage");
export const ActasPendientesPage = lazyPage("ActasPendientesPage");
export const ActaFormPage = lazyPage("ActaFormPage");
export const ActaDetailPage = lazyPage("ActaDetailPage");
export const ReportesPage = lazyPage("ReportesPage");
export const DepartamentosPage = lazyPage("DepartamentosPage");
export const DuicentrosPage = lazyPage("DuicentrosPage");
export const DelegadosPage = lazyPage("DelegadosPage");
export const PartidosPoliticosPage = lazyPage("PartidosPoliticosPage");
export const CategoriasPage = lazyPage("CategoriasPage");
export const TiposIncidentePage = lazyPage("TiposIncidentePage");
export const UsuariosPage = lazyPage("UsuariosPage");
export const RolesPage = lazyPage("RolesPage");
export const AuditoriaPage = lazyPage("AuditoriaPage");
export const ModulosPage = lazyPage("ModulosPage");
export const PerfilPage = lazyPage("PerfilPage");
export const PeriodosElectoralesPage = lazyPage("PeriodosElectoralesPage");
export const DelegadosTemporalesPage = lazyPage("DelegadosTemporalesPage");
export const CentrosServicioPage = lazyPage("CentrosServicioPage");
export const AsignacionesPage = lazyPage("AsignacionesPage");
export const TemporalesACargoPage = lazyPage("TemporalesACargoPage");
export const MisActividadesPage = lazyPage("MisActividadesPage");
export const InformeActividadPage = lazyPage("InformeActividadPage");
export const ActividadesPage = lazyPage("ActividadesPage");
export const ActividadDetailPage = lazyPage("ActividadDetailPage");
export const BandejaInformesPage = lazyPage("BandejaInformesPage");
export const FasesPage = lazyPage("FasesPage");
export const PlantillasPage = lazyPage("PlantillasPage");
export const PlantillaEditorPage = lazyPage("PlantillaEditorPage");

let prefetched = false;

/**
 * Precarga, en segundo plano y de a una, las pantallas que el usuario
 * probablemente abra. Se llama desde AppShell cuando el navegador queda
 * ocioso tras el primer pintado — nunca compite con la carga inicial.
 * En conexiones lentas o con "ahorro de datos" no precarga nada: esas
 * pantallas se bajan solo al abrirlas.
 */
export function prefetchPages(): void {
  if (prefetched) return;
  prefetched = true;

  const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType ?? "")) return;

  const queue = Object.values(loaders);
  const idle =
    (window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback ??
    ((cb: () => void) => window.setTimeout(cb, 200));

  const next = () => {
    const load = queue.shift();
    if (!load) return;
    // Un fallo de red aqui no importa: la pantalla se volvera a pedir al abrirla.
    load().catch(() => undefined).finally(() => idle(next));
  };
  idle(next);
}
