# Reglas del proyecto

## Rutas y rendimiento

- **Toda pantalla nueva se registra en `src/routes/lazyPages.ts`**, nunca se importa directo en `src/routes/AppRouter.tsx`.
  - Agrega su importador al mapa `loaders` y exporta `export const XPage = lazyPage("XPage");`, luego úsala en `AppRouter.tsx` importándola desde `./lazyPages`.
  - Motivo: cada pantalla se descarga solo al abrirla (code splitting) y se precarga en segundo plano desde `AppShell`. Un import directo la mete de nuevo en el archivo JS inicial y vuelve a hacer lenta la primera carga (login).
  - Excepción: `LoginPage`, `NotFoundPage` y `ForbiddenPage` se quedan en la carga inicial a propósito.
