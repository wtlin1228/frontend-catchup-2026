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
