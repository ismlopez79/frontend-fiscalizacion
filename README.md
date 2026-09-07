# Actas JVE — Frontend

Frontend en **React 18 + Vite + TypeScript + Material UI (MUI)**, construido contra el backend
Spring Boot ya existente.

## Estado de esta entrega — Bloque 1 y 2 del roadmap

- **Bloque 1 (Setup)**: proyecto Vite + TS + MUI, theme institucional propio (paleta, tipografía,
  tokens de color por estado de acta), estructura de carpetas acordada.
- **Bloque 2 (Layout + Auth)**: Login funcional contra `POST /api/auth/login`, contexto de
  autenticación con manejo de token JWT, shell de la app (sidebar + header + breadcrumbs) con
  navegación filtrada por rol, guards de ruta (`ProtectedRoute`), páginas 403/404.

Todas las demás pantallas del inventario (dashboard, listado/detalle/formulario de actas, reportes,
catálogos de administración, usuarios, roles, auditoría) existen como **placeholders explícitos**
(`PageStub`) que indican en qué bloque del roadmap se implementan — ninguna ruta del inventario
acordado quedó omitida en silencio.

## Requisitos

- Node.js 18+
- Backend corriendo (ver `jve-backend`), por defecto en `http://localhost:8080/api`

## Configuración

```bash
cp .env.example .env
# ajustar VITE_API_BASE_URL si el backend no corre en localhost:8080
```

## Ejecutar en desarrollo

```bash
npm install
npm run dev
```

Abre `http://localhost:5173`. Usuario inicial (creado por el seed del backend): `admin` / `Admin123!`
(cambiar en cualquier ambiente real).

## Decisiones de diseño (resumen — ver el prompt de frontend para el detalle completo)

- **Paleta**: azul petróleo institucional como primario (`#1B3A5C`), dorado apagado como acento
  puntual (`#B8860B`), nunca los colores default de MUI.
- **Tokens de estado de acta**: un color + ícono por cada uno de los 7 estados, centralizados en
  `src/theme/statusTokens.ts` — cualquier chip o indicador de estado debe leer de ahí.
- **Tipografía**: Inter, con una variante de números tabulares (`numericDataSx` en `theme.ts`) para
  los datos de producción, que deben leerse "a distancia" como un panel de control.
- **Guards de rol en frontend son UX, no seguridad**: el backend sigue validando todo con
  `@PreAuthorize`; el guard de rutas solo evita que un usuario vea enlaces/pantallas que no puede usar.

## Pendiente de backend antes de continuar con ciertos bloques

- El login hoy no devuelve permisos finos (`ACTA_CREATE`, `CATALOG_MANAGE`, etc.), solo roles. El
  `ProtectedRoute` está preparado para extenderse a permisos en cuanto el backend los incluya en la
  respuesta de `/auth/login`.
- Bloque 5 (formulario de actas con borrador) y Bloque 11 (edición de roles/permisos) requieren los
  endpoints descritos en `PROMPT_FASE_2_5_BORRADOR_ROLES.md`.

## Estructura

Ver el árbol completo en `src/` — sigue exactamente la arquitectura acordada en el prompt de frontend
(`api/`, `components/`, `context/`, `hooks/`, `layouts/`, `pages/`, `routes/`, `theme/`, `types/`).
