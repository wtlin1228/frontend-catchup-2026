# Nuxt

| | |
|---|---|
| Kind | Vue meta-framework: file routing, auto-imports, data fetching composables, Nitro server, modules ecosystem. |
| Version checked (2026-10-05) | nuxt 4.5.2 (Nuxt 5 on Nitro 3 is announced; check status) |
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

## Migrating the baseline

1. `npm create nuxt@latest`; port the mock API to `server/api/*` (Nitro) rather than keeping the Vite plugin: this exercises the server half Nuxt provides.
2. Partials become layouts and `app.vue`; pages become files under `app/pages`.
3. `api.js` → `useFetch`; `store.js` → Pinia; `router.js` → gone; `theme.js` → `useCookie`.

## From the 2025–26 blog

Nuxt 3 reached end of life on 31 July 2026; Nuxt 5 brings Nitro 3, h3 v2 and the Vite Environment API; roadmap modules include auth utilities, an accessibility module and built-in SEO/PWA. Nitro presets make deployment portability a strength to measure.

## Watch out for

- Auto-imports hide where things come from; turn on the generated `.nuxt/types` and read them.
- `useFetch` keys, dedupe and the lazy/server options decide hydration behaviour; wrong settings fetch twice.
- Nuxt 4 moved app code into `app/`; older tutorials point at the old layout.
- Nitro deployment presets differ in what they support (ISR, SSE); check the target.

## Links

- https://nuxt.com, https://content.nuxt.com, https://image.nuxt.com
