import { useState } from "react";
import { Outlet, useNavigate, Link as RouterLink, useLocation } from "react-router-dom";
import {
  AppBar,
  Avatar,
  Badge,
  Box,
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
import MenuIcon from "@mui/icons-material/Menu";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import LogoutIcon from "@mui/icons-material/Logout";
import PersonIcon from "@mui/icons-material/PersonOutline";
import VpnKeyOutlinedIcon from "@mui/icons-material/VpnKeyOutlined";
import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";
import { useAuth } from "@/hooks/useAuth";
import { useMyProfilePhoto } from "@/hooks/useMyProfilePhoto";
import { NAV_ITEMS, type NavItem } from "./navConfig";
import { Breadcrumbs } from "./Breadcrumbs";
import logo from "@/logo/logo.png";

const DRAWER_WIDTH = 264;

function isVisible(item: NavItem, roles: string[]): boolean {
  return !item.allowedRoles || item.allowedRoles.some((r) => roles.includes(r));
}

export function AppShell() {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const photoUrl = useMyProfilePhoto();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ "/administracion": true });
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);

  const roles = user?.roles ?? [];

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const renderNavItem = (item: NavItem, depth = 0) => {
    if (!isVisible(item, roles)) return null;

    const hasChildren = item.children && item.children.length > 0;
    const isOpen = openGroups[item.path] ?? false;
    const isActive = location.pathname.startsWith(item.path) && depth === 0 && !hasChildren;

    if (hasChildren) {
      return (
        <Box key={item.path}>
          <ListItemButton
            onClick={() => setOpenGroups((prev) => ({ ...prev, [item.path]: !prev[item.path] }))}
            sx={{ pl: 2 + depth * 2 }}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>
              <item.icon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary={item.label}
              primaryTypographyProps={{
                variant: "caption",
                sx: { textTransform: "uppercase", letterSpacing: "0.04em", color: "text.secondary" },
              }}
            />
            {isOpen ? (
              <ExpandLessIcon fontSize="small" sx={{ color: "text.secondary" }} />
            ) : (
              <ExpandMoreIcon fontSize="small" sx={{ color: "text.secondary" }} />
            )}
          </ListItemButton>
          <Collapse in={isOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.children!.map((child) => renderNavItem(child, depth + 1))}
            </List>
          </Collapse>
        </Box>
      );
    }

    return (
      <ListItemButton
        key={item.path}
        component={RouterLink}
        to={item.path}
        selected={isActive || location.pathname.startsWith(item.path)}
        onClick={() => setMobileOpen(false)}
        sx={{ pl: 2 + depth * 2 }}
      >
        <ListItemIcon sx={{ minWidth: 36 }}>
          <item.icon fontSize="small" />
        </ListItemIcon>
        <ListItemText primary={item.label} primaryTypographyProps={{ variant: "body2" }} />
      </ListItemButton>
    );
  };

  const drawerContent = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Toolbar sx={{ px: 2, gap: 1.25 }}>
        <Box
          component="img"
          src={logo}
          alt="Junta de Vigilancia Electoral"
          draggable={false}
          sx={{ height: 40, width: "auto", flexShrink: 0, objectFit: "contain", userSelect: "none" }}
        />
        <Typography variant="h4" color="text.primary" fontWeight={700} noWrap>
          Actas JVE
        </Typography>
      </Toolbar>
      <Divider />
      <List sx={{ flex: 1, py: 1.5, overflowY: "auto" }}>{NAV_ITEMS.map((item) => renderNavItem(item))}</List>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{
          width: { lg: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { lg: `${DRAWER_WIDTH}px` },
          bgcolor: "background.paper",
          boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Toolbar sx={{ justifyContent: "space-between", minHeight: { xs: 56, sm: 64 }, gap: 1 }}>
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
              sx={{ display: { xs: "block", lg: "none" }, height: 30, width: "auto", flexShrink: 0 }}
            />

            <Breadcrumbs />
          </Stack>

          <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 0.5, sm: 1.5 } }}>
            <Tooltip title="Sin notificaciones nuevas">
              <IconButton sx={{ display: { xs: "none", sm: "inline-flex" } }}>
                <Badge variant="dot" color="error" overlap="circular">
                  <NotificationsNoneOutlinedIcon />
                </Badge>
              </IconButton>
            </Tooltip>

            <Box sx={{ textAlign: "right", display: { xs: "none", sm: "block" } }}>
              <Typography variant="body2" fontWeight={600}>
                {user?.fullName}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {roles.join(", ")}
              </Typography>
            </Box>
            <IconButton
              onClick={(e) => setUserMenuAnchor(e.currentTarget)}
              sx={{ display: "flex", alignItems: "center", gap: 0.25, borderRadius: "10px" }}
            >
              <Avatar src={photoUrl ?? undefined} sx={{ width: 36, height: 36, bgcolor: "primary.main" }}>
                {user?.fullName?.charAt(0).toUpperCase() ?? "U"}
              </Avatar>
              <KeyboardArrowDownIcon fontSize="small" sx={{ color: "text.secondary" }} />
            </IconButton>
            <Menu
              anchorEl={userMenuAnchor}
              open={Boolean(userMenuAnchor)}
              onClose={() => setUserMenuAnchor(null)}
            >
              <MenuItem
                component={RouterLink}
                to="/perfil"
                onClick={() => setUserMenuAnchor(null)}
              >
                <ListItemIcon>
                  <PersonIcon fontSize="small" />
                </ListItemIcon>
                Mi cuenta
              </MenuItem>
              <MenuItem
                component={RouterLink}
                to="/cambiar-password"
                onClick={() => setUserMenuAnchor(null)}
              >
                <ListItemIcon>
                  <VpnKeyOutlinedIcon fontSize="small" />
                </ListItemIcon>
                Cambiar contraseña
              </MenuItem>
              <MenuItem onClick={handleLogout}>
                <ListItemIcon>
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>
                Cerrar sesión
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { lg: DRAWER_WIDTH }, flexShrink: { lg: 0 } }}>
        {/* Movil y tablet (<1024px): drawer deslizante sobre el contenido, con
            overlay oscuro (backdrop del Modal de MUI) y transicion suave de
            apertura/cierre — ambas ya integradas en el componente Drawer. */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", lg: "none" },
            "& .MuiDrawer-paper": { width: { xs: "84%", sm: DRAWER_WIDTH }, maxWidth: DRAWER_WIDTH },
          }}
        >
          {drawerContent}
        </Drawer>
        {/* Escritorio (>=1024px): sidebar fija, layout de siempre. */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", lg: "block" },
            "& .MuiDrawer-paper": { width: DRAWER_WIDTH, borderRight: "1px solid", borderColor: "divider" },
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
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 56, sm: 64 } }} />
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            p: { xs: 1.5, sm: 2, lg: 3 },
            // Las pantallas ya migradas al layout "cabe en el viewport" manejan
            // su propio scroll interno (tablas con header fijo); las que aun
            // no se han rediseñado siguen funcionando via este scroll de
            // respaldo, para no romperlas mientras se migran una a una.
            overflowY: "auto",
            overflowX: "hidden",
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );

  // hasRole se deja disponible para las paginas hijas via useAuth();
  // se referencia aqui solo para evitar warning de variable no usada
  // en este archivo si se decide usar mas adelante.
  void hasRole;
}
