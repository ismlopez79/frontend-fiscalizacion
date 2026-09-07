import type { SvgIconComponent } from "@mui/icons-material";
import DashboardIcon from "@mui/icons-material/DashboardOutlined";
import DescriptionIcon from "@mui/icons-material/DescriptionOutlined";
import FactCheckIcon from "@mui/icons-material/FactCheckOutlined";
import AssessmentIcon from "@mui/icons-material/AssessmentOutlined";
import SettingsIcon from "@mui/icons-material/SettingsOutlined";
import MapIcon from "@mui/icons-material/MapOutlined";
import StoreIcon from "@mui/icons-material/StoreOutlined";
import BadgeIcon from "@mui/icons-material/BadgeOutlined";
import CategoryIcon from "@mui/icons-material/CategoryOutlined";
import WarningAmberIcon from "@mui/icons-material/WarningAmberOutlined";
import GroupIcon from "@mui/icons-material/GroupOutlined";
import VpnKeyIcon from "@mui/icons-material/VpnKeyOutlined";
import HistoryIcon from "@mui/icons-material/HistoryOutlined";

export interface NavItem {
  label: string;
  path: string;
  icon: SvgIconComponent;
  /** Roles que pueden ver este item. Si se omite, es visible para cualquier usuario autenticado. */
  allowedRoles?: string[];
  children?: NavItem[];
}

/**
 * Configuracion unica de navegacion. Se filtra por rol al renderizar el
 * sidebar, para que un DIGITADOR nunca vea enlaces a modulos que no puede
 * usar (ver seccion 4.2 del prompt de frontend).
 */
export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", path: "/dashboard", icon: DashboardIcon },
  { label: "Actas", path: "/actas", icon: DescriptionIcon },
  {
    label: "Actas pendientes",
    path: "/actas/pendientes",
    icon: FactCheckIcon,
    allowedRoles: ["SUPERVISOR", "ADMINISTRADOR"],
  },
  {
    label: "Reportes",
    path: "/reportes",
    icon: AssessmentIcon,
    // Permiso REPORT_EXPORT del backend, sembrado solo para estos dos roles.
    allowedRoles: ["ADMINISTRADOR", "SUPERVISOR"],
  },
  {
    label: "Administración",
    path: "/administracion",
    icon: SettingsIcon,
    allowedRoles: ["ADMINISTRADOR", "SUPERVISOR"],
    children: [
      { label: "Departamentos", path: "/administracion/departamentos", icon: MapIcon },
      { label: "Duicentros", path: "/administracion/duicentros", icon: StoreIcon },
      { label: "Delegados", path: "/administracion/delegados", icon: BadgeIcon },
      { label: "Categorías de producción", path: "/administracion/categorias", icon: CategoryIcon },
      { label: "Tipos de incidente", path: "/administracion/tipos-incidente", icon: WarningAmberIcon },
      {
        label: "Usuarios",
        path: "/administracion/usuarios",
        icon: GroupIcon,
        allowedRoles: ["ADMINISTRADOR"],
      },
      {
        label: "Roles y permisos",
        path: "/administracion/roles",
        icon: VpnKeyIcon,
        allowedRoles: ["ADMINISTRADOR"],
      },
      {
        label: "Auditoría",
        path: "/administracion/auditoria",
        icon: HistoryIcon,
        allowedRoles: ["ADMINISTRADOR"],
      },
    ],
  },
];
