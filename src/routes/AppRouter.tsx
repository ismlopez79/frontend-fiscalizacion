import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/layouts/AppShell";
import { ProtectedRoute } from "./ProtectedRoute";
import { RequireFullAccess } from "./RequireFullAccess";

import { LoginPage } from "@/pages/auth/LoginPage";
import { ChangePasswordPage } from "@/pages/auth/ChangePasswordPage";
import { DashboardPage } from "@/pages/dashboard/DashboardPage";
import { ActasListPage } from "@/pages/actas/ActasListPage";
import { ActasPendientesPage } from "@/pages/actas/ActasPendientesPage";
import { ActaFormPage } from "@/pages/actas/ActaFormPage";
import { ActaDetailPage } from "@/pages/actas/ActaDetailPage";
import { ReportesPage } from "@/pages/reportes/ReportesPage";
import { DepartamentosPage } from "@/pages/administracion/departamentos/DepartamentosPage";
import { DuicentrosPage } from "@/pages/administracion/duicentros/DuicentrosPage";
import { DelegadosPage } from "@/pages/administracion/delegados/DelegadosPage";
import { CategoriasPage } from "@/pages/administracion/categorias/CategoriasPage";
import { TiposIncidentePage } from "@/pages/administracion/tipos-incidente/TiposIncidentePage";
import { UsuariosPage } from "@/pages/administracion/usuarios/UsuariosPage";
import { RolesPage } from "@/pages/administracion/roles/RolesPage";
import { AuditoriaPage } from "@/pages/administracion/auditoria/AuditoriaPage";
import { PerfilPage } from "@/pages/perfil/PerfilPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { ForbiddenPage } from "@/pages/ForbiddenPage";

const ADMIN_ONLY = ["ADMINISTRADOR"];
const ADMIN_AND_SUPERVISOR = ["ADMINISTRADOR", "SUPERVISOR"];
const REVIEWERS = ["ADMINISTRADOR", "SUPERVISOR"];

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
        <Route path="/cambiar-password" element={<ChangePasswordPage />} />

        <Route element={<RequireFullAccess />}>
          <Route element={<AppShell />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />

            <Route path="/actas" element={<ActasListPage />} />
            <Route path="/actas/nueva" element={<ActaFormPage />} />
            <Route path="/actas/:id" element={<ActaDetailPage />} />
            <Route path="/actas/:id/editar" element={<ActaFormPage />} />

            <Route path="/perfil" element={<PerfilPage />} />

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
              <Route path="/administracion/categorias" element={<CategoriasPage />} />
              <Route path="/administracion/tipos-incidente" element={<TiposIncidentePage />} />
            </Route>

            {/* Administracion: solo administrador */}
            <Route element={<ProtectedRoute allowedRoles={ADMIN_ONLY} />}>
              <Route path="/administracion/usuarios" element={<UsuariosPage />} />
              <Route path="/administracion/roles" element={<RolesPage />} />
              <Route path="/administracion/auditoria" element={<AuditoriaPage />} />
            </Route>
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
