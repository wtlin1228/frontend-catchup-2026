# htmx

| | |
|---|---|
| Kind | Hypermedia library: HTML attributes issue requests and swap HTML fragments returned by the server. |
| Version checked (2026-10-05) | htmx.org 2.0.11; 4.0.0 on the `next` tag (a rewrite; check status before adopting) |
| Reactivity | None in the browser: state lives on the server, the server renders HTML. |
| Rendering | Server-rendered, always. |
| Best at | CRUD apps and content sites with a server you already have; tiny client footprint. |

## Pattern map

| # | Pattern | How you build it with htmx |
|---|---|---|
| 1 | Static content | Unchanged; `hx-boost` turns links into fetch-and-swap navigations. |
| 2 | Forms | `hx-post` with `hx-target` swapping the server-rendered result (errors included); `hx-indicator` for pending; progress via the `htmx:xhr:progress` event. The no-JS path is the same request. |
| 3 | Dynamic | Search with `hx-trigger="input changed delay:250ms"`; pagination as links; `hx-push-url` for URL state; the server renders every fragment: there is no client cache or router. |
| 4 | Client state | Not htmx's job; pair with Alpine or vanilla for the board, or keep state on the server with a request per move. |
| 5 | 3D | Vanilla JS inside a fragment; initialise on `htmx:afterSettle`, dispose on `htmx:beforeSwap`. |
| 6 | Real-time | SSE extension (`hx-ext="sse"`, `sse-swap`) swaps server-rendered fragments per event; at 30 Hz the server renders HTML 30 times a second. |
| 7 | Media | `hx-trigger="revealed"` for infinite scroll; native dialog or a swapped dialog fragment. |
| 8 | Cross-cutting | Sessions and redirects on the server; theme via a cookie read by the server, or the inline script. |
| 9 | Content | Server-side or static; unaffected. |
| 10 | Data grid | Server-side sort/filter/paginate; virtualisation is not available: the heavy page is the counterexample. |
| 11 | Composite widgets | Native elements plus small JS; the heavy page is written by hand regardless. |
| 12 | Motion | `hx-swap` with `settle` timing and CSS transitions; View Transitions via `hx-swap="... transition:true"`. |
| 13 | Offline | Independent. |
| 14 | Async consistency | Light: the default behaviour, old content stays until the response arrives; `.htmx-request` on the trigger (or `hx-indicator`) dims it, `hx-sync="this:replace"` aborts the older request so the latest wins. Heavy: the server composes the three sources and the atomic commit is its `Promise.all`; `hx-swap-oob` updates several targets from one response; retry is a fragment with `hx-trigger="load delay:2s"` that the server renders with the delay; optimistic lanes are not hypermedia, add Alpine or JS. |
| 15 | State across navigation | Light: `hx-boost`/`hx-push-url` snapshot the page into the history cache and restore it with its scroll on back; the filter is in the URL the server renders. Heavy: the snapshot is markup, so typed values and running animations do not survive it; `hx-preserve` keeps an element (video, canvas) across swaps by id; tabs are three server-rendered panels toggled `hidden`/`inert` by a few lines of JS or Alpine; destroy mode is a swap per tab. |
| 16 | Server functions | The pattern dissolves: every `hx-post` is a call to a URL that returns HTML and the dispatch table is the server's router. No batching; `hx-sync` for dedupe; validation errors are the re-rendered form (`HX-Retarget`/`HX-Reswap` when the target differs); auth is a server check with `HX-Redirect`; the live subscription is the SSE extension (`sse-swap`). The JSON `/api/rpc` endpoint has no place here. |
| 17 | Sync and local-first | Not htmx's job: the server owns the data and htmx has no request queue, offline requests fail with `htmx:sendError`. Light: keep `src/lib/sync.js` beside htmx, or a service worker that queues POSTs (Workbox Background Sync). Heavy: versions, conflicts and idempotent replays live in the server; the live feed is the SSE extension swapping server-rendered rows. |
| 18 | Morphing and streaming HTML | Light: `hx-get="/api/fragment/status" hx-trigger="every 3s"` with `hx-swap="innerHTML"` loses focus; the idiomorph extension (`hx-ext="morph"`, `hx-swap="morph:innerHTML"`) keeps it. Heavy: htmx 2 swaps a complete response (XHR), no progressive application; htmx 4 builds morphing and streaming in (see the essays section); `moveBefore` is independent. |
| 19 | Platform navigation | Light: unchanged; do not `hx-boost` these links, cross-document view transitions, `rel="expect"` and speculation rules want real navigations. Heavy: htmx uses `pushState`/`popstate`, not the Navigation API; a Navigation-API router replaces `hx-boost` rather than sitting beside it (both intercept the same clicks); `hx-swap="... transition:true"` or `htmx.config.globalViewTransitions` for the per-navigation transition inside htmx. |
| 20 | Error boundaries | Light: global handlers plus `htmx:responseError`/`htmx:sendError` events, beaconed. Heavy: htmx does not swap 4xx/5xx by default (`htmx.config.responseHandling`), so each section's fallback is the server's error fragment delivered through the `response-targets` extension (`hx-target-error`); retry is a fragment with `hx-trigger="load delay:Ns"` where the server computes the backoff; fingerprinting and counting happen on the server. |
| 21 | Observability | Light: `PerformanceObserver` or `web-vitals`, independent of htmx. Heavy: `htmx:beforeRequest`, `htmx:afterRequest` and `htmx:afterSettle` bracket the request and the swap (`performance.mark` in each); `Server-Timing` from `evt.detail.xhr.getResponseHeader` in 2.x and `PerformanceResourceTiming.serverTiming`; `htmx.logAll()` for the event firehose. No tracing of its own. |
| 22 | Security hardening | Light: htmx runs without `unsafe-eval` once `htmx.config.allowEval = false` (drops `hx-on:` and `js:` prefixes); swapped inline `<script>` tags need `htmx.config.inlineScriptNonce` or `allowScriptTags = false`, the indicator stylesheet `inlineStyleNonce`. Heavy: `selfRequestsOnly` (the default) and `hx-disable` on user content; every fragment escaped on the server; CSRF is `hx-headers` with the token on `<body>`; htmx 2 has no Trusted Types support, a default policy that sanitises is the workaround (verify). |
| 23 | Styling strategy | Light: unchanged; the server's templates own the markup. Heavy: no scoping of its own, `@scope`, layers and tokens as in the baseline; htmx contributes the `htmx-request`, `htmx-added`, `htmx-settling` and `htmx-swapping` classes with `hx-swap` `settle:` timing for transitions; `htmx.config.includeIndicatorStyles` injects an inline style (see 22). Tailwind or a server-side CSS pipeline as usual. |

## Migrating the baseline

1. The mock API returns JSON; htmx needs HTML. Add a thin server (Hono, Express, Fastify) that renders fragments from the same data, or extend `scripts/mock-api.js` with HTML responses when `HX-Request` is present.
2. Light pages port almost unchanged; heavy pages become "server renders, JS handles the rest". Record how much vanilla JS survived: it will be most of the state, grid, scene and dashboard pages.

## From the 2025–26 essays

htmx 4.0.0 (28 August 2026): fetch-based, built-in morphing and streaming HTML; htmx 2 remains `latest` on npm until 2027 and is supported indefinitely. Morphing and streaming are the DOM-morphing candidate pattern; Datastar is the signals-flavoured alternative.

## Watch out for

- Swapping replaces DOM: focus, scroll and in-progress input are lost unless `hx-preserve`/`hx-select` are used carefully.
- Security: every endpoint returns HTML; escape everything server-side, and mind CSRF on `hx-post`.
- htmx 4 changes defaults and internals; do not mix 2.x documentation with 4.x.

## Links

- https://htmx.org, https://htmx.org/essays
