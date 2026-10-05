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
