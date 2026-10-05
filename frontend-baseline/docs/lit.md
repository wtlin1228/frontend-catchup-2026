# Lit

| | |
|---|---|
| Kind | Library for building web components (custom elements + shadow DOM) with reactive properties and tagged-template rendering. |
| Version checked (2026-10-05) | lit 3.3.3; @lit-labs/ssr 4.1.0 |
| Reactivity | Reactive properties trigger an efficient re-render of the element's template (templates are static, only values update); `@lit-labs/signals` adds signals. |
| Rendering | Client; SSR via `@lit-labs/ssr` (labs status); works inside any framework or none. |
| Best at | Design systems and components shared across frameworks; interop. |

## Pattern map

| # | Pattern | How you build it in Lit |
|---|---|---|
| 1 | Static content | Plain HTML with Lit elements for the interactive bits; SSR of elements with `@lit-labs/ssr` and declarative shadow DOM. |
| 2 | Forms | Form-associated custom elements via `ElementInternals` so inputs inside shadow DOM participate in the native form; or light-DOM rendering (`createRenderRoot() { return this }`). |
| 3 | Dynamic | `@lit-labs/router` or any router; `@lit/task` for async state (pending/complete/error) and cancellation. |
| 4 | Client state | A plain store (as in the baseline) or `@lit-labs/signals`; `repeat()` directive for keyed lists; `@lit/context` to share. |
| 5 | 3D | `firstUpdated()` builds the scene, `disconnectedCallback()` disposes; the baseline's lifecycle maps one to one. |
| 6 | Real-time | `connectedCallback` subscribes, `disconnectedCallback` closes; property updates re-render only changed bindings. |
| 7 | Media | Native `<img>`/`<dialog>`; `<slot>` for composition. |
| 8 | Cross-cutting | `@lit/context` providers; theme via CSS custom properties crossing shadow boundaries. |
| 9 | Content | Any static generator (Eleventy pairs well: `eleventy-plugin-lit`). |
| 10 | Data grid | `@lit-labs/virtualizer` (virtual scrolling); workers via Vite. |
| 11 | Composite widgets | Shoelace / Web Awesome, Lion, Material Web; ARIA by hand inside shadow roots needs care with `aria-activedescendant` across boundaries. |
| 12 | Motion | `@lit-labs/motion` (`animate()` directive does FLIP); WAAPI. |
| 13 | Offline | `vite-plugin-pwa`. |
| 14 | Async consistency | `@lit/task`: each `run()` gets an `AbortSignal` and stale completions are dropped; `task.render({pending, complete, error})` draws the state, keeping the old content dimmed is by hand (hold the last complete value). Heavy: one Task per source, a parent Task awaiting all three for the atomic commit, `run()` again for per-source retry; optimistic lane and rollback live in the store. No transitions or Suspense. |
| 15 | State across navigation | Nothing built in; `@lit-labs/router` restores neither scroll nor filter: write them to `history.state` as the baseline does. Heavy: hold the three panels in a Map and toggle `hidden`/`inert`, calling each panel's pause/resume; detached elements keep their properties, so a reactive controller's `hostDisconnected`/`hostConnected` can do the pausing instead; keep `disconnectedCallback` from tearing down what should survive. |
| 16 | Server functions | Nothing built in (`@lit-labs/ssr` renders, it has no actions): keep `src/lib/rpc.js` and `/api/rpc`, or tRPC/oRPC with their plain fetch clients; wrap each call in `@lit/task` for pending/error and feed the SSE `live` values into a reactive property or an `@lit-labs/signals` signal. |
| 17 | Sync and local-first | Nothing built in: keep `src/lib/sync.js`, or a framework-agnostic client (Replicache, Yjs, PowerSync, TanStack DB's core package, which has no Lit adapter) subscribed from a reactive controller that calls `host.requestUpdate()`; outbox, versions and conflicts render from the client's snapshot with `repeat()` (verify). |
| 18 | Morphing and streaming HTML | Lit's own re-render keeps node identity (static templates, only bindings change), but server HTML is a string to it: `unsafeHTML` replaces the fragment and loses focus, so keep `src/lib/morph.js` or idiomorph and morph into a light-DOM element. Streaming: `@lit-labs/ssr` streams Lit templates from the server; applying a chunked fragment progressively is by hand (`body.getReader()` into the morph), as in the baseline. |
| 19 | Platform navigation | Light: unchanged, no Lit. Heavy: `@lit-labs/router` matches with `URLPattern` but drives navigation from click interception and `popstate`, not the Navigation API; keep the baseline's `navigation-heavy.js` router as a reactive controller that renders the matched view with `render()`, `document.startViewTransition` around the update. |
| 20 | Error boundaries | No error boundary: a throw in `render()` escapes the element's update and reaches the global handlers, so keep rendering pure and put risky work in `@lit/task`. Light: `window` `error`/`unhandledrejection` with `sendBeacon`, unchanged. Heavy: one element per section, its Task's `error` renderer is the fallback with a retry button and a backoff timer; fingerprinting as in the baseline. |
| 21 | Observability | Nothing framework-level (no profiler tracks, no tracing): `PerformanceObserver` or `web-vitals` for the light page. Heavy: `performance.mark` around the fetch and `await el.updateComplete` to end the render span; `Server-Timing` from the response headers and `PerformanceResourceTiming.serverTiming`; the OpenTelemetry web SDK if real spans are wanted. |
| 22 | Security hardening | Runs under a strict CSP (no `eval`, no inline handlers; the baseline's hashed theme script is unaffected). Bindings are text by default; untrusted HTML enters only through `unsafeHTML`, after DOMPurify. Trusted Types: lit-html creates its own policy named `lit-html`, so list it in `trusted-types` next to the baseline's. CSRF double-submit against `/api/csrf` is by hand, as today. |
| 23 | Styling strategy | Light: unchanged; tokens and `light-dark()` are custom properties and inherit into shadow roots, `@layer` order does not (each shadow tree has its own layers). Heavy: `static styles` with the `css` tag is the scoping (shadow DOM, constructable stylesheets); `:host`, `::slotted()` at the slot boundary, `part`/`::part()` for theming from outside; container queries and `:has()` work inside shadow roots; `@scope` is redundant there and still useful for light-DOM elements. |

## Migrating the baseline

1. Vite + Lit template; keep `mockApi()` and the partials plugin (Lit does not do layouts).
2. Each page's JS becomes one or more elements (`<baseline-board>`, `<baseline-dashboard>`); the HTML pages stay.
3. `elements.js` already is a custom element: start there.

## Watch out for

- Shadow DOM: styles do not leak in or out (good for design systems, extra work for a page), `document.querySelector` cannot see inside, forms need `ElementInternals`, IDs for ARIA relationships cannot cross roots.
- SSR and hydration remain labs packages; measure the static page with and without them.
- No router, data layer or store of its own; the port will keep more of `src/lib` than other candidates.

## Links

- https://lit.dev
- https://shoelace.style, https://lion-web.netlify.app
