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
