# Vike

| | |
|---|---|
| Kind | A Vite-native meta-framework core with extensions: file-based or string or function routing, per-page rendering modes, data hooks, with `vike-react`, `vike-vue` and `vike-solid` supplying the UI integration (`vike-react-rsc` is an experimental React Server Components extension). |
| Version checked (2026-10-12) | vike 0.4.267 (2026-09-28; still on the 0.4 line, no 1.0 or semver stability statement), vike-react 0.6.29 |
| Reactivity | The UI library's. |
| Rendering | Per page: `+ssr`, `+prerender`, `+stream`, SPA, HTML-only and islands; low-level `onRenderHtml()`/`onRenderClient()` hooks for any UI library; server integration through `renderPage()` in your own server or `+server.js`. |
| Best at | Teams that have chosen a UI library and want Next-or-Nuxt-shaped conventions without the vendor and runtime coupling; adding SSR or pre-rendering to an existing Vite app one page at a time. |

The rows assume `vike-react`; swap the UI-library rows (4, 5, 6, 10, 11, 12, 14, 18, 20, 23) for vue.md or solid.md when using `vike-vue` or `vike-solid`.

## Pattern map

| # | Pattern | How you build it with Vike |
|---|---|---|
| 1 | Static content | `+Page` and `+Layout` components, `+prerender: true` (or pre-render the whole site), `+title` and `+Head`; with `+ssr: false` off and no interactive component the output is HTML with the library's runtime still shipped unless the page is HTML-only, which is the first number to record. |
| 2 | Forms | No actions of its own: the form posts to an endpoint in your server (`+server.js`, Express, Hono) or the mock API; client-side the React row applies; Telefunc (same author) gives typed RPC for the heavy page's submit. |
| 3 | Dynamic data and routing | `+data()` runs server-side (or client-side on navigation) and `useData()` reads it, `+onBeforeRender()` for the lower-level hook, `+guard()` for the route guard with `throw redirect()` from `vike/abort`, `+route` strings or Route Functions for `/posts/:id`, `navigate()` from `vike/client/router`, `prefetch()` and `+prefetchStaticAssets`; caching and optimistic updates come from TanStack Query (`vike-react-query`) or the baseline's `api.js`. |
| 4 | Client state | As react.md; `+onHydrationEnd` and `+onPageTransitionStart`/`+onPageTransitionEnd` are the lifecycle hooks around navigation. |
| 5 | 3D and imperative libraries | `clientOnly()` from `vike-react/clientOnly` (or `+ssr: false` on the page) keeps three.js out of SSR; the rest as react.md. |
| 6 | Real-time updates | As react.md: an effect owns the `EventSource`; the SSE endpoint is yours. |
| 7 | Media and lazy loading | Native attributes and the baseline's gallery code; no image component of its own. |
| 8 | Cross-cutting concerns | `pageContext` carries the user, theme and locale from your server middleware into every hook and component (`usePageContext()`); `+Wrapper` for providers; `+onBeforeRoute()` strips a locale prefix for i18n routing; guards as in row 3. |
| 9 | Content pipeline | Markdown through Vite (`@mdx-js/rollup` or a plugin) plus `+prerender` with a list of URLs from `+onPrerenderStart` or `+prerender` returning URLs; feeds and sitemaps from your own script as in the baseline. |
| 10 | Data grid | As react.md. |
| 11 | Composite widgets | As react.md. |
| 12 | Motion | As react.md; `+onPageTransitionStart`/`End` for page-level transitions, `document.startViewTransition` by hand. |
| 13 | Offline and installable | `vite-plugin-pwa`; nothing of its own. |
| 14 | Async consistency | The client router fetches the next page's `+data` before swapping, so navigations keep the old page (check what it shows while `+data` runs, and whether a superseded navigation is dropped, before porting the light page) (verify); in-page composition as react.md. |
| 15 | State across navigation | `+keepScrollPosition` keeps scroll across client navigations; the filter lives in the URL; no keep-alive of page components, so the heavy tabs are one page as in the baseline. |
| 16 | Server functions | Telefunc: a `.telefunc.ts` function imported and called from the client, one request per call, with validation and auth through its context (`getContext()`); no batching or subscriptions, so keep `rpc.js` for those and record the difference. |
| 17 | Sync and local-first | Nothing built in; TanStack DB or `src/lib/sync.js` as react.md. |
| 18 | Morphing and streaming HTML | `+stream` streams the library's own output (React's `renderToPipeableStream`); fragments from another server are morphed by hand as react.md. |
| 19 | Platform navigation | Vike's client router sits on the History API (`+clientRouting`), intercepts links and prefetches; the light page is a pre-rendered page with `rel="expect"` and speculation rules in `+Head`; the shell for `/navigation/app/*` is a catch-all Route String (`/navigation/app/*`); a Navigation API router stays the baseline's code. |
| 20 | Error boundaries | `_error/+Page` renders error pages, `throw render(500)` from `vike/abort` in hooks; section-level boundaries as react.md. |
| 21 | Observability | Nothing built in; hooks are plain functions, so `Server-Timing` is set in your server around `renderPage()`. |
| 22 | Security hardening | `pageContext.cspNonce` lets Vike put a per-request nonce on the scripts it injects (set it in your server before `renderPage()`), so a strict policy works with `'strict-dynamic'`; pre-rendered pages need hashes computed by hand; Trusted Types and CSRF as react.md (verify the nonce setting's current name). |
| 23 | Styling strategy | Vite's CSS Modules and Tailwind; everything else as react.md. |

## Migrating the baseline

1. `npm create vike@latest` with the React template; keep `mockApi()` in `vite.config` or move the endpoints into `+server.js`.
2. Partials become `+Layout` and `+Head`; each `<pattern>/<variant>.html` becomes `pages/<pattern>/<variant>/+Page.jsx` with `+prerender` for the light pages that need no server.
3. `router.js` becomes Vike's routing, `api.js` becomes `+data` plus TanStack Query, the rest as react.md.

## Watch out for

- The 0.4 version line has lasted years; releases are frequent and the changelog is the place to look for breaking changes, since there is no semver major to signal them.
- Everything that Next or Nuxt bundle (image, fonts, actions, middleware, deployment adapters) is either an extension or your own server code; record what you had to add.
- The hooks are small and documented, but the mental model (which hooks run where, `pageContext` passing) is Vike-specific; the `vike-react` quick-start hides most of it until you need a custom integration.

## Links

- https://vike.dev, https://vike.dev/why
- https://telefunc.com
