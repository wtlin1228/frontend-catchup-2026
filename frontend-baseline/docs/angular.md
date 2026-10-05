# Angular

| | |
|---|---|
| Kind | Full framework: components, DI, router, HTTP client, forms, SSR, CLI, testing. Community meta-framework: Analog. |
| Version checked (2026-10-05) | @angular/core 22.2.1 (two majors per year) |
| Reactivity | Signals (`signal`, `computed`, `effect`, `input`, `output`, `model`, `linkedSignal`, `resource`, `httpResource`); zoneless change detection; RxJS still present in HttpClient and the router. |
| Rendering | Client; SSR with hydration and incremental hydration via `@angular/ssr`; `@defer` blocks for lazy parts. |
| Best at | Large teams, conventions, long support windows, everything in one box. |

## Pattern map

| # | Pattern | How you build it in Angular |
|---|---|---|
| 1 | Static content | Standalone components and router layouts; prerender routes with `@angular/ssr`. |
| 2 | Forms | Reactive forms (typed) or the newer Signal Forms (check whether still experimental in your version); validators map cleanly to the baseline's rules; HttpClient with `reportProgress` for uploads. |
| 3 | Dynamic | Router with lazy routes, resolvers and guards; `resource`/`httpResource` or TanStack Query (Angular adapter); `@defer (on viewport)`. |
| 4 | Client state | Signals in a service (`providedIn: 'root'`), or NgRx SignalStore; undo via a history of snapshots; `@for (card of cards; track card.id)`. |
| 5 | 3D | `viewChild` + `afterNextRender` and `DestroyRef`, or angular-three; `@defer` loads the chunk. |
| 6 | Real-time | RxJS `fromEvent`/`Observable` over EventSource with `takeUntilDestroyed`, or a signal updated in `NgZone.runOutsideAngular`; zoneless makes the 30 Hz case much cheaper. |
| 7 | Media | `NgOptimizedImage` (`ngSrc`, priority, srcset generation); CDK Overlay or native dialog. |
| 8 | Cross-cutting | DI services for theme, i18n and session; route guards; HTTP interceptors; `@angular/localize` (build-time) or Transloco (runtime). |
| 9 | Content | Analog (file routes, Markdown content with front matter) or `ngx-markdown`. |
| 10 | Data grid | CDK `cdk-virtual-scroll-viewport`, CDK `Table`, Angular Material table; workers via `ng generate web-worker`. |
| 11 | Composite widgets | Angular CDK primitives (a11y, overlay, menu, listbox, combobox, dialog) and Angular Material; Spartan (headless). |
| 12 | Motion | `@angular/animations` (triggers, `query`, `stagger`); CSS-first animations via `animate.enter`/`animate.leave` in recent versions; View Transitions via `withViewTransitions()`. |
| 13 | Offline | `@angular/service-worker` (`ng add @angular/pwa`) with a declarative `ngsw-config.json`. |
| 14 | Async consistency | Light: `resource({ params, loader })` hands the loader an `abortSignal` and cancels the superseded request, so the latest wins; it drops `value()` while a new request loads, so hold the last good value in a `linkedSignal` and dim on `isLoading()`; `httpResource` does the same over HttpClient. Heavy: three resources, the dependent one reading the first in its `params`; a `computed` that stays undefined until all three have values is the atomic commit, rendering each resource on its own is streaming; `reload()` per source for retry; the optimistic lane is a `linkedSignal` written first and reset from the server value; no transition primitive like React's. |
| 15 | State across navigation | Light: `provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }))` restores scroll on back; the filter lives in `queryParamMap`, written with `router.navigate([], { queryParams, queryParamsHandling: 'merge', replaceUrl: true })`. Heavy: a custom `RouteReuseStrategy` (`shouldDetach`, `store`, `shouldAttach`, `retrieve`) keeps detached route components alive; inside one page the three tabs stay rendered with `[hidden]` and `inert` bound to the active tab and an `effect` that pauses the loop; `@if` is the destroy mode. |
| 16 | Server functions | Nothing in Angular itself: HttpClient against the mock API, or Analog's Nitro routes under `src/server/routes/api` with `@analogjs/trpc` for typed calls (verify). Keep the baseline's `rpc.js` batching and dedupe behind an injectable service, or expose each call as a `resource`; `httpResource` shares nothing between callers, so one service owns the calls; the live value is an `EventSource` written into a signal, closed through `DestroyRef`. |
| 17 | Sync and local-first | Nothing built in. `src/lib/sync.js` becomes an injectable service with signal fields and `fromEvent(window, 'online')` for replay; outbox in IndexedDB via Dexie (`liveQuery` fits signals through `toSignal`); TanStack DB has no Angular adapter, so Yjs or Automerge bound to signals for the heavy page (verify). |
| 18 | Morphing and streaming HTML | Nothing built in; `[innerHTML]` goes through `DomSanitizer` and replaces the subtree, losing focus. Light: a `viewChild` element Angular never touches, morphed in `afterNextRender` with `src/lib/morph.js` or idiomorph. Heavy: HttpClient with `responseType: 'text'`, `observe: 'events'` and `reportProgress: true` delivers `partialText` as chunks land (or a `fetch` reader), morphed per chunk; `moveBefore` is a direct DOM call; `@for` with `track` reorders nodes for you, but not with `moveBefore` (verify). |
| 19 | Platform navigation | Light: a prerendered route (`RenderMode.Prerender` in `app.routes.server.ts`) with `rel="expect"` and speculation rules in `index.html` and `@view-transition` in `styles.css`; measure what the CLI still ships for a page with no logic. Heavy: the Router is History API based; `withViewTransitions()` wraps each navigation in `document.startViewTransition`, `withInMemoryScrolling` handles scroll, focus by hand; `/navigation/app/*` is a `**` child route; a Navigation API + URLPattern router stays the baseline's code. |
| 20 | Error boundaries | Light: `provideBrowserGlobalErrorListeners()` routes `window` errors and unhandled rejections into `ErrorHandler`, where fingerprinting and the beacon live. Heavy: the `@boundary` template block (preview in v22) gives a fallback per section; without it, a boundary is a component whose `resource` exposes `error()` and `reload()`; backoff retry by scheduling `reload()`; `resource.error()` and `ErrorHandler` are the two places errors surface. |
| 21 | Observability | Light: `web-vitals` or the baseline's observers; Angular DevTools profiles change detection, no Performance Tracks equivalent. Heavy: `@opentelemetry/sdk-trace-web` with XHR instrumentation (HttpClient uses XHR unless `withFetch()`), `PerformanceResourceTiming.serverTiming` for the mock API's Server-Timing, `afterNextRender` to close the render span; `@angular/ssr` has no tracing built in (verify). |
| 22 | Security hardening | Templates auto-sanitise `[innerHTML]`, `[href]` and `[style]` (`bypassSecurityTrust*` is the audited escape hatch); Trusted Types is supported with the policy names `angular`, `angular#unsafe-bypass` and `angular#bundler` in the CSP; `ngCspNonce` on the root element passes a nonce to the styles and scripts Angular injects, and the CLI's `autoCsp` option emits hashes (experimental, verify); CSRF double-submit is built into HttpClient: `withXsrfConfiguration({ cookieName: 'csrf', headerName: 'x-csrf-token' })` matches the mock API. |
| 23 | Styling strategy | View encapsulation per component (emulated attribute scoping by default, `ShadowDom` or `None` per component), `:host` and `host` metadata; projected `<ng-content>` keeps the parent's scope, which is the baseline's slot boundary; global tokens, `light-dark()` and layers in `styles.css`; Tailwind through PostCSS; `@scope`, container queries, `@property`, subgrid and `color-mix()` pass through; Material's M3 theming is CSS variables (`mat.theme`). |

## Migrating the baseline

1. `ng new app --ssr`; run the mock API as a separate process (`node` + the plugin in a tiny Vite server) or proxy with `proxy.conf.json`; the Angular CLI builder is Vite-based but takes its own config.
2. Partials become layout components; each page a lazy route with `loadComponent`.
3. `store.js` → a service with signals; `router.js` → Angular Router; `api.js` → HttpClient + `resource`; `toast.js` → a service + CDK Overlay or MatSnackBar.
4. Templates replace `h()`; keep `rows.js` and the worker.

## From the 2025–26 blog

v22 (June 2026): Signal Forms and Angular Aria stable, `@Service` and `injectAsync`, OnPush default, `@boundary` error boundaries (preview), per-route cleanup, official agent skills and experimental WebMCP support; one major per year from 22.1. Use `@boundary` for the error-resilience candidate and Aria for pattern 11.

## Watch out for

- The DI, decorator and CLI mental model: the floor is higher than any other candidate; measure it.
- Two majors a year; `ng update` is good, but record the version precisely.
- `effect()` is not for propagating state into other signals; use `computed`/`linkedSignal`.
- RxJS and signals coexist; decide a rule for which one owns streams (the dashboard page) before porting.
- Bundle size on the light pages: check what the CLI ships for a page with no logic.

## Links

- https://angular.dev
- https://analogjs.org, https://material.angular.dev
