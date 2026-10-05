# Frontend Baseline

A framework-free reference project for a frontend framework survey. Twenty-three patterns that frameworks, libraries and meta-frameworks compete on, each implemented twice: a **light** page (the floor: the smallest honest version) and a **heavy** page (the ceiling: what a product needs within a year). Re-implement the pages in a framework, then compare against this baseline and against the other implementations.

Written in plain HTML, CSS and JavaScript. The dependencies are infrastructure, not UI frameworks:

| Dependency | Role |
|---|---|
| Vite 8 | Dev server, bundling, multi-page build (Rolldown underneath). A build tool, not a framework. |
| three.js | 3D engine for the scene pages. |
| marked | Markdown parser for the content pipeline. |
| @fontsource-variable/roboto | Self-hosted font. |

Four small scripts stand in for things meta-frameworks ship, so every framework port can keep them and stay comparable: `scripts/html-partials.js` (build-time includes, i.e. layouts, plus CSP hashes for inline scripts), `scripts/mock-api.js` (dev/preview API: posts, likes, contact, upload, login, status, server-sent events, RPC dispatch, a sync log, HTML fragments, error reports, CSRF, Server-Timing, and the app-shell rewrite for the Navigation API page), `scripts/build-content.mjs` (Markdown to pages, index, search index, RSS, sitemap), `scripts/gen-images.mjs` (image pipeline and app icons). Everything else is the platform.

## Run

```sh
pnpm install
pnpm dev       # http://localhost:5173, generates images and content pages first
pnpm build     # dist/ with per-page assets: compare sizes here
pnpm preview   # serves dist/ with the same mock API
pnpm check     # builds, then checks every page's links, assets and structure
pnpm weight    # shipped bytes per page (gzip) from the last build
```

Requires Node 22 and pnpm (`corepack enable` picks the version from `packageManager`). Generated files (`public/images`, `content/`, feed, sitemap, icons) are git-ignored and rebuilt before `dev` and `build`.

## Light and heavy

The light page measures what a framework costs before it helps: bytes shipped, files required, concepts to learn. The heavy page measures how it holds up: state, errors, caching, keyboard support, large data, lifecycle and cleanup. Most frameworks are good at one of these. Both numbers matter.

## Patterns

For each: the pages, what the pattern is, why it matters, and where the frontend community has invested.

### 1. Static content (`static/`)
- **Light:** an about page. **Heavy:** a document with a sticky table of contents, tables, code, an art-directed `<picture>`, footnotes, JSON-LD and a print stylesheet.
- **Pattern:** content-first pages with shared layout, SEO metadata and no page JavaScript.
- **Why it matters:** most of the web is this. TTFB, LCP and "how much JS do I ship for a page that needs none" are decided here; layouts are the seed of every component system.
- **Community effort:** SSG and SSR, islands and partial hydration, zero-JS-by-default (Astro), nested layouts, `<head>` management, font and image optimisation, cross-document view transitions.

### 2. Forms (`forms/`)
- **Light:** a newsletter form with no script. **Heavy:** inline validation via the Constraint Validation API, fetch submission, server errors mapped to fields, draft autosave, honeypot, and a throttled file upload with progress and cancel.
- **Pattern:** forms that work before JavaScript and get better with it.
- **Why it matters:** forms are where accessibility, validation, mutation and server round trips meet; controlled vs uncontrolled inputs is a classic framework split.
- **Community effort:** progressive enhancement (React Router `Form`, SvelteKit `use:enhance`), server actions (Next.js, Astro), `useActionState`/`useOptimistic`, shared schema validation (Zod, Valibot), Signal Forms (Angular), form libraries.

### 3. Dynamic data and routing (`dynamic/`)
- **Light:** fetch a list, render it, handle failure. **Heavy:** a hash router with cancellation per navigation, URL as state, skeletons, retry, cache with TTL and invalidation, prefetch on hover, a guarded route with a mutation, an optimistic like with rollback, route announcements for screen readers.
- **Pattern:** routing plus data fetching: the core of a meta-framework.
- **Why it matters:** where data loads (client, server, build), how it is cached and how the URL encodes state decide architecture, SEO and perceived speed.
- **Community effort:** loaders and actions, server components and streaming, Suspense, query caches (TanStack Query, SWR, `useFetch`), typed routing and search params (TanStack Router), link prefetching, route-level code splitting, scroll restoration, optimistic UI.

### 4. Client state (`state/`)
- **Light:** a persisted to-do list. **Heavy:** a kanban board with an immutable store, undo and redo, derived state, drag and drop, dialog editing, keyboard shortcuts, cross-tab sync, naive timed re-rendering and a 300-card stress button.
- **Pattern:** state management and the rendering strategy that turns state into DOM.
- **Why it matters:** virtual DOM, compiled updates and fine-grained signals show up here as real numbers and real bugs (lost focus, lost input, stale closures).
- **Community effort:** signals (Solid, Preact, Vue, Angular, Svelte 5, the TC39 proposal), compilers (Svelte, React Compiler), state libraries (Redux Toolkit, Zustand, Pinia, Jotai), keyed reconciliation, transitions and scheduling, drag-and-drop libraries.

### 5. 3D and imperative libraries (`scene/`)
- **Light:** a spinning cube with a static import. **Heavy:** three.js in a lazy chunk, sizing with ResizeObserver, a visibility-gated render loop, UI bound to the scene by mutation, raycast picking, an instanced mesh, full disposal on page hide.
- **Pattern:** wrapping an imperative library (WebGL, maps, editors, charts) inside a declarative UI.
- **Why it matters:** every app eventually does this; the framework's lifecycle, refs and effect semantics (React StrictMode double-invoke, for example) decide how painful it is. The chunk also exposes code splitting.
- **Community effort:** declarative bindings (react-three-fiber, TresJS, Threlte, angular-three), `client:only`/`ssr: false`, effect cleanup conventions, dynamic imports.

### 6. Real-time updates (`realtime/`)
- **Light:** poll one endpoint every two seconds, pause when hidden. **Heavy:** server-sent events at 2 to 30 Hz, ring buffers, derived stats, hand-written SVG sparklines, one DOM update per frame, switchable patch-nodes vs rebuild-subtree with measured cost, keyed log rows, pause and reconnect, cleanup.
- **Pattern:** subscriptions and high-frequency updates.
- **Why it matters:** update rate is the stress test for a reactivity model and its scheduler; it exposes subscription cleanup and memory growth.
- **Community effort:** batching and scheduling, fine-grained updates, `useSyncExternalStore`, stores and observables (RxJS, Svelte stores, nanostores), time slicing, framework SSE and WebSocket helpers.

### 7. Media and lazy loading (`media/`)
- **Light:** a high-priority hero with `srcset` and `sizes`, lazy thumbnails, no script. **Heavy:** infinite scroll via IntersectionObserver with a button fallback, a `<dialog>` lightbox with keyboard navigation and focus return, deep links, a same-document view transition, build-time data (`gallery.json`).
- **Pattern:** images, intersection, modals and build-time assets.
- **Why it matters:** images dominate page weight and LCP; lazy loading, intersection and modals are small platform features that frameworks wrap differently and accessibility depends on.
- **Community effort:** image components (`next/image`, `astro:assets`, `@nuxt/image`, unpic), build-time image pipelines, virtualisation, View Transitions integration, content collections.

### 8. Cross-cutting concerns (`account/`)
- **Light:** a theme switch applied before first paint. **Heavy:** theme, runtime i18n (English and Japanese) with the `lang` attribute, a cookie session set by the server, `/api/me`, protected content, redirect-after-login (`?next=`), and the route guard used by the dynamic page.
- **Pattern:** global state that server and client must agree on.
- **Why it matters:** exposes context and providers, middleware, cookies vs localStorage and hydration mismatches.
- **Community effort:** middleware and proxies, hooks (SvelteKit), route guards (Angular, Vue Router), context and DI, i18n libraries and locale routing, theme libraries, auth libraries (Auth.js, Better Auth).

### 9. Content pipeline (`content/`)
- **Light:** one Markdown file with front matter becomes one page. **Heavy:** a collection of five articles: generated index, tags, per-article table of contents, previous and next, reading time, a JSON search index with client-side search, an RSS feed and a sitemap.
- **Pattern:** authoring in Markdown, building to HTML.
- **Why it matters:** content sites are the largest category of frameworks' users (docs, blogs, marketing); the pipeline decides authoring experience, build time and whether components can live in content.
- **Community effort:** content collections (Astro, Nuxt Content), MDX and Markdoc, syntax highlighting (Shiki), search (Pagefind), feeds and sitemaps, incremental builds.

### 10. Data grid (`table/`)
- **Light:** sixty rows in a `<table>`, sortable and filterable, fully re-rendered on change. **Heavy:** up to 200,000 rows generated in a worker, virtual scrolling with fixed row height, sorting and filtering in the worker or on the main thread for comparison, sticky header, mouse and keyboard selection, ARIA grid roles, CSV export.
- **Pattern:** large lists, virtualisation and off-main-thread work.
- **Why it matters:** enterprise UIs are tables; rendering cost per row, keyed reuse and the ability to keep the main thread responsive separate frameworks quickly.
- **Community effort:** TanStack Table and Virtual, AG Grid, react-window, worker helpers (Comlink), build-tool worker support, concurrent rendering.

### 11. Composite widgets (`components/`)
- **Light:** `details` accordion, Popover API menu with anchor positioning, dialog via invoker commands, `datalist` combobox, no script. **Heavy:** ARIA tabs, an editable combobox with `aria-activedescendant`, a menu button with typeahead, and a Ctrl+K command palette, all by hand.
- **Pattern:** accessible composite widgets, the thing component libraries exist for.
- **Why it matters:** this is most of a design system's cost, and the platform keeps absorbing it (popover, dialog, anchor positioning, invokers).
- **Community effort:** headless libraries (Radix, React Aria, Headless UI, Ark, Melt, Kobalte, Angular CDK), shadcn-style copy-in components, web component design systems, the ARIA Authoring Practices Guide.

### 12. Motion (`motion/`)
- **Light:** hover and focus transitions, a popover that animates in and out with `@starting-style`, a scroll-driven progress bar and viewport reveals, no script. **Heavy:** FLIP reordering with the Web Animations API, enter and leave animations, a draggable with velocity and a spring, view transitions between two layouts.
- **Pattern:** motion that needs a scheduler and element identity.
- **Why it matters:** list and layout animation is where frameworks differ most visibly: Svelte and Vue ship it, React needs a library, and all of them must respect reduced motion.
- **Community effort:** `<Transition>`/`<TransitionGroup>` (Vue), `transition:`/`animate:flip` (Svelte), Motion for React, Angular animations, View Transitions API integration, scroll-driven animations.

### 13. Offline and installable (`offline/`)
- **Light:** a web app manifest, generated icons, an install prompt and a connectivity indicator. **Heavy:** a service worker scoped to `/offline/` with network-first pages and API, stale-while-revalidate assets, an offline fallback page, cache inspection and an update-when-accepted flow.
- **Pattern:** progressive web apps.
- **Why it matters:** caching strategies and update flows are easy to get wrong and hard to debug; frameworks hide them behind plugins with very different defaults.
- **Community effort:** Workbox, vite-plugin-pwa, Serwist, background sync, push, framework PWA modules.

### 14. Async consistency (`async/`)
- **Light:** tabs whose old content stays, dimmed, until the new content is ready; the latest request wins and older responses are dropped. **Heavy:** a view composed from three sources (one depending on another, one flaky) that commits atomically or streams, with per-source retry, request versioning and an optimistic lane that rolls back.
- **Pattern:** keeping the screen consistent while async work is in flight.
- **Why it matters:** tearing, skeleton flashes and race conditions are the bugs users notice most; Solid 2.0, Async Svelte and React transitions each rebuilt their core around this.
- **Community effort:** transitions and `startTransition`, Solid 2.0's async-native graph and optimistic lanes, Async Svelte, Suspense boundaries, query libraries' keep-previous-data.

### 15. State across navigation (`keepalive/`)
- **Light:** back from a detail view restores the list's scroll position and filter from the history entry. **Heavy:** three tabs (scrolled list, half-written form, running animation) kept alive hidden and inert with the animation paused, against a destroy-and-recreate mode with creation counters.
- **Pattern:** state that should survive leaving and returning.
- **Why it matters:** every router destroys views by default; the cost shows up as lost scroll, lost input and re-fetching.
- **Community effort:** React `<Activity>`, Vue `<KeepAlive>`, Angular route reuse, SvelteKit snapshots and shallow routing, scroll restoration in routers.

### 16. Server functions (`rpc/`)
- **Light:** one function call that the client library turns into a request. **Heavy:** batching of same-tick calls, deduplication of identical in-flight calls, per-call validation errors, an auth-guarded mutation, and a live subscription over server-sent events, all through one endpoint with a dispatch table.
- **Pattern:** calling the server as functions instead of designing an API.
- **Why it matters:** this is where SvelteKit remote functions, Solid and TanStack server functions, and Next and Astro actions are heading; the baseline makes the hidden request shape visible.
- **Community effort:** `server$`, `createServerFn`, remote functions (`query`, `form`, `command`, `query.live`), server actions, tRPC and oRPC, typed RPC with schema validation.

### 17. Sync and local-first (`sync/`)
- **Light:** notes that apply locally first and queue in an outbox replayed when the network returns. **Heavy:** server versions, conflict detection and resolution, idempotent replays, and a live change feed from other devices (with a button that acts as one).
- **Pattern:** data that is owned locally and synchronised.
- **Why it matters:** offline-tolerant and multi-device apps need it, and mainstream tooling arrived in 2026.
- **Community effort:** TanStack DB, ElectricSQL, Zero, LiveStore, Replicache and Reflect, CRDT libraries (Yjs, Automerge), PowerSync.

### 18. Morphing and streaming HTML (`morph/`)
- **Light:** a server-rendered fragment refreshed every three seconds, either replaced with `innerHTML` or morphed so focus, typed text and node identity survive. **Heavy:** a response streamed in chunks and morphed in progressively, and `Element.moveBefore` versus `insertBefore` for reordering without resetting animations.
- **Pattern:** updating the DOM from server HTML without losing client state.
- **Why it matters:** it is how hypermedia frameworks compete with client rendering; htmx 4 built morphing and streaming in.
- **Community effort:** idiomorph, morphdom, Turbo morphing, Alpine morph, streaming SSR, `moveBefore`.

### 19. Platform navigation (`navigation/`)
- **Light:** cross-document view transitions with a morphing title, a render-blocking `<link rel="expect">`, speculation rules, no script. **Heavy:** a router on the Navigation API and URLPattern at real paths under `/navigation/app`, with interception, scroll and focus handling, cancellation, a view transition per navigation and the entries list; the server serves the shell for any URL under the prefix.
- **Pattern:** routing with what the browser now provides.
- **Why it matters:** Interop 2025 made the Navigation API, URLPattern and view transitions cross-browser; a router is a much smaller thing than it used to be.
- **Community effort:** Navigation API adoption in routers, speculation rules and prerendering, cross-document view transitions, render blocking.

### 20. Error boundaries (`errors/`)
- **Light:** global `error` and `unhandledrejection` handlers that beacon every uncaught failure. **Heavy:** three sections in their own boundaries with fallback UI, exponential-backoff retry, then a manual retry; failures fingerprinted and counted rather than resent.
- **Pattern:** containing failure to the part that failed.
- **Why it matters:** one bad fetch should not blank a page; Angular 22 added template boundaries, Solid 2.0 retries from the failed source.
- **Community effort:** React error boundaries, Angular `@boundary`, SvelteKit `+error`, Solid `<ErrorBoundary>` and self-healing retry, error reporting services.

### 21. Observability (`observe/`)
- **Light:** Core Web Vitals measured on the page with PerformanceObserver (TTFB, FCP, LCP, CLS, INP approximation, long tasks), with buttons that make them worse. **Heavy:** one click traced across two requests with Server-Timing from the mock API and a render, drawn as a waterfall and exportable as OpenTelemetry-shaped JSON.
- **Pattern:** knowing what the page did and how long it took.
- **Why it matters:** SvelteKit integrated OpenTelemetry, Next shipped a DevTools MCP, React added Performance Tracks: measurement is becoming part of the framework.
- **Community effort:** web-vitals, OpenTelemetry for browsers, Server-Timing, framework dev tools and profilers, RUM services.

### 22. Security hardening (`security/`)
- **Light:** a strict Content-Security-Policy whose inline-script hashes the build computes (the theme reader is one of them), with buttons that try `eval`, inline handlers and third-party scripts. **Heavy:** Trusted Types with a named policy, an allow-list sanitiser for untrusted HTML, and CSRF double-submit on a form checked by the mock API.
- **Pattern:** the browser-side defences every framework has to cooperate with.
- **Why it matters:** inline bootstrap scripts, hydration payloads and dev-server injections all collide with a strict CSP; the 2025–26 supply-chain incidents made the rest of the chain visible.
- **Community effort:** nonce and hash support in frameworks, Trusted Types, built-in sanitisers, CSRF handling in actions, trusted publishing and provenance.

### 23. Styling strategy (`styling/`)
- **Light:** the token system, `light-dark()` and cascade layers, no script. **Heavy:** `@scope` component styles with a slot boundary, container queries on a resizable box, a typed `@property` that animates, `:has()` form states, logical properties with a CSS-only direction switch, `clamp()`, subgrid and `color-mix()`.
- **Pattern:** keeping styles local, responsive and themeable.
- **Why it matters:** frameworks differ in scoping (Svelte and Vue scoped CSS, Angular encapsulation, CSS Modules, Tailwind, CSS-in-JS) and the platform now covers much of it.
- **Community effort:** Tailwind 4, CSS Modules, Lightning CSS, scoped styles, design-token pipelines, `@scope` and container queries adoption.

### Still under consideration

From `docs/landscape-2026.md`: agent-ready UI as a page of its own. Today the contact form and the dynamic heavy page register their actions as WebMCP tools where `document.modelContext` exists; the candidate is a page whose every action is a tool with a schema, plus structured data. Compile targets inside one framework (Vue Vapor on or off, React Compiler on or off) and the caching model on pattern 3 are rows in the measurements table in `docs/README.md`.

## Patterns considered and left out

- **Server rendering and streaming** are not pages; they are a dimension measured on every page in each port (the baseline is static plus client-rendered on purpose).
- **Authentication against a real identity provider:** the mock cookie session covers the client-side shape; the rest is backend.
- **Maps, rich-text editors, charts libraries:** the same pattern as 3D (imperative library integration). Port the scene pages first; add one of these only if a product needs it.
- **Locale-prefixed routing, payments, email, file systems:** backend- or product-specific; note framework support in the sheets instead.
- **Local-first sync and CRDTs, micro-frontends, native and mobile shells:** out of scope for a UI-layer survey.
- **Testing:** a tooling criterion in the rubric, not a page.

## Shared code

`src/lib/` is the part every framework replaces. It is a few hundred lines, and most of it is lifecycle and cleanup.

| File | Stands in for |
|---|---|
| `dom.js` | Rendering: `h()`, `svg()`, `mount()` |
| `store.js` | State: observable store, `withHistory` (undo/redo), `select` (derived) |
| `router.js` | Client routing: params, query, an AbortController per navigation, cleanup hooks, announcements |
| `api.js` | Data layer: fetch wrapper, cache with TTL, `prefetch`, `invalidate`, `HttpError` |
| `rows.js` | Shared data code that also runs in a worker |
| `rpc.js` | Server functions: batching, deduplication, live subscription |
| `sync.js` | Local-first: outbox, versions, conflicts, change feed |
| `morph.js` | DOM morphing and HTML parsing for server-rendered fragments |
| `agent.js` | WebMCP tool registration, feature-detected |
| `elements.js` | Components: `<relative-time>` custom element with connect/disconnect lifecycle |
| `toast.js`, `theme.js`, `i18n.js`, `auth.js` | App-wide services (context and providers in frameworks) |

## Survey

Each framework has a sheet in `docs/<name>.md`: what it is, how each pattern maps onto it, migration steps and what to watch for. `docs/README.md` has the procedure, the measurements and the rubric; `docs/verify.md` says how to verify a port pattern by pattern, by tool and by hand.

## Layout

```
index.html                 hub
<pattern>/light.html       one directory per pattern, two pages each
<pattern>/heavy.html
offline/fallback.html      served by the service worker when a navigation fails
content/                   generated from content-src/ (Markdown with front matter)
src/partials/              head, header (pattern menu), footer, variant switcher, included at build time
src/pages/                 one JS/CSS module per page (<pattern>-<variant>.js), plus table.worker.js
src/lib/                   shared plumbing (see above)
src/styles/                tokens (light-dark()), base styles
src/data/gallery.json      generated build-time data
public/                    mock database, generated images, manifest, service worker
scripts/                   Vite plugins, content build, image generator, dist checker (pnpm check), page weights (pnpm weight)
tools/smoke/               headless-Chrome page and flow tests, own package.json (see its README)
docs/                      one sheet per framework, survey guide, template
```
