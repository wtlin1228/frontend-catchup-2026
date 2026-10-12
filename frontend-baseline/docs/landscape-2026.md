# Landscape review: what maintainers were writing about in 2025–2026

Read on 2026-10-05 from the official blogs and release notes of each framework plus their creators' writing. Each entry ends with what it implies for the survey. The "Gaps" section at the end lists what the baseline is missing because of it.

## By project

**React** (react.dev blog): React moved to the React Foundation under the Linux Foundation (announced Oct 2025, operating Feb 2026); React Compiler 1.0; React 19.2 added `<Activity>` (keep hidden UI mounted with its state), Performance Tracks in the profiler and `useEffectEvent`; View Transitions are still a Labs feature; a critical RSC security advisory shipped in late 2025. Implication: governance and security response are measurable; `<Activity>` points at a pattern the baseline lacks (state that survives navigation).

**Vue / Evan You** (blog.vuejs.org, voidzero.dev): Vapor Mode ships in 3.6 as a per-component opt-in with an interop layer for mixed trees; 3.6 was still at release candidate in October 2026. VoidZero released Vite 8 (Rolldown), Vite+ (`vp`: Vite, Vitest, Oxlint, Oxfmt, tsdown, task runner behind one commercially licensed, source-available CLI) and Void, a Cloudflare-based deploy platform. Implication: a framework can have two compile targets; measure both. Toolchain licensing and vendor coupling are now criteria for the stack under a framework, not only for the framework.

**Svelte / Rich Harris** (svelte.dev/blog, monthly "What's new"): Async Svelte (`await` inside components), remote functions (`query`, `form`, `command`, `prerender`, `query.batch`, long-lived `query.live` subscriptions), SvelteKit 3 (Svelte 5 and Node 22 required, `#lib`, config through the Vite plugin, Rolldown-bundled adapters), integrated OpenTelemetry tracing, a Svelte MCP server and community CLI plugins. Implication: "call the server, not an API" is a pattern of its own; observability is becoming a framework feature.

**Angular** (blog.angular.dev): v22 (June 2026) made Signal Forms and Angular Aria (headless accessible components) stable, added `@Service` and `injectAsync`, OnPush by default, template-level `@boundary` error boundaries (preview), per-route cleanup, official agent skills and experimental WebMCP support; v22.1 announced one major release per year. Implication: error boundaries and accessibility primitives are first-class; agent integration has reached the framework layer.

**Solid / Ryan Carniato** (solidjs.com/blog, "Composing Time"): Solid 2.0 (RC) makes async native to the reactive graph: computations return promises, the graph suspends and resumes, `<Loading>` replaces `<Suspense>`, `action()` with optimistic lanes, projections, "self-healing" retry from the failed source, and one reactive graph spanning server and client (server functions, live streams, streaming SSR). Carniato frames fine-grained reactivity as the model for an agent-written world. Implication: async consistency (no tearing, pending state that does not rip the UI away) is a pattern the baseline only brushes.

**Next.js / Vercel** (nextjs.org/blog): Next 16 introduced Cache Components (`"use cache"` with partial prerendering), a DevTools MCP server for AI-assisted debugging, `proxy.ts` replacing middleware, Turbopack by default with filesystem caching, incremental prefetching and layout deduplication; 16.3 continued with app-shell prefetching and cached navigations. State of JS 2025 ranked it most used and most controversial. Implication: the caching model is now something to compare explicitly, and navigation prefetch strategy is part of pattern 3.

**TanStack / Tanner Linsley** (tanstack.com/blog): Start 1.0 on Nitro (and Rsbuild as an alternative to Vite), TanStack DB (a client-side database with differential dataflow, query-driven sync, SQLite persistence and offline support), TanStack AI (AG-UI, MCP), Table v9, Pacer, a 5x SSR throughput profiling write-up, and a public postmortem of the May 2026 npm supply-chain compromise (GitHub Actions cache poisoning and OIDC token extraction; 84 malicious versions across 42 packages; React Router was also affected). Implication: sync/local-first has mainstream tooling; supply-chain exposure and server-side throughput are criteria.

**Nuxt** (nuxt.com/blog, roadmap): Nuxt 4 is the stability release; Nuxt 5 brings Nitro 3, h3 v2 and the Vite Environment API; Nuxt 3 reached end of life on 31 July 2026; core-module roadmap includes auth utilities, an accessibility module and built-in SEO/PWA. Implication: support windows and the size of the bundled dependency surface (Nitro, h3, unjs) are longevity criteria.

**Remix 3 / Ryan Florence and Michael Jackson** (remix.run): a new zero-dependency framework without React, built on Fetch, Request/Response, FormData, Web Streams and Web Crypto so it runs on any JavaScript runtime; "model-first development" (AI) is a stated principle; packages ship agent skills; `<Frame>` handles async sections; full-stack HMR and SPA support arrived during beta. Implication: runtime portability (Node, Bun, Deno, workers) is a criterion; so is how a framework presents itself to agents.

**htmx / Carson Gross** (htmx.org/essays): htmx 4.0.0 shipped on 28 August 2026 after an eight-month rewrite: fetch instead of XMLHttpRequest, built-in DOM morphing and streaming HTML, with htmx 2 staying npm's `latest` until 2027 and supported indefinitely. Datastar is the hypermedia-plus-signals alternative. Implication: morphing (state-preserving DOM updates from server HTML) and streaming HTML are patterns; perpetual support is a legitimate longevity axis.

**Astro** (astro.build/blog): Astro 7 (mid-2026) rewrote the compiler in Rust, adopted Vite 8, stabilised route caching, added Advanced Routing (`src/fetch.ts`), experimental CDN cache providers, a background dev server and structured logging. State of JS 2025 put it 39 points ahead of Next.js in meta-framework satisfaction. Implication: build throughput and CDN-level caching belong in the measurements.

**React Router 8, Preact 11, Qwik 2, Lit**: React Router moved to yearly majors, ESM-only, middleware on by default, docs shipped in `node_modules` and an agent skill installed by `create-react-router`; RSC framework mode remains unstable. Preact 11 shipped Hydration 2.0, `Object.is` dependency checks and fragment returns, with `preact-iso` replacing `preact-router` and Vite replacing `preact-cli`. Qwik 2 is at release candidate under new package names. Lit had a quiet year. Implication: "how a framework talks to coding agents" is now part of the DX story at the router level too.

**The platform** (Interop 2025 and 2026, Chrome and WebKit blogs): Interop 2025 made same-document View Transitions, CSS Anchor Positioning, the Navigation API, `@scope` and URLPattern available in all engines. Interop 2026 focuses on dialog/popover enhancements, view transitions (including cross-document with `rel="expect"` and `blocking="render"`), fetch upload streaming, JavaScript Promise Integration for WebAssembly, `contrast-color()`, and an accessibility-testing investigation. WebMCP (`document.modelContext`, previously `navigator.modelContext`) lets a page register its forms and functions as tools for in-browser agents; it is in a Chrome origin trial and in a W3C community group with Google and Microsoft. Implication: routing, scoped CSS and popups no longer need a framework; agent-facing UI is becoming a platform API.

**State of JS 2025** (published March 2026): the ecosystem has stabilised ("the average developer has used 2.6 frameworks"); Svelte 5 led developer experience, Solid satisfaction for the fifth year, Astro among meta-frameworks; Vite is about to overtake webpack in usage; TypeScript dominates; AI tooling got its own section, and the editors noted that AI assistants generate React most fluently, which reinforces adoption. Implication: a framework's fluency in AI tools is a hiring-and-velocity criterion, not a curiosity.

**Security across the ecosystem**: Shai-Hulud and "Mini Shai-Hulud" npm worms (2025–2026), the TanStack compromise, the React Server Components advisory, a Preact security patch (January 2026), Angular 22 as a security release. Implication: dependency count, lifecycle scripts, provenance and the framework's own server surface are part of the survey.

## Update, 2026-10-12

Checked a week after the review above, against the npm registry and the projects' own release posts. The sheets' version lines and the "From the 2025–26 blog" sections carry the details; this is the short list and what it changes for the survey.

- **React 19.3** (2026-09-09, missed by the review above): `<ViewTransition>` and Fragment refs are stable, `addTransitionType` tags a transition's cause, `browser()` opts a component out of server rendering, and React no longer coerces values to strings before DOM injection, so Trusted Types objects pass through. Implication: the "View Transitions are a Labs feature" caveat is gone from pattern 12, and pattern 22's Trusted Types row no longer needs a workaround.
- **Next.js 16.4** (2026-10-06): Cache Components are recommended for every app and on by default in `create-next-app` (the only model in Next 17), `ensureStatic` fails the build when a route stops being static, `navigation()` and `prefetch()` defer work past the prefetch stage, `next upgrade --agent` and `experimental.agentUpgrade`/`agentFeedback`, React 19.3, smaller Turbopack output. Implication: the caching-model measurement on pattern 3 now has a documented default to compare against; agent tooling is a shipped feature, not a roadmap item.
- **Nuxt 4.6** (2026-10-09) and Nuxt CLI v4: `nuxt/server` on web-standard APIs, a server-agnostic core with an experimental pure-Vite builder, `useSession` sealed into a cookie, Vue Vapor interop behind `vue.vapor`, Nuxt 5 defaults behind `future.compatibilityVersion: 5`; Nuxt 2 and `@nuxt/bridge` support ended. Implication: pattern 8's session now has a built-in; the "bundled dependency surface" criterion gains a knob (Nitro or Vite as the server builder).
- **SvelteKit 3.0** (start of October 2026, 3.0.1 on 2026-10-06) with `sv` 1.0: configuration moved into the Vite plugin options, `csrf.checkOrigin` became `csrf.trustedOrigins`, adapters bundle with Rolldown, `sv migrate sveltekit-3`; the OpenTelemetry integration (`tracing.server`, `src/instrumentation.server.ts`) has been documented since 2.31 and is not experimental.
- **Preact 11** (2026-09-29): Hydration 2.0, automatic ref forwarding, `Object.is` for hook arguments; `preact-iso` ships a Navigation API router entry point next to its History API default.
- **TypeScript 7.0** (2026-07-08): the native Go compiler, 8 to 12 times faster on full builds, parallel checking (`--checkers`), no programmatic API until 7.1, stricter defaults and removed options; Vue, Svelte, Astro and MDX tooling and Angular's template checks still need TypeScript 6 (`@typescript/typescript6` as an alias). Implication: whether a framework's language tooling runs on TypeScript 7 is a Tooling-criterion question in late 2026; measure build time with both.
- **Vitest 5.0** (2026-09-03): Vite 6.4+ and Node 22.12+, faster vm pools and Browser Mode, a trace view for browser tests, `clearMocks` on by default, `vitest doctor`.
- **Remix 3.0.0** (2026-10-01): one `remix` package pulling forty-odd `@remix-run/*` modules (router, routes, component with server rendering and HMR, spa, session and session storages, data-schema, data-table, form-data-parser, middleware for CSRF, CORS, sessions, static files and logging, assets, html-template) plus `@remix-run/ui` primitives; the API reference is pinned to 3.0.0 while the guides are still filling in.
- **Still at release candidate:** Vue 3.6.0-rc.11 (2026-10-10), Solid 2.0.0-rc.14 (2026-10-08), Qwik 2.0.0-rc.2 (2026-10-06), Hono 5.0.0-rc.1 (2026-10-10; its release notes did not load at review time), htmx 4.0.0 still on `next`. **New majors elsewhere:** Inferno 10 (2026-10-04: new JSX plugins required, smaller vnodes), vite-plugin-pwa 2.0 (2026-10-03). Astro is at 7.3.8 with 7.4 in beta; `security.csp` has been stable since Astro 6.
- **Datastar:** the npm package stopped at 1.0.0-beta.11 in March 2025; the project distributes a single 11.9 KiB file from its own site, so a port installs from there.

## Toolchain versions, 2026-10-12 (npm `latest`)

The layer under the frameworks moves monthly too. These are the versions a port scaffolded today gets; record them in the sheet with the framework's own.

| Area | Package | Version |
|---|---|---|
| Language | typescript | 7.0.2 (native compiler; `@typescript/typescript6` for tooling that needs the 6.0 API) |
| Bundler and dev server | vite | 8.3.4 (rolldown 1.2.13 underneath) |
| | @rsbuild/core | 2.2.12 |
| | esbuild | 0.28.2 |
| Tests | vitest | 5.0.4 |
| | playwright | 1.64.0 |
| Lint and format | oxlint | 1.87.0 |
| | @biomejs/biome | 2.5.15 |
| Monorepo | turbo | 2.11.7 |
| CSS | tailwindcss | 4.3.3 |
| Data | @tanstack/react-query | 5.104.2 |
| | @tanstack/react-router | 1.170.42 |
| | @tanstack/db | 0.13.0 (adapters for React, Vue, Solid, Svelte, Angular; `@tanstack/offline-transactions` 1.1.0) |
| | @trpc/server | 11.19.0 |
| | zustand | 5.0.15 |
| | pinia | 4.0.3 (vue-router 5.4.0) |
| Validation | zod | 4.6.6 |
| | valibot | 1.5.0 |
| Sync and local-first | @rocicorp/zero | 1.10.0 |
| | @electric-sql/client | 1.5.28 |
| | yjs | 13.6.33 (14 in beta) |
| Servers | hono | 4.13.13 (5.0.0-rc.1 on `next`) |
| | h3 | 2.0.2 (Nuxt 4 still ships Nitro 2.13.4 on h3 v1) |
| Browser plumbing | web-vitals | 6.2.3 |
| | @opentelemetry/sdk-trace-web | 2.12.0 |
| | dompurify | 3.4.17 |
| | idiomorph | 0.8.0 |
| | vite-plugin-pwa | 2.0.0 |
| The baseline's own | three | 0.186.1 |
| | marked | 18.1.1 |

## Gaps this reveals in the baseline

Status: items 1, 3 to 11 below are now patterns 14 to 23 in the project (`async/`, `keepalive/`, `rpc/`, `sync/`, `morph/`, `navigation/`, `errors/`, `observe/`, `security/`, `styling/`); item 2 is implemented as the `rpc/` pages and remains a porting variant for patterns 2 and 3; items 12 and 13 are measurements rather than pages. The original sketches follow.

1. **Async consistency and transitions** (Solid 2.0, Async Svelte, React transitions and `<Activity>`). Light: switching a tab keeps the old content until the new content is ready; no flash of skeleton on refetch. Heavy: a view composed from three sources that commits atomically, with pending state, optimistic lanes and retry from the failed source. The dynamic heavy page already keeps stale results while refetching; it does not coordinate multiple sources.
2. **Server functions instead of an API** (SvelteKit remote functions, Solid/TanStack server functions, Next and Astro actions). Not a page but a variant: port the forms and dynamic pages with the framework's server functions instead of `scripts/mock-api.js` and record what disappeared and what the network tab shows.
3. **State that survives navigation** (React `<Activity>`, Vue `<KeepAlive>`, Angular `RouteReuseStrategy`, SvelteKit snapshots and shallow routing). Light: back to the list restores scroll and search. Heavy: an inactive tab keeps its scroll, half-typed input and playing media.
4. **Sync and local-first** (TanStack DB, Electric, Zero, LiveStore, Replicache). Light: optimistic cache (exists). Heavy: an offline write queue, reconciliation on reconnect and a live query over the existing SSE stream. Needs a sync-capable endpoint in the mock API.
5. **DOM morphing and streaming HTML** (htmx 4, Turbo, Alpine morph, `Element.moveBefore`). Light: replace a fragment with server HTML while preserving focus and input. Heavy: apply a streamed HTML response progressively.
6. **Platform routing** (Navigation API, URLPattern, Speculation Rules, cross-document view transitions with render blocking). Light: speculation rules on the hub (added). Heavy: a Navigation-API router replacing the hash router.
7. **Agent-ready UI** (WebMCP, Angular 22, llms.txt, skills in `node_modules`). Light: the contact form registered as a tool where `document.modelContext` exists (added, feature-detected). Heavy: a page whose actions are all exposed as tools with schemas, plus structured data.
8. **Error boundaries and resilience** (Angular `@boundary`, React error boundaries, SvelteKit `+error`, Solid self-healing). Light: `window.onerror` and `unhandledrejection` reported to a toast. Heavy: section-level fallback with retry and reporting.
9. **Observability** (SvelteKit OpenTelemetry, Next DevTools and Performance Tracks, React Performance Tracks, INP). Light: Web Vitals printed on the page. Heavy: a trace spanning the server, the fetch and the render.
10. **Security hardening**. Light: a strict Content-Security-Policy, which breaks the baseline's inline theme script unless it gets a nonce or hash; that tension is the lesson. Heavy: Trusted Types, sanitised Markdown, CSRF on form actions.
11. **Styling strategy**. The baseline uses global CSS with tokens and no page isolates styling. Light: tokens and `light-dark()` (exists). Heavy: component-scoped styles (`@scope`, CSS Modules, framework encapsulation), container queries, cascade layers, theming.
12. **Caching model** as a measurement on pattern 3: how invalidation is expressed (`use cache`, tags, `invalidate`, route caching, CDN providers).
13. **Compile targets inside one framework** (Vue Vapor on or off, React Compiler on or off, Svelte runes vs legacy): measure the heavy state and real-time pages in both modes.

New survey criteria from this review (now in `README.md` under `docs/`): AI fluency and agent integration; supply-chain exposure; observability; governance, licensing and support windows; runtime and deployment portability; server-side throughput.
