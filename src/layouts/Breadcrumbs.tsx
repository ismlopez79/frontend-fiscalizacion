import { Breadcrumbs as MuiBreadcrumbs, Link, Typography } from "@mui/material";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import { Link as RouterLink, useLocation } from "react-router-dom";
import { designTokens } from "@/theme/theme";

const LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  actas: "Actas",
  pendientes: "Pendientes",
  nueva: "Nueva",
  practica: "Práctica",
  editar: "Editar",
  reportes: "Reportes",
  administracion: "Administración",
  departamentos: "Departamentos",
  duicentros: "Duicentros",
  delegados: "Delegados",
  "partidos-politicos": "Partidos políticos",
  categorias: "Categorías",
  "tipos-incidente": "Tipos de incidente",
  usuarios: "Usuarios",
  roles: "Roles y permisos",
  auditoria: "Auditoría",
  modulos: "Módulos del sistema",
  perfil: "Mi cuenta",
  "cambiar-password": "Cambiar contraseña",
  elecciones: "Elecciones",
  fiscalizacion: "Fiscalización",
  "pendientes-revision": "Pendientes de revisión",
  "periodos-electorales": "Períodos electorales",
  "delegados-temporales": "Delegados temporales",
  "centros-servicio": "Centros de servicio",
  asignaciones: "Asignaciones",
  "temporales-a-cargo": "Temporales a cargo",
  "preguntas-fiscalizacion": "Preguntas de fiscalización",
};

/** Un id numerico (detalle de acta, formulario) se muestra como "Detalle", no como "42". */
function labelFor(segment: string): string {
  if (/^\d+$/.test(segment)) return "Detalle";
  return LABELS[segment] ?? segment;
}

/**
 * Ruta de migas. En escritorio, la ruta completa con separadores tenues; en
 * movil no cabe, asi que solo el nombre de la pantalla actual (el boton de
 * regreso de cada pagina cubre la navegacion hacia atras).
 */
export function Breadcrumbs() {
  const location = useLocation();
  const segments = location.pathname.split("/").filter(Boolean);

  if (segments.length === 0) return <span />;

  const current = labelFor(segments[segments.length - 1]);

  return (
    <>
      <Typography
        variant="body2"
        noWrap
        sx={{ display: { xs: "block", sm: "none" }, fontWeight: 700, color: "text.primary", minWidth: 0 }}
      >
        {current}
      </Typography>
      <MuiBreadcrumbs
        separator={<ChevronRightRoundedIcon sx={{ fontSize: 16, color: designTokens.textDisabled }} />}
        sx={{ display: { xs: "none", sm: "flex" }, "& .MuiBreadcrumbs-separator": { mx: 0.25 } }}
      >
        {segments.map((segment, index) => {
          const path = "/" + segments.slice(0, index + 1).join("/");
          const isLast = index === segments.length - 1;
          const label = labelFor(segment);

          return isLast ? (
            <Typography key={path} color="text.primary" variant="body2" fontWeight={700} noWrap>
              {label}
            </Typography>
          ) : (
            <Link
              key={path}
              component={RouterLink}
              to={path}
              underline="hover"
              variant="body2"
              sx={{ color: designTokens.textSecondary, textUnderlineOffset: "3px", fontWeight: 500 }}
            >
              {label}
            </Link>
          );
        })}
      </MuiBreadcrumbs>
    </>
  );
}
