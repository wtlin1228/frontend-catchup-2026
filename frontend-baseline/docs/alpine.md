# Alpine.js

| | |
|---|---|
| Kind | Small library for behaviour declared in HTML attributes; no build step. |
| Version checked (2026-10-05) | alpinejs 3.17.4 |
| Reactivity | Proxy-based (`x-data`, `x-model`, `x-effect`, `Alpine.store`); re-evaluates bound expressions. |
| Rendering | None of its own: the server (or static files) renders HTML, Alpine adds behaviour. |
| Best at | Sprinkles on server-rendered pages; pairs with htmx, Laravel Livewire, Rails. |

## Pattern map

| # | Pattern | How you build it with Alpine |
|---|---|---|
| 1 | Static content | Unchanged: plain HTML. |
| 2 | Forms | `x-data` for pending state and inline errors; the form still posts natively; `fetch` in `x-on:submit.prevent` for the enhanced path. |
| 3 | Dynamic | `x-init` fetches, `x-for` renders; no router (hash routing by hand or pinecone-router); caching by hand. |
| 4 | Client state | `Alpine.store` with the persist plugin; undo by hand; the board is feasible but the 300-card stress test will show Alpine's limits. |
| 5 | 3D | `x-init` builds the scene; cleanup via `x-destroy` is not built in (listen to `pagehide`). |
| 6 | Real-time | `x-init` opens the EventSource and writes to store properties; `x-text` bindings update; 30 Hz with the rebuild strategy is where it strains. |
| 7 | Media | `x-intersect` plugin for infinite scroll; native dialog with `x-ref`. |
| 8 | Cross-cutting | `Alpine.store` + persist for theme and language; auth state from the server. |
| 9 | Content | Any static generator; Alpine runs on the output. |
| 10 | Data grid | Light page fine; heavy page not Alpine's job (use a vanilla virtual list, as in the baseline). |
| 11 | Composite widgets | Alpine UI components (paid), the `focus` and `anchor` plugins, `x-id`; or native popover/dialog. |
| 12 | Motion | `x-transition` and `x-show` with enter/leave classes; the sort plugin for drag ordering; FLIP by hand. |
| 13 | Offline | Independent of Alpine. |
| 14 | Async consistency | Light: tabs are `x-show` panels; the click handler fetches into `x-data` and the old content stays because data is replaced only when the response lands, dimmed with `:class="{ busy: pending }"`; latest-wins is a request counter or an `AbortController` kept in `x-data`. Heavy: nothing built in for atomic commits, per-source retry or optimistic lanes; an `Alpine.data()` component holding versions and per-source state, the same code as the baseline's `async-heavy.js`, or compose the view on the server and swap it with htmx. |
| 15 | State across navigation | Light: no router; scroll and filter go into `history.state` by hand, `$persist` for the filter. Heavy: `x-show` panels keep DOM, `x-model` values and element state (`x-if` destroys them); bind `:inert="!open"` and pause the animation from a `$watch`; destroy mode is `x-if`; `Alpine.data` `init()`/`destroy()` supply the creation counters. |
| 16 | Server functions | Nothing built in and no server of its own: keep `src/lib/rpc.js` called from `Alpine.data` methods, or server-rendered HTML through Alpine AJAX (`x-target`) or htmx. Heavy: batching, dedupe and the SSE `live` subscription stay in the baseline module behind an `Alpine.store`; validation errors come back as data and render with `x-text`. |
| 17 | Sync and local-first | Nothing built in: keep `src/lib/sync.js` and mirror its notes into an `Alpine.store`, or a framework-agnostic client (Replicache, Yjs, PowerSync); the `persist` plugin covers the local copy only, not the outbox or versions. `x-for` renders the list, `x-on:online.window` triggers the replay, conflicts render from the store. |
| 18 | Morphing and streaming HTML | Light: the server renders the fragment; `@alpinejs/morph` (`Alpine.morph(el, html)`) applies it keeping focus, typed text and Alpine state, versus `x-html`, which replaces; keyed lists need a `key` attribute. Heavy: stream by hand (`body.getReader()`) and morph each chunk; `moveBefore` is independent of Alpine. Pairing with htmx moves all of this into attributes. |
| 19 | Platform navigation | Light: unchanged, no script. Heavy: no router; keep the baseline's Navigation-API router and let the views contain `x-data` (Alpine initialises nodes added later through its mutation observer), `document.startViewTransition` around the swap; pinecone-router is the community alternative. |
| 20 | Error boundaries | Light: `window` `error`/`unhandledrejection` handlers with `sendBeacon`, unchanged. Heavy: no boundaries; each section is an `Alpine.data` component whose methods wrap `fetch` in try/catch and set an `error` flag that `x-if` turns into a fallback with a retry button, backoff by hand; or the server renders the fallback. Alpine reports expression errors to the console and rethrows them asynchronously, so they reach the global handler too (verify). |
| 21 | Observability | Nothing built in: `PerformanceObserver` or `web-vitals` as in the baseline; the Alpine devtools extension inspects component state, there are no performance marks. Heavy: `performance.mark` around the fetch in an `Alpine.data` method and `$nextTick` to end the render span; `Server-Timing` from the response headers and `PerformanceResourceTiming.serverTiming`. |
| 22 | Security hardening | Alpine evaluates `x-` expressions with `new Function`, so a strict CSP needs `unsafe-eval` or the CSP build (`@alpinejs/csp`: expressions reduced to names on `x-data`); the baseline's hashed inline scripts are unaffected. `x-html` is unsanitised and, under Trusted Types, throws unless a default policy exists: sanitise with DOMPurify and assign through a named policy on `$el`. CSRF double-submit: send the cookie token in a header from the `fetch` in `x-on:submit.prevent`. |
| 23 | Styling strategy | Light: unchanged. Heavy: no styling layer; `@scope`, cascade layers and tokens stay as in the baseline, Alpine adds `:class`/`:style` bindings for state-driven styles, `x-cloak` for pre-init markup and `x-transition` classes; the resizable box and direction switch are CSS only. Tailwind is the usual pairing. |

## Migrating the baseline

1. Add `<script defer src="alpine">` to the partials; no bundler needed, though Vite still works.
2. Replace the light pages' JS with `x-data` attributes; keep the heavy pages' vanilla modules where Alpine does not fit, and say so in the sheet: that is the finding.

## Watch out for

- Logic in attributes scales badly; extract components with `Alpine.data()` early.
- CSP: `x-data` expressions are evaluated at runtime (use the CSP build if needed).
- No SSR, routing or data layer; it is deliberately not a framework.

## Links

- https://alpinejs.dev
