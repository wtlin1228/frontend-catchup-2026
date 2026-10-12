# Nuxt

| | |
|---|---|
| Kind | Vue meta-framework: file routing, auto-imports, data fetching composables, Nitro server, modules ecosystem. |
| Version checked (2026-10-12) | nuxt 4.6.1 (4.6 shipped on 2026-10-09 with Nuxt CLI v4; Nuxt 5 defaults sit behind `future.compatibilityVersion: 5`) |
| Reactivity | Vue (see vue.md). |
| Rendering | SSR, SSG, hybrid per route (`routeRules`: prerender, ISR, SWR, client-only), experimental SSR streaming in 4.5, islands via `<NuxtIsland>`. |
| Best at | Vue apps with server rendering and a rich module ecosystem (image, content, i18n, auth, UI). |

## Pattern map

| # | Pattern | How you build it in Nuxt |
|---|---|---|
| 1 | Static content | `app/pages/*.vue` with `routeRules: { prerender: true }`; `app/layouts`; `useSeoMeta`; `@nuxt/fonts`. |
| 2 | Forms | Native form to a Nitro route (`server/api/contact.post.ts`) for the no-JS path; `useFetch`/`$fetch` + `readValidatedBody` with Zod for the enhanced path; `nuxt-file-storage` or raw `readMultipartFormData` for uploads. |
| 3 | Dynamic | `pages/posts/[id].vue`; `useFetch`/`useAsyncData` (dedupe, keys, `refresh`, `lazy`); `<NuxtLink prefetch>`; `definePageMeta({ middleware })` for guards; optimistic UI by hand or Pinia Colada. |
| 4 | Client state | Pinia (`@pinia/nuxt`) with persisted state plugin; `useState` for SSR-safe shared state. |
| 5 | 3D | `<ClientOnly>` + TresJS (`@tresjs/nuxt`), or a `.client.vue` component. |
| 6 | Real-time | Nitro route streaming SSE (`createEventStream`); client composable with `onMounted`/`onUnmounted`; `shallowRef` buffers. |
| 7 | Media | `<NuxtImg>`/`<NuxtPicture>` from `@nuxt/image` (providers, formats, sizes). |
| 8 | Cross-cutting | Route middleware and server middleware; `useCookie` makes theme and session SSR-safe without the inline script; `@nuxtjs/i18n` with locale routes; `nuxt-auth-utils`. |
| 9 | Content | `@nuxt/content` 3: collections with schemas, Markdown with components (MDC), queries, feeds via modules. |
| 10 | Data grid | TanStack Table (Vue) + Virtual; workers via Vite. |
| 11 | Composite widgets | Nuxt UI (on Reka UI), PrimeVue, Vuetify. |
| 12 | Motion | Vue transitions; `<NuxtPage>` page transitions; experimental View Transitions API support (`experimental.viewTransition`). |
| 13 | Offline | `@vite-pwa/nuxt`. |
| 14 | Async consistency | `useAsyncData`/`useFetch` keep `data` while `status` is `pending` on `refresh()` or a watched key, so the old tab stays and dims on `status === 'pending'`; `dedupe: 'cancel'` (the default) drops the older in-flight request; `lazy: true` stops navigation blocking. Heavy: three `useAsyncData` calls, the dependent one with `watch: [first]` or `immediate: false` + `execute()`, per-source `refresh()` and `error`; atomic commit is one handler awaiting `Promise.all`, streaming is three keys; optimistic lane by hand or Pinia Colada mutations. |
| 15 | State across navigation | `<NuxtPage keepalive>` or `definePageMeta({ keepalive: true })` wraps pages in `<KeepAlive>`; `onActivated`/`onDeactivated` pause the animation; back restores scroll through Nuxt's `scrollBehavior` (customised in `app/router.options.ts`, `definePageMeta({ scrollToTop })`) and the filter comes from `useRoute().query`; `useState` for values that must survive navigation and SSR alike; KeepAlive detaches the subtree (see vue.md), so the hidden-and-inert tab set is a plain component with `v-show`; destroy mode is `pageKey` on `<NuxtPage>`. |
| 16 | Server functions | No remote functions; the idiom is a Nitro route called with typed `$fetch('/api/…')` (route types generated, bodies via `readValidatedBody` with Zod), one function per route rather than a dispatch table; for the baseline's shape port `src/lib/rpc.js` to one `server/api/rpc.post.ts` (batching and dedupe stay client-side), or `trpc-nuxt`/oRPC's h3 adapter; the auth guard reads `event.context` filled by server middleware; the live subscription is `createEventStream` from a Nitro route. |
| 17 | Sync and local-first | Nothing built in; the mock API's sync endpoints become Nitro routes with `useStorage()` (unstorage) holding versions and `createEventStream` for the change feed; the client keeps `src/lib/sync.js` in a `.client.ts` plugin or a persisted Pinia store, replaying on `online`; TanStack DB (`@tanstack/vue-db`) inside `<ClientOnly>` is the library route, with `@tanstack/offline-transactions` for the queue. |
| 18 | Morphing and streaming HTML | `<NuxtIsland>` and `.server.vue` components fetch server-rendered fragments and `refresh()` them, but they replace the markup rather than morph; light: run `src/lib/morph.js` or idiomorph on a `ref` against HTML from a Nitro route (`setHeader(event, 'content-type', 'text/html')`); heavy: a Nitro route returning a `ReadableStream` of chunks, consumed with `fetch` and morphed progressively by hand; Nuxt's own SSR streaming (experimental in 4.5) covers the page, not fragments; `moveBefore` is a plain DOM call. |
| 19 | Platform navigation | Light: a static HTML page under `public/` (served by Nitro with no hydration JS) with `@view-transition`, `rel="expect"` and speculation rules, or a prerendered page adding them with `useHead`. Heavy: the router is Vue Router on the History API, not the Navigation API; a `pages/navigation/app/[...slug].vue` catch-all with `routeRules: { '/navigation/app/**': { ssr: false } }` serves the shell for every URL under the prefix, `experimental.viewTransition` wraps each navigation, middleware returning `abortNavigation()` cancels, `scrollBehavior` handles scroll; a Navigation API + URLPattern router is the baseline's `navigation-heavy.js` inside a `.client.vue` component. |
| 20 | Error boundaries | `<NuxtErrorBoundary>` per section with the `#error="{ error, clearError }"` slot (`clearError()` or a `:key` bump retries; backoff and fingerprinting by hand); `error.vue` with `createError`/`showError`/`clearError`/`useError` for the whole-page case; light: a plugin hooking `vue:error` and `app:error` plus `window.onerror`/`unhandledrejection`, beaconing to `server/api/report.post.ts`; `app:chunkError` covers stale-deploy chunk failures. |
| 21 | Observability | Nuxt DevTools (timeline, payload, server routes) in dev, nothing shipped for RUM; light: `web-vitals` in a `.client.ts` plugin or the baseline's observers; heavy: `setHeader(event, 'Server-Timing', …)` in the Nitro routes, `getRequestHeader(event, 'traceparent')` to join the client span, the waterfall by hand; `@sentry/nuxt` exports the server span, an OpenTelemetry Nitro plugin is yours to write. |
| 22 | Security hardening | `nuxt-security` module: with `nonce: true` it rewrites every `<script>`, `<link>` and `<style>` with a per-request nonce (SSR only; policies use the `'nonce-{{nonce}}'` placeholder and the default `script-src` carries `'strict-dynamic'`), and for prerendered pages `ssg.hashScripts` hashes inline scripts into a `<meta>` policy (`ssg.meta`) with `sri` adding integrity attributes; `useCookie` already removed the inline theme script (row 8), so the hash tension largely disappears; `routeRules: { headers }` if you set CSP by hand; CSRF: `nuxt-csurf` or a double-submit check in the Nitro route via `getCookie`/`getHeader`; `v-html` needs DOMPurify (`isomorphic-dompurify` for SSR); Trusted Types as in vue.md. |
| 23 | Styling strategy | Vue scoping as in vue.md (`<style scoped>`, `<style module>`, `v-bind()`); global tokens via the `css` array in `nuxt.config`, component CSS inlined into the SSR HTML by default (`features.inlineStyles`); `@nuxt/fonts` for the font; Tailwind 4 via `@tailwindcss/vite` or Nuxt UI's theme; `@scope`, container queries, `@property`, subgrid and `color-mix()` pass through untouched. |
| 24 | Agent-ready UI | Nothing built in for the page; a `.client.ts` plugin registers tools whose `execute` is a typed `$fetch` to the Nitro route and whose schema is the route's `readValidatedBody` schema; Nuxt CLI v4's `nuxt docs` serves the coding agent. |

## Migrating the baseline

1. `npm create nuxt@latest`; port the mock API to `server/api/*` (Nitro) rather than keeping the Vite plugin: this exercises the server half Nuxt provides.
2. Partials become layouts and `app.vue`; pages become files under `app/pages`.
3. `api.js` → `useFetch`; `store.js` → Pinia; `router.js` → gone; `theme.js` → `useCookie`.

## From the 2025–26 blog

Nuxt 3 reached end of life on 31 July 2026; Nuxt 5 brings Nitro 3, h3 v2 and the Vite Environment API; roadmap modules include auth utilities, an accessibility module and built-in SEO/PWA. Nitro presets make deployment portability a strength to measure.

4.6 (2026-10-09): `nuxt/server` as the import source for handlers and middleware on web-standard APIs; a server-agnostic core with an experimental pure-Vite builder (`server.builder: 'vite'`, without storage, caching or tasks yet); `useSession` sealed into a cookie plus `runtimeConfig.appSecret`; Vue Vapor interop (`vue.vapor: true`, needs Vue 3.6 RC); typed `$fetch` behind `experimental.routeTypedFetch`; Nuxt 5 defaults behind `future.compatibilityVersion: 5`; Nuxt CLI v4 (interactive dev panel, `nuxt curl`, `nuxt task`, `nuxt docs`, Node 22.21+ or 24.11+); Nuxt 2 and `@nuxt/bridge` support ended.

## Watch out for

- Auto-imports hide where things come from; turn on the generated `.nuxt/types` and read them.
- `useFetch` keys, dedupe and the lazy/server options decide hydration behaviour; wrong settings fetch twice.
- Nuxt 4 moved app code into `app/`; older tutorials point at the old layout.
- Nitro deployment presets differ in what they support (ISR, SSE); check the target.

## Links

- https://nuxt.com, https://content.nuxt.com, https://image.nuxt.com
