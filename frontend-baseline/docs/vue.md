# Vue

| | |
|---|---|
| Kind | UI framework with official router (Vue Router), store (Pinia) and devtools. Meta-framework: Nuxt. |
| Version checked (2026-10-05) | vue 3.5.43; 3.6.0 at release candidate (Vapor mode) |
| Reactivity | Proxy-based fine-grained reactivity (`ref`, `reactive`, `computed`, `watch`) feeding a virtual DOM renderer; Vapor mode (3.6) compiles components without a virtual DOM. |
| Rendering | Client with Vite; SSR/SSG via Nuxt, Vike or `vue/server-renderer`. |
| Best at | Single-file components, approachable reactivity, strong official ecosystem. |

## Pattern map

| # | Pattern | How you build it in Vue |
|---|---|---|
| 1 | Static content | SFC layouts and slots; real static output needs Nuxt (prerender) or Vike. |
| 2 | Forms | `v-model` on native inputs, `defineModel` for components; validation with VeeValidate or Vuelidate + Zod; progressive enhancement is yours to keep (plain `<form action>` works). |
| 3 | Dynamic | Vue Router (lazy routes, guards, scroll behaviour); data via TanStack Query for Vue, Pinia Colada or `useFetch` in Nuxt; `<Suspense>` for async components. |
| 4 | Client state | Pinia stores with actions; undo via `pinia-plugin-history` or your own stack; `v-for` with `:key`; `storage` event + `watch` for cross-tab. |
| 5 | 3D | `useTemplateRef` + `onMounted`/`onUnmounted`, or TresJS (declarative three.js); `defineAsyncComponent` for the chunk. |
| 6 | Real-time | `onMounted` subscribe / `onUnmounted` close; `shallowRef` for large arrays so pushes do not deep-track; `watchEffect` with `flush: 'post'`. |
| 7 | Media | `<img>` as in the baseline; `@nuxt/image` in Nuxt; native dialog with a ref; `<Teleport>` for overlays. |
| 8 | Cross-cutting | `provide`/`inject` or Pinia for theme and session; router guards (`beforeEach`); vue-i18n; the inline theme script stays. |
| 9 | Content | `unplugin-vue-markdown` or VitePress for docs; Nuxt Content for collections. |
| 10 | Data grid | TanStack Table (Vue adapter) + TanStack Virtual or vue-virtual-scroller; workers via Vite. |
| 11 | Composite widgets | Reka UI (headless, formerly Radix Vue), Ark UI, Headless UI; PrimeVue, Vuetify, Nuxt UI for full kits. |
| 12 | Motion | Built in: `<Transition>`, `<TransitionGroup>` (FLIP moves included), `v-show` transitions; VueUse `useMotion`, Motion for Vue. |
| 13 | Offline | `vite-plugin-pwa` (Vue preset) or `@vite-pwa/nuxt`. |
| 14 | Async consistency | No transition API; keep the old tab with TanStack Query for Vue (`placeholderData: keepPreviousData`) or Pinia Colada, dim on `isFetching`, and let `watch(tab, (t, _, onCleanup) => …)` abort the previous request so the latest wins; `<Suspense>` (still experimental) keeps old content while new async deps resolve (`timeout` prop). Heavy: three queries, the dependent one via `enabled`, per-source `refetch`, atomic commit by assigning one `shallowRef` once (Vue batches a tick's updates); optimistic rollback in a mutation's `onMutate`/`onError`. |
| 15 | State across navigation | `<KeepAlive>` around `<RouterView v-slot="{ Component }">` with `include`/`max`; `onActivated`/`onDeactivated` pause the animation; Vue Router `scrollBehavior(to, from, savedPosition)` restores scroll and the filter lives in `route.query`. KeepAlive detaches the subtree (media pauses, pane scroll must be saved in `onDeactivated`); `v-show` + `inert` matches the baseline's hidden mode exactly; destroy mode is `v-if` or a `:key` bump. |
| 16 | Server functions | Nothing built in; keep `src/lib/rpc.js` behind a composable, or tRPC/oRPC with their TanStack Query Vue bindings (batching and dedupe from the client link, validation from Zod/Valibot schemas, auth in the server context); the live subscription stays an `EventSource` opened in `onMounted` and closed in `onUnmounted`; Nuxt's Nitro routes are the framework-side answer (nuxt.md). |
| 17 | Sync and local-first | Nothing built in; wrap `src/lib/sync.js` in a Pinia store (outbox persisted with `pinia-plugin-persistedstate` or VueUse `useStorage`, replay triggered by VueUse `useOnline`); the mock API's sync endpoints stay as they are; TanStack DB's Vue adapter (`@tanstack/vue-db`) gives live queries over Electric or query collections (verify). |
| 18 | Morphing and streaming HTML | Nothing built in; Vue patches its own vnodes, not server HTML, and `v-html` replaces (focus lost). Light: `morph()` from `src/lib/morph.js` or idiomorph on a `useTemplateRef` container; heavy: read the body with `fetch` + `TextDecoder` and morph per chunk by hand; `renderToWebStream` from `vue/server-renderer` can produce the streamed fragments; `moveBefore` is a plain DOM call (`<TransitionGroup>` FLIP is the Vue-side reorder). |
| 19 | Platform navigation | Light needs no framework: plain HTML pages in the Vite multi-page build with `@view-transition`, `rel="expect"` and speculation rules. Heavy: Vue Router 4 sits on the History API, not the Navigation API: `createWebHistory('/navigation/app')`, guards returning `false` to cancel, `scrollBehavior`, focus moved by hand in `afterEach`, `document.startViewTransition` in `beforeResolve`; for a real Navigation API + URLPattern router keep `navigation-heavy.js` and mount Vue views into its outlet with `createApp`. |
| 20 | Error boundaries | Light: `app.config.errorHandler` plus `window.onerror`/`unhandledrejection` beaconing as in the baseline. Heavy: a `<Boundary>` wrapper using `onErrorCaptured` (return `false` to stop propagation) with a fallback slot and a `:key` bump to retry; `defineAsyncComponent({ errorComponent, onError(err, retry, fail, attempts) })` has retry built in for load failures; backoff timers and fingerprinting by hand. |
| 21 | Observability | Nothing built in beyond Vue Devtools; `app.config.performance = true` adds component init/render marks to the Performance panel (dev only). Light: `web-vitals` or the baseline's `PerformanceObserver` code unchanged; heavy: `performance.mark`/`measure` around the fetch and `nextTick`, `Server-Timing` read from resource timing, export via `@opentelemetry/sdk-trace-web` or the hand-rolled JSON. |
| 22 | Security hardening | Precompiled SFCs need no `unsafe-eval`; the runtime-compiler build (in-DOM templates, `vue.esm-browser`) does, so keep the build step; the hashed theme script stays as in the baseline; `v-html` is unsanitised, so route it through DOMPurify or the baseline sanitiser inside a Trusted Types policy; CSRF double-submit is yours as in the baseline; Vue 3.5+ runtime-dom registers its own Trusted Types policy for the `innerHTML` it performs (verify). |
| 23 | Styling strategy | `<style scoped>` (attribute hashing; `:deep()`, `:slotted()` for the slot boundary, `:global()`), `<style module>` for CSS Modules, `v-bind()` in CSS for reactive custom properties; tokens, `light-dark()`, layers, `@scope`, container queries, `@property`, subgrid and `color-mix()` are plain CSS and pass through Vite untouched (Lightning CSS via `css.transformer` if you need lowering); Tailwind 4 via `@tailwindcss/vite` or UnoCSS if the port wants utilities. |

## Migrating the baseline

1. `npm create vue@latest` (Vite under the hood); keep `mockApi()` in `vite.config`.
2. Partials become layout components; pages become routes in Vue Router with lazy imports.
3. `store.js` → Pinia; `router.js` → Vue Router; `api.js` → TanStack Query for Vue or a composable around `fetch`; `toast.js` → a small plugin + `<Teleport>`.
4. Templates replace `h()` calls; keep `rows.js` and the worker as they are.

## From the 2025–26 blog

Vapor Mode is the 3.6 headline (per-component `<script setup vapor>`, interop plugin for mixed trees, sub-10 kB base when fully Vapor); measure the state and real-time pages in both modes. VoidZero's Vite+ and Void are commercial layers around the MIT tools underneath.

## Watch out for

- Destructuring `reactive` objects or props loses reactivity (`toRefs`, `storeToRefs`); `.value` on refs in script, not in templates.
- Deep reactivity on large arrays (grid, dashboard) is expensive: use `shallowRef`/`markRaw`.
- Options API vs Composition API: pick one for the port and say which.
- Vapor mode components have interop rules with VDOM components; if you try 3.6, note which pages you ran in Vapor.
- SSR needs Nuxt or deliberate setup; the plain Vite template is client-only.

## Links

- https://vuejs.org, https://router.vuejs.org, https://pinia.vuejs.org
- https://nuxt.com (see nuxt.md)
