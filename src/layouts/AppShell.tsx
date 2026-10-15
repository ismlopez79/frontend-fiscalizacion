import { Suspense, useEffect, useRef, useState } from "react";
import { Outlet, useNavigate, Link as RouterLink, useLocation } from "react-router-dom";
import {
  AppBar,
  Avatar,
  Box,
  ButtonBase,
  CircularProgress,
  Collapse,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/MenuRounded";
import ExpandMoreIcon from "@mui/icons-material/ExpandMoreRounded";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import LogoutIcon from "@mui/icons-material/LogoutRounded";
import PersonIcon from "@mui/icons-material/PersonOutlineRounded";
import VpnKeyOutlinedIcon from "@mui/icons-material/VpnKeyOutlined";
import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";
import { useAuth } from "@/hooks/useAuth";
import { useMyProfilePhoto } from "@/hooks/useMyProfilePhoto";
import { useModulos } from "@/hooks/useModulos";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { designTokens } from "@/theme/theme";
import { glassSx } from "@/components/ui/glass";
import { NAV_ITEMS, type NavItem } from "./navConfig";
import { Breadcrumbs } from "./Breadcrumbs";
import { prefetchPages } from "@/routes/lazyPages";
// Version optimizada (240px WebP, ~15 KB) del logo original: aqui se muestra a 28-36px de alto.
import logo from "@/logo/logo-240.webp";

const DRAWER_WIDTH = 264;
/** Alto de la barra superior; el contenido reserva este espacio arriba porque pasa por debajo de ella. */
const APPBAR_HEIGHT = { xs: 56, sm: 64 };

/** Fondo del sidebar: una capa neutra apenas distinta del lienzo, sin borde duro. */
const SIDEBAR_BG = "#FAFBFC";

interface ModuleFlags {
  isElectionsEnabled: boolean;
  isTrainingEnabled: boolean;
}

/** Una seccion del sidebar con las pantallas que este usuario puede ver. */
interface NavGroup {
  group: NavItem;
  items: NavItem[];
}

function isVisible(item: NavItem, roles: string[], modules: ModuleFlags): boolean {
  const roleOk = !item.allowedRoles || item.allowedRoles.some((r) => roles.includes(r));
  const moduleOk =
    (!item.requiresElectionsModule || modules.isElectionsEnabled) &&
    (!item.requiresTrainingModule || modules.isTrainingEnabled);
  return roleOk && moduleOk;
}

/** "DELEGADO_TEMPORAL" -> "Delegado temporal". */
function formatRole(role: string): string {
  const text = role.replace(/_/g, " ").toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function AppShell() {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const photoUrl = useMyProfilePhoto();
  // No solo en login: se llama aqui (AppShell envuelve toda ruta protegida)
  // porque el estado del modulo puede cambiar en caliente mientras el
  // usuario ya tiene sesion abierta — ver seccion 4.2 del prompt.
  const { isElectionsEnabled, isTrainingEnabled } = useModulos();
  const moduleFlags: ModuleFlags = { isElectionsEnabled, isTrainingEnabled };

  const [mobileOpen, setMobileOpen] = useState(false);
  // Acordeon: una sola seccion abierta a la vez; abrir una cierra las demas.
  const [openGroup, setOpenGroup] = useState<string | null>(NAV_ITEMS[0].path);
  const reducedMotion = useReducedMotion();
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);

  // Borde de scroll al estilo Apple: la barra superior solo muestra su linea
  // y sombra cuando hay contenido pasando por debajo. Un sentinel al inicio
  // del contenido + IntersectionObserver: sin listeners de scroll.
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const el = topSentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setScrolled(!entry.isIntersecting), {
      rootMargin: "-64px 0px 0px 0px",
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Al cambiar de pantalla, el contenido vuelve arriba (el scroll vive en el contenedor, no en window).
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [location.pathname]);

  // Con la app ya pintada, precarga el resto de pantallas en segundo plano
  // para que navegar siga siendo instantaneo sin engordar la carga inicial.
  useEffect(() => {
    const timeout = window.setTimeout(prefetchPages, 1500);
    return () => window.clearTimeout(timeout);
  }, []);

  const roles = user?.roles ?? [];

  // Secciones con al menos una pantalla visible para este usuario. Una
  // seccion vacia (ej. "Elecciones" para un DIGITADOR con el modulo apagado)
  // no se muestra: se desplegaria a nada.
  const navGroups: NavGroup[] = NAV_ITEMS.filter((group) => isVisible(group, roles, moduleFlags))
    .map((group) => ({
      group,
      items: (group.children ?? []).filter((child) => isVisible(child, roles, moduleFlags)),
    }))
    .filter(({ items }) => items.length > 0);

  // Pantalla actual = la ruta mas especifica que coincide ("/actas/pendientes"
  // gana sobre "/actas"), para que nunca queden dos opciones marcadas a la vez.
  let activePath: string | null = null;
  let activeGroupPath: string | null = null;
  for (const { group, items } of navGroups) {
    for (const item of items) {
      const matches = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
      if (matches && (activePath === null || item.path.length > activePath.length)) {
        activePath = item.path;
        activeGroupPath = group.path;
      }
    }
  }

  // Al navegar (tambien desde las migas o un boton), se abre la seccion de la
  // pantalla actual y las demas quedan cerradas.
  useEffect(() => {
    if (activeGroupPath) setOpenGroup(activeGroupPath);
  }, [activeGroupPath]);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const renderNavLink = (item: NavItem) => {
    const selected = item.path === activePath;
    return (
      <ListItemButton
        key={item.path}
        component={RouterLink}
        to={item.path}
        selected={selected}
        aria-current={selected ? "page" : undefined}
        onClick={() => setMobileOpen(false)}
        sx={{
          // Sangria bajo el icono de la seccion, pegada a la linea guia.
          ml: "38px",
          pl: 1.25,
          minHeight: 38,
          "& .MuiListItemIcon-root": { color: selected ? "primary.main" : designTokens.textCaption },
          "@media (hover: hover) and (pointer: fine)": {
            "&:hover:not(.Mui-selected)": { bgcolor: "rgba(15, 23, 42, 0.04)" },
          },
        }}
      >
        <ListItemIcon sx={{ minWidth: 30 }}>
          <item.icon sx={{ fontSize: 18 }} />
        </ListItemIcon>
        <ListItemText
          primary={item.label}
          primaryTypographyProps={{
            variant: "body2",
            sx: { fontWeight: selected ? 700 : 500, color: selected ? "primary.main" : "text.primary" },
          }}
        />
      </ListItemButton>
    );
  };

  const renderNavGroup = ({ group, items }: NavGroup) => {
    const isOpen = openGroup === group.path;
    // Cerrada pero con la pantalla actual dentro: se tiñe para no perder donde estas.
    const holdsActive = group.path === activeGroupPath;
    const tinted = holdsActive && !isOpen;
    const panelId = `nav-seccion-${group.path.slice(1)}`;
    return (
      <Box key={group.path} sx={{ mb: 0.5 }}>
        <ListItemButton
          onClick={() => setOpenGroup(isOpen ? null : group.path)}
          aria-expanded={isOpen}
          aria-controls={panelId}
          sx={{
            pl: 1.5,
            minHeight: 42,
            "@media (hover: hover) and (pointer: fine)": {
              "&:hover": { bgcolor: "rgba(15, 23, 42, 0.04)" },
            },
          }}
        >
          <ListItemIcon
            sx={{
              minWidth: 34,
              color: tinted ? "primary.main" : isOpen ? "text.primary" : designTokens.textCaption,
              transition: "color 150ms ease",
            }}
          >
            <group.icon sx={{ fontSize: 20 }} />
          </ListItemIcon>
          <ListItemText
            primary={group.label}
            primaryTypographyProps={{
              sx: {
                fontSize: "0.875rem",
                fontWeight: 700,
                letterSpacing: "-0.005em",
                color: tinted ? "primary.main" : "text.primary",
              },
            }}
          />
          <ExpandMoreIcon
            fontSize="small"
            sx={{
              color: designTokens.textCaption,
              transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)",
              transition: reducedMotion ? "none" : `transform 220ms ${designTokens.easeOut}`,
            }}
          />
        </ListItemButton>
        {/* Abrir es un poco mas lento que cerrar: la seccion que se va no debe estorbar a la que llega. */}
        <Collapse
          in={isOpen}
          timeout={reducedMotion ? 0 : { enter: 240, exit: 170 }}
          easing={designTokens.easeOut}
          unmountOnExit
        >
          <List
            id={panelId}
            component="div"
            disablePadding
            sx={{
              position: "relative",
              pt: 0.25,
              pb: 0.5,
              // Linea guia que cuelga del icono de la seccion.
              "&::before": {
                content: '""',
                position: "absolute",
                top: 4,
                bottom: 8,
                left: 29,
                width: "1px",
                bgcolor: "rgba(15, 23, 42, 0.09)",
              },
            }}
          >
            {items.map(renderNavLink)}
          </List>
        </Collapse>
      </Box>
    );
  };

  const drawerContent = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", bgcolor: SIDEBAR_BG }}>
      <Box sx={{ display: "flex", alignItems: "center", px: 2.5, minHeight: APPBAR_HEIGHT, flexShrink: 0 }}>
        <Box
          component="img"
          src={logo}
          alt="Junta de Vigilancia Electoral"
          draggable={false}
          sx={{ height: 40, width: "auto", flexShrink: 0, objectFit: "contain", userSelect: "none" }}
        />
      </Box>
      <List
        component="nav"
        aria-label="Navegación principal"
        sx={{ flex: 1, pt: 1.5, pb: 2, overflowY: "auto", overscrollBehavior: "contain" }}
      >
        {navGroups.map(renderNavGroup)}
      </List>
    </Box>
  );

  const initials = user?.fullName?.charAt(0).toUpperCase() ?? "U";

  return (
    <Box sx={{ display: "flex", minHeight: "100dvh" }}>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{
          width: { lg: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { lg: `${DRAWER_WIDTH}px` },
          ...glassSx(scrolled ? "thick" : "light"),
          border: "none",
          // Sin contenido debajo, la barra se funde con el lienzo; con contenido, aparece su borde.
          // Siempre en el gris del lienzo, nunca blanco: Safari (iPad/iPhone) tiñe su propia
          // barra con el color de esta, y en blanco se veia vacia — el usuario lo reporto.
          bgcolor: scrolled ? "rgba(244, 245, 247, 0.86)" : "rgba(244, 245, 247, 0.72)",
          "@media (prefers-reduced-transparency: reduce)": { bgcolor: designTokens.canvasBg },
          boxShadow: scrolled
            ? "0 1px 0 rgba(15, 23, 42, 0.08), 0 8px 24px -16px rgba(15, 23, 42, 0.18)"
            : "0 1px 0 rgba(15, 23, 42, 0)",
          transition: `background-color 200ms ${designTokens.easeOut}, box-shadow 200ms ${designTokens.easeOut}`,
        }}
      >
        <Toolbar sx={{ justifyContent: "space-between", minHeight: APPBAR_HEIGHT, gap: 1, px: { xs: 1.5, sm: 2, lg: 3 } }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
            <IconButton
              color="inherit"
              edge="start"
              onClick={() => setMobileOpen(true)}
              sx={{ display: { lg: "none" }, flexShrink: 0 }}
              aria-label="Abrir menú"
            >
              <MenuIcon />
            </IconButton>

            {/* En movil no hay drawer permanente con logo visible, asi que se
                repite aqui, pequeño, para que la marca siempre este presente. */}
            <Box
              component="img"
              src={logo}
              alt="Junta de Vigilancia Electoral"
              draggable={false}
              sx={{ display: { xs: "block", lg: "none" }, height: 28, width: "auto", flexShrink: 0 }}
            />

            <Breadcrumbs />
          </Stack>

          <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 0.5, sm: 1 } }}>
            <Tooltip title="Sin notificaciones nuevas">
              <IconButton aria-label="Notificaciones" sx={{ display: { xs: "none", sm: "inline-flex" }, color: designTokens.textSecondary }}>
                <NotificationsNoneOutlinedIcon />
              </IconButton>
            </Tooltip>

            <ButtonBase
              onClick={(e) => setUserMenuAnchor(e.currentTarget)}
              aria-label="Abrir menú de cuenta"
              aria-haspopup="menu"
              aria-expanded={Boolean(userMenuAnchor)}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.25,
                pl: { xs: 0.5, sm: 1.25 },
                pr: 0.75,
                py: 0.5,
                borderRadius: 999,
                transition: `background-color 150ms ease, transform 160ms ${designTokens.easeOut}`,
                "&:active": { transform: "scale(0.97)" },
                "&.Mui-focusVisible": { boxShadow: designTokens.focusRing },
                "@media (hover: hover) and (pointer: fine)": {
                  "&:hover": { bgcolor: "rgba(15, 23, 42, 0.05)" },
                },
              }}
            >
              <Box sx={{ textAlign: "right", display: { xs: "none", sm: "block" }, minWidth: 0 }}>
                <Typography variant="body2" noWrap sx={{ fontWeight: 700, color: "text.primary", lineHeight: 1.25, maxWidth: 220 }}>
                  {user?.fullName}
                </Typography>
                <Typography variant="caption" component="div" noWrap sx={{ fontWeight: 500, maxWidth: 220 }}>
                  {roles.map(formatRole).join(" · ")}
                </Typography>
              </Box>
              <Avatar src={photoUrl ?? undefined} alt="" sx={{ width: 34, height: 34, bgcolor: "primary.main", fontSize: 15 }}>
                {initials}
              </Avatar>
              <KeyboardArrowDownIcon
                fontSize="small"
                sx={{
                  color: designTokens.textCaption,
                  transform: userMenuAnchor ? "rotate(180deg)" : "none",
                  transition: `transform 200ms ${designTokens.easeOut}`,
                }}
              />
            </ButtonBase>
            <Menu
              anchorEl={userMenuAnchor}
              open={Boolean(userMenuAnchor)}
              onClose={() => setUserMenuAnchor(null)}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
              slotProps={{ paper: { sx: { mt: 1, minWidth: 240 } } }}
            >
              <Stack direction="row" gap={1.25} alignItems="center" sx={{ px: 2, pt: 1, pb: 1.5 }}>
                <Avatar src={photoUrl ?? undefined} alt="" sx={{ width: 40, height: 40, bgcolor: "primary.main" }}>
                  {initials}
                </Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" noWrap sx={{ fontWeight: 700, color: "text.primary" }}>
                    {user?.fullName}
                  </Typography>
                  <Typography variant="caption" component="div" noWrap sx={{ fontWeight: 500 }}>
                    @{user?.username}
                  </Typography>
                </Box>
              </Stack>
              <Divider sx={{ my: 0.5, borderColor: "rgba(15, 23, 42, 0.06)" }} />
              <MenuItem component={RouterLink} to="/perfil" onClick={() => setUserMenuAnchor(null)}>
                <ListItemIcon>
                  <PersonIcon fontSize="small" />
                </ListItemIcon>
                Mi cuenta
              </MenuItem>
              <MenuItem component={RouterLink} to="/cambiar-password" onClick={() => setUserMenuAnchor(null)}>
                <ListItemIcon>
                  <VpnKeyOutlinedIcon fontSize="small" />
                </ListItemIcon>
                Cambiar contraseña
              </MenuItem>
              <Divider sx={{ my: 0.5, borderColor: "rgba(15, 23, 42, 0.06)" }} />
              <MenuItem onClick={handleLogout} sx={{ color: designTokens.status.error.fg }}>
                <ListItemIcon sx={{ color: "inherit" }}>
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>
                Cerrar sesión
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      <Box component="nav" aria-label="Menú lateral" sx={{ width: { lg: DRAWER_WIDTH }, flexShrink: { lg: 0 } }}>
        {/* Movil y tablet (<1024px): drawer deslizante sobre el contenido, con
            overlay oscuro (backdrop del Modal de MUI) y transicion suave de
            apertura/cierre — ambas ya integradas en el componente Drawer. */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          transitionDuration={{ enter: 300, exit: 200 }}
          SlideProps={{ easing: { enter: designTokens.easeDrawer, exit: designTokens.easeDrawer } }}
          sx={{
            display: { xs: "block", lg: "none" },
            "& .MuiDrawer-paper": {
              width: { xs: "84%", sm: DRAWER_WIDTH },
              maxWidth: DRAWER_WIDTH,
              border: "none",
              borderTopRightRadius: 20,
              borderBottomRightRadius: 20,
            },
          }}
        >
          {drawerContent}
        </Drawer>
        {/* Escritorio (>=1024px): sidebar fija, layout de siempre. */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", lg: "block" },
            "& .MuiDrawer-paper": {
              width: DRAWER_WIDTH,
              border: "none",
              boxShadow: "1px 0 0 rgba(15, 23, 42, 0.06)",
            },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { xs: "100%", lg: `calc(100% - ${DRAWER_WIDTH}px)` },
          minWidth: 0,
          bgcolor: "background.default",
          // dvh, no vh: en movil 100vh mide la pantalla con la barra del navegador
          // oculta, asi que el contenido quedaba cortado bajo esa barra al hacer scroll.
          height: "100dvh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* El contenedor de scroll ocupa todo el alto y arranca DETRAS de la
            barra superior de vidrio: el contenido pasa por debajo de ella al
            hacer scroll. El padding superior reserva su alto. */}
        <Box
          ref={scrollRef}
          sx={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            px: { xs: 1.5, sm: 2, lg: 3 },
            pb: { xs: 1.5, sm: 2, lg: 3 },
            pt: { xs: `${APPBAR_HEIGHT.xs + 12}px`, sm: `${APPBAR_HEIGHT.sm + 16}px`, lg: `${APPBAR_HEIGHT.sm + 24}px` },
            // Un campo enfocado o un elemento traido a la vista no queda escondido bajo la barra.
            scrollPaddingTop: { xs: APPBAR_HEIGHT.xs + 16, sm: APPBAR_HEIGHT.sm + 16 },
            overflowY: "auto",
            overflowX: "hidden",
            overscrollBehaviorY: "contain",
          }}
        >
          <Box ref={topSentinelRef} aria-hidden sx={{ height: 0, flexShrink: 0 }} />
          {/* La pantalla se descarga al abrirla (ver lazyPages.ts): mientras llega,
              el marco (barra y menu) sigue en su lugar y solo esta area espera. */}
          <Suspense fallback={<RouteFallback />}>
            <Outlet />
          </Suspense>
        </Box>
      </Box>
    </Box>
  );

  // hasRole se deja disponible para las paginas hijas via useAuth();
  // se referencia aqui solo para evitar warning de variable no usada
  // en este archivo si se decide usar mas adelante.
  void hasRole;
}

/**
 * Espera mientras se descarga una pantalla. Casi siempre llega en unos
 * milisegundos (o ya esta precargada), asi que no muestra nada durante los
 * primeros 400ms: evita un parpadeo de spinner en cada navegacion.
 */
function RouteFallback() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timeout = window.setTimeout(() => setVisible(true), 400);
    return () => window.clearTimeout(timeout);
  }, []);
  if (!visible) return null;
  return (
    <Box role="status" aria-label="Cargando" sx={{ display: "flex", justifyContent: "center", py: 8 }}>
      <CircularProgress size={28} />
    </Box>
  );
}
