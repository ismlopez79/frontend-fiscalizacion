import { Breadcrumbs as MuiBreadcrumbs, Link, Typography } from "@mui/material";
import { Link as RouterLink, useLocation } from "react-router-dom";

const LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  actas: "Actas",
  pendientes: "Pendientes",
  nueva: "Nueva acta",
  editar: "Editar",
  reportes: "Reportes",
  administracion: "Administración",
  departamentos: "Departamentos",
  duicentros: "Duicentros",
  delegados: "Delegados",
  categorias: "Categorías",
  "tipos-incidente": "Tipos de incidente",
  usuarios: "Usuarios",
  roles: "Roles y permisos",
  auditoria: "Auditoría",
  perfil: "Mi cuenta",
  elecciones: "Elecciones",
  fiscalizacion: "Fiscalización",
  "pendientes-revision": "Pendientes de revisión",
  "periodos-electorales": "Períodos electorales",
  "delegados-temporales": "Delegados temporales",
  "centros-servicio": "Centros de servicio",
  asignaciones: "Asignaciones",
  "preguntas-fiscalizacion": "Preguntas de fiscalización",
};

export function Breadcrumbs() {
  const location = useLocation();
  const segments = location.pathname.split("/").filter(Boolean);

  if (segments.length === 0) return <span />;

  return (
    <MuiBreadcrumbs sx={{ display: { xs: "none", sm: "flex" } }}>
      {segments.map((segment, index) => {
        const path = "/" + segments.slice(0, index + 1).join("/");
        const isLast = index === segments.length - 1;
        const label = LABELS[segment] ?? segment;

        return isLast ? (
          <Typography key={path} color="text.primary" variant="body2" fontWeight={600}>
            {label}
          </Typography>
        ) : (
          <Link key={path} component={RouterLink} to={path} underline="hover" variant="body2">
            {label}
          </Link>
        );
      })}
    </MuiBreadcrumbs>
  );
}
