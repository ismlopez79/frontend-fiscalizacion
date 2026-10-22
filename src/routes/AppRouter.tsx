import { Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/layouts/AppShell";
import { ProtectedRoute } from "./ProtectedRoute";
import { RequireFullAccess } from "./RequireFullAccess";
import { RequireCompleteProfile } from "./RequireCompleteProfile";

// Pantallas que se cargan bajo demanda (cada una en su propio archivo JS):
// ver lazyPages.ts. Login, 404 y 403 quedan en la carga inicial — son
// chicas y la primera debe aparecer sin esperar una descarga extra.
//
// REGLA: una pantalla nueva se registra en lazyPages.ts y se importa desde
// ahi. NO importarla directo aqui desde "@/pages/...": eso la mete de nuevo
// en el archivo JS inicial y vuelve lenta la primera carga (ver CLAUDE.md).
import {
  ChangePasswordPage,
  DashboardPage,
  ActasListPage,
  ActasPendientesPage,
  ActaFormPage,
  ActaDetailPage,
  ReportesPage,
  DepartamentosPage,
  DuicentrosPage,
  DelegadosPage,
  PartidosPoliticosPage,
  CategoriasPage,
  TiposIncidentePage,
  UsuariosPage,
  RolesPage,
  AuditoriaPage,
  ModulosPage,
  PerfilPage,
  PeriodosElectoralesPage,
  DelegadosTemporalesPage,
  CentrosServicioPage,
  AsignacionesPage,
  TemporalesACargoPage,
  MisActividadesPage,
  InformeActividadPage,
  ActividadesPage,
  ActividadDetailPage,
  BandejaInformesPage,
  FasesPage,
  PlantillasPage,
  PlantillaEditorPage,
} from "./lazyPages";
import { LoginPage } from "@/pages/auth/LoginPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { ForbiddenPage } from "@/pages/ForbiddenPage";

const ADMIN_ONLY = ["ADMINISTRADOR"];
const ADMIN_AND_SUPERVISOR = ["ADMINISTRADOR", "SUPERVISOR"];
const REVIEWERS = ["ADMINISTRADOR", "SUPERVISOR"];
const DELEGATES = ["DELEGADO_TEMPORAL", "DIGITADOR", "ADMINISTRADOR"];

export function AppRouter() {
  return (
    <Routes>
      {/* Publico */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/403" element={<ForbiddenPage />} />

      {/* Autenticado (cualquier rol) */}
      <Route element={<ProtectedRoute />}>
        {/* Fuera de RequireFullAccess (si no, loop) y fuera de AppShell
            (sin sidebar/menu) — ver scope PASSWORD_CHANGE_ONLY. */}
        <Route
          path="/cambiar-password"
          element={
            <Suspense fallback={null}>
              <ChangePasswordPage />
            </Suspense>
          }
        />

        <Route element={<RequireFullAccess />}>
          <Route element={<AppShell />}>
            {/* "Mi cuenta" queda fuera de RequireCompleteProfile: es donde se completan
                correo, telefono y foto cuando el backend bloquea por perfil incompleto. */}
            <Route path="/perfil" element={<PerfilPage />} />

            <Route element={<RequireCompleteProfile />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />

            <Route path="/actas" element={<ActasListPage />} />
            <Route path="/actas/nueva" element={<ActaFormPage />} />
            {/* Modo practica: la MISMA pantalla del formulario (mismo archivo JS,
                sin descarga extra); ella detecta esta ruta y no guarda nada real.
                La key evita que React reutilice el estado del formulario real
                al pasar de "nueva" a "practica" (o al reves). */}
            <Route path="/actas/practica" element={<ActaFormPage key="practica" />} />
            <Route path="/actas/:id" element={<ActaDetailPage />} />
            <Route path="/actas/:id/editar" element={<ActaFormPage />} />

            {/* Fiscalizacion electoral por fases. El informe lo abre cualquier rol:
                el backend decide (asignado, revisor o admin) y responde 403 si no. */}
            <Route path="/fiscalizacion-electoral/actividades/:id/informe" element={<InformeActividadPage />} />
            <Route element={<ProtectedRoute allowedRoles={DELEGATES} />}>
              <Route path="/fiscalizacion-electoral/mis-actividades" element={<MisActividadesPage />} />
            </Route>
            <Route element={<ProtectedRoute allowedRoles={REVIEWERS} />}>
              <Route path="/fiscalizacion-electoral/actividades" element={<ActividadesPage />} />
              <Route path="/fiscalizacion-electoral/actividades/:id" element={<ActividadDetailPage />} />
              <Route path="/fiscalizacion-electoral/informes" element={<BandejaInformesPage />} />
            </Route>
            <Route element={<ProtectedRoute allowedRoles={ADMIN_ONLY} />}>
              <Route path="/fiscalizacion-electoral/fases" element={<FasesPage />} />
              <Route path="/fiscalizacion-electoral/plantillas" element={<PlantillasPage />} />
              <Route path="/fiscalizacion-electoral/plantillas/nueva" element={<PlantillaEditorPage />} />
              <Route path="/fiscalizacion-electoral/plantillas/:id" element={<PlantillaEditorPage />} />
            </Route>

            {/* Solo supervisor/administrador */}
            <Route element={<ProtectedRoute allowedRoles={REVIEWERS} />}>
              <Route path="/actas/pendientes" element={<ActasPendientesPage />} />
              <Route path="/reportes" element={<ReportesPage />} />
            </Route>

            {/* Administracion: catalogos operativos (admin + supervisor) */}
            <Route element={<ProtectedRoute allowedRoles={ADMIN_AND_SUPERVISOR} />}>
              <Route path="/administracion/departamentos" element={<DepartamentosPage />} />
              <Route path="/administracion/duicentros" element={<DuicentrosPage />} />
              <Route path="/administracion/delegados" element={<DelegadosPage />} />
              <Route path="/administracion/partidos-politicos" element={<PartidosPoliticosPage />} />
              <Route path="/administracion/categorias" element={<CategoriasPage />} />
              <Route path="/administracion/tipos-incidente" element={<TiposIncidentePage />} />
            </Route>

            {/* Administracion: solo administrador */}
            <Route element={<ProtectedRoute allowedRoles={ADMIN_ONLY} />}>
              <Route path="/administracion/usuarios" element={<UsuariosPage />} />
              <Route path="/administracion/roles" element={<RolesPage />} />
              <Route path="/administracion/auditoria" element={<AuditoriaPage />} />
              <Route path="/administracion/modulos" element={<ModulosPage />} />
            </Route>

            {/* Elecciones: solo administrador */}
            <Route element={<ProtectedRoute allowedRoles={ADMIN_ONLY} />}>
              <Route path="/elecciones/periodos-electorales" element={<PeriodosElectoralesPage />} />
              <Route path="/elecciones/delegados-temporales" element={<DelegadosTemporalesPage />} />
              <Route path="/elecciones/centros-servicio" element={<CentrosServicioPage />} />
              <Route path="/elecciones/asignaciones" element={<AsignacionesPage />} />
              <Route path="/elecciones/temporales-a-cargo" element={<TemporalesACargoPage />} />
            </Route>
            </Route>
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
