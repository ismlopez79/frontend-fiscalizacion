import type { SvgIconComponent } from "@mui/icons-material";
import GridViewIcon from "@mui/icons-material/GridViewOutlined";
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
import HowToVoteIcon from "@mui/icons-material/HowToVoteOutlined";
import EventAvailableIcon from "@mui/icons-material/EventAvailableOutlined";
import PersonPinCircleIcon from "@mui/icons-material/PersonPinCircleOutlined";
import ApartmentIcon from "@mui/icons-material/ApartmentOutlined";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonthOutlined";
import ExtensionIcon from "@mui/icons-material/ExtensionOutlined";
import FlagIcon from "@mui/icons-material/FlagOutlined";
import SchoolIcon from "@mui/icons-material/SchoolOutlined";
import SupervisorAccountIcon from "@mui/icons-material/SupervisorAccountOutlined";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import TodayIcon from "@mui/icons-material/TodayOutlined";
import EventNoteIcon from "@mui/icons-material/EventNoteOutlined";
import InboxIcon from "@mui/icons-material/MoveToInboxOutlined";
import TimelineIcon from "@mui/icons-material/ViewTimelineOutlined";
import ViewQuiltIcon from "@mui/icons-material/ViewQuiltOutlined";

export interface NavItem {
  label: string;
  path: string;
  icon: SvgIconComponent;
  /** Roles que pueden ver este item. Si se omite, es visible para cualquier usuario autenticado. */
  allowedRoles?: string[];
  /**
   * Si es true, el item se oculta cuando GET /modulos reporta ELECTIONS
   * apagado — refleja que FORM_CREATE/FORM_EDIT_OWN/FORM_VIEW_ALL/FORM_REVIEW
   * dejan de estar disponibles para todos los roles mientras el modulo este
   * apagado. Las paginas de preparacion de la proxima eleccion (periodos,
   * delegados temporales, centros, asignaciones) NO llevan esta
   * bandera: esos permisos de gestion nunca se gatean, el admin los necesita
   * con el modulo apagado.
   */
  requiresElectionsModule?: boolean;
  /** Si es true, el item solo se muestra cuando GET /modulos reporta TRAINING (modo practica) encendido. */
  requiresTrainingModule?: boolean;
  children?: NavItem[];
}

/**
 * Configuracion unica de navegacion: secciones (General, Administración,
 * Elecciones) con sus pantallas. Se filtra por rol al renderizar el
 * sidebar, para que un DIGITADOR nunca vea enlaces a modulos que no puede
 * usar (ver seccion 4.2 del prompt de frontend).
 */
export const NAV_ITEMS: NavItem[] = [
  {
    // Seccion del dia a dia. Su path no es una ruta: solo identifica al grupo
    // en el sidebar (que seccion esta abierta).
    label: "General",
    path: "/general",
    icon: GridViewIcon,
    children: [
      { label: "Dashboard", path: "/dashboard", icon: DashboardIcon },
      { label: "Actas", path: "/actas", icon: DescriptionIcon },
      {
        label: "Acta de práctica",
        path: "/actas/practica",
        icon: SchoolIcon,
        // Quienes tienen permiso de crear actas (POST /practica/actas exige el mismo).
        allowedRoles: ["DIGITADOR", "DELEGADO_TEMPORAL", "ADMINISTRADOR"],
        requiresTrainingModule: true,
      },
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
    ],
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
      { label: "Partidos políticos", path: "/administracion/partidos-politicos", icon: FlagIcon },
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
      {
        label: "Módulos del sistema",
        path: "/administracion/modulos",
        icon: ExtensionIcon,
        allowedRoles: ["ADMINISTRADOR"],
      },
    ],
  },
  {
    // Preparacion de la eleccion: cada hijo se filtra por su propio rol. La
    // fiscalizacion vive en el grupo "Fiscalización electoral" de abajo.
    label: "Elecciones",
    path: "/elecciones",
    icon: HowToVoteIcon,
    children: [
      {
        label: "Períodos electorales",
        path: "/elecciones/periodos-electorales",
        icon: CalendarMonthIcon,
        allowedRoles: ["ADMINISTRADOR"],
      },
      {
        label: "Delegados temporales",
        path: "/elecciones/delegados-temporales",
        icon: PersonPinCircleIcon,
        allowedRoles: ["ADMINISTRADOR"],
      },
      {
        label: "Centros de servicio",
        path: "/elecciones/centros-servicio",
        icon: ApartmentIcon,
        allowedRoles: ["ADMINISTRADOR"],
      },
      {
        label: "Asignaciones",
        path: "/elecciones/asignaciones",
        icon: EventAvailableIcon,
        allowedRoles: ["ADMINISTRADOR"],
      },
      {
        label: "Temporales a cargo",
        path: "/elecciones/temporales-a-cargo",
        icon: SupervisorAccountIcon,
        // Permiso ASSIGNMENT_MANAGE del backend, igual que "Asignaciones".
        allowedRoles: ["ADMINISTRADOR"],
      },
    ],
  },
  {
    // Fiscalizacion por fases (capacitaciones, impresion de papeletas,
    // votaciones...). Todo el grupo depende del modulo ELECTIONS: si GET
    // /modulos lo reporta apagado, el menu completo desaparece.
    label: "Fiscalización electoral",
    path: "/fiscalizacion-electoral",
    icon: FactCheckOutlinedIcon,
    requiresElectionsModule: true,
    children: [
      {
        label: "Mis actividades",
        path: "/fiscalizacion-electoral/mis-actividades",
        icon: TodayIcon,
        // FORM_CREATE / FORM_EDIT_OWN.
        allowedRoles: ["DELEGADO_TEMPORAL", "DIGITADOR"],
      },
      {
        label: "Actividades",
        path: "/fiscalizacion-electoral/actividades",
        icon: EventNoteIcon,
        // ASSIGNMENT_MANAGE (admin); el revisor lo consulta con FORM_VIEW_ALL/FORM_REVIEW.
        allowedRoles: ["ADMINISTRADOR", "SUPERVISOR"],
      },
      {
        label: "Informes",
        path: "/fiscalizacion-electoral/informes",
        icon: InboxIcon,
        // FORM_REVIEW.
        allowedRoles: ["ADMINISTRADOR", "SUPERVISOR"],
      },
      {
        label: "Fases del período",
        path: "/fiscalizacion-electoral/fases",
        icon: TimelineIcon,
        // ELECTORAL_PERIOD_MANAGE.
        allowedRoles: ["ADMINISTRADOR"],
      },
      {
        label: "Plantillas",
        path: "/fiscalizacion-electoral/plantillas",
        icon: ViewQuiltIcon,
        // FORM_TEMPLATE_MANAGE (solo admin).
        allowedRoles: ["ADMINISTRADOR"],
      },
    ],
  },
];
