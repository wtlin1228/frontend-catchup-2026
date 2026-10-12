# Analog

| | |
|---|---|
| Kind | Meta-framework for Angular: Vite build, file-based routing, server routes and middleware on Nitro, Markdown content routes, SSR and SSG, form server actions, Vitest. The Angular CLI's own builder is Vite-based too, so Analog's difference is the meta-framework layer, not the bundler. |
| Version checked (2026-10-12) | @analogjs/platform 2.8.0 and @analogjs/router 2.8.0 (2026-10-01; 3.0 at alpha); the compatibility table pairs Angular 17 to 21 with Vite 5 to 7 and, in Nx workspaces, Angular 22 with Vite 8; @analogjs/trpc 0.5.0. |
| Reactivity | Angular's (see angular.md). |
| Rendering | SSR by default with hydration, per-route prerendering (`defineRouteMeta`), SSG for the whole site, client-only routes. |
| Best at | Angular teams that want Nuxt-shaped conventions (pages directory, server directory, content collections) without leaving Angular. |

The UI-library rows (4, 5, 6, 10, 11, 12, 14, 18, 20, 23) are angular.md's; this sheet lists what Analog adds.

## Pattern map

| # | Pattern | How you build it with Analog |
|---|---|---|
| 1 | Static content | `src/app/pages/<pattern>/light.page.ts` with the route metadata (`defineRouteMeta`) marking it prerendered; layouts are parent route components; SSG builds the whole site from a route list. |
| 2 | Forms | Form server actions: a `.server.ts` file next to the page exports `action`, the form posts to it (works without JS), the response maps errors back through the `FormAction` directive; the mock API's contact endpoint becomes a server route or stays external. |
| 3 | Dynamic data and routing | `load` in the page's `.server.ts` runs on the server and `injectLoad()` reads it as a signal; API routes under `src/server/routes/api/*` (Nitro, `defineEventHandler`); `@analogjs/trpc` for typed calls with TanStack Query's Angular adapter; guards and resolvers are Angular's. |
| 4 | Client state | As angular.md. |
| 5 | 3D and imperative libraries | As angular.md; `afterNextRender` keeps three.js off the server render. |
| 6 | Real-time updates | API routes can stream (`createEventStream` from h3 for SSE) and Analog documents WebSocket handlers for API routes; the client side is angular.md's. |
| 7 | Media and lazy loading | `NgOptimizedImage` as angular.md; no build-time image pipeline of its own. |
| 8 | Cross-cutting concerns | Server middleware under `src/server/middleware` for sessions and redirects, request and cookies injected into `load`; theme and i18n as angular.md. |
| 9 | Content pipeline | Content routes: Markdown files with front matter under `src/content` become routes, `injectContent()` and `MarkdownComponent` render them with syntax highlighting, `injectContentFiles()` lists a collection for the index; feeds and sitemaps from a script or a server route. |
| 10 | Data grid | As angular.md. |
| 11 | Composite widgets | As angular.md (Angular Aria, CDK). |
| 12 | Motion | As angular.md. |
| 13 | Offline and installable | `@angular/service-worker` as angular.md, or `vite-plugin-pwa` since the build is Vite. |
| 14 | Async consistency | As angular.md; `load` runs before the route resolves, so navigation keeps the old page until data is ready. |
| 15 | State across navigation | Angular Router's scroll restoration and `RouteReuseStrategy` as angular.md. |
| 16 | Server functions | `@analogjs/trpc` (router in `src/server/trpc`, client injected in components) is the typed-call layer; form server actions cover mutations from forms; no batching or subscriptions beyond tRPC's links. |
| 17 | Sync and local-first | Nothing of its own; the server half as Nitro routes with `useStorage()`, the client as angular.md (`@tanstack/angular-db` or `src/lib/sync.js`). |
| 18 | Morphing and streaming HTML | Nothing of its own; Nitro routes can stream HTML, the client morph is angular.md's. |
| 19 | Platform navigation | Angular Router as angular.md; prerendered pages carry the light page's `rel="expect"` and speculation rules in `index.html`; the shell for `/navigation/app/*` is a wildcard route. |
| 20 | Error boundaries | As angular.md; server errors render Nitro's error page or a custom `error.page.ts`. |
| 21 | Observability | Nitro routes set `Server-Timing`; nothing traces; client as angular.md. |
| 22 | Security hardening | CSP and other headers from server middleware (`setResponseHeaders`), nonces into Angular's `ngCspNonce` from `load` or middleware (check the SSR wiring), CSRF double-submit in the Nitro route; Trusted Types as angular.md. |
| 23 | Styling strategy | As angular.md; Vite's CSS Modules are available too. |
| 24 | Agent-ready UI | As angular.md; form server actions and tRPC procedures, with their Zod inputs, are the natural tool list. |

## Migrating the baseline

1. `npm create analog@latest`; port the mock API to `src/server/routes/api/*` (the plugin's Node handlers map onto Nitro event handlers almost one to one), or run it as a separate process.
2. Partials become the root layout component; each page a file under `src/app/pages/<pattern>/`.
3. `src/lib` as angular.md; the content pages move to `src/content` and lose their build script.

## Watch out for

- Analog's Angular 22 support goes through the Nx table on the compatibility page (Vite 8); check the table before scaffolding, and record whether the Angular CLI's own Vite builder would have been enough.
- Two servers to understand: Angular's SSR engine and Nitro; deployment presets come from Nitro.
- 3.0 is at alpha (2026-10-07); the version you port on decides whether the content and form-action APIs are the ones documented today.
- TypeScript 7: Angular's template checks still need the 6.0 API (see angular.md).

## Links

- https://analogjs.org, https://analogjs.org/docs/guides/compatibility
- https://github.com/analogjs/analog
