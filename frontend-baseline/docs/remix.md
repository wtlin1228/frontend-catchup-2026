# Remix 3

| | |
|---|---|
| Kind | A new full-stack, zero-dependency JavaScript web framework. Not React: it has its own component model. Remix 1–2 became React Router (see react-router.md); the name was reused for this project. |
| Version checked (2026-10-05) | remix 3.0.0 (just released after a long beta; expect rapid change) |
| Reactivity | Its own model; read the current docs before assuming anything from Remix 2. |
| Rendering | Server-first. |
| Best at | Teams that want a complete, opinionated stack from the React Router authors without React. |

## Pattern map

Too new and too different to map responsibly here. When surveying: build the light pages first and fill in this table from the experience. Expect strong answers on patterns 1, 2, 3, 8 and 9 (server-first routing, forms, sessions, content) and uncertain answers on 4, 6, 10 and 12 (client-heavy state, high-frequency updates, grids, motion).

| # | Pattern | How you build it in Remix 3 |
|---|---|---|
| 14 | Async consistency | Server-first, so a navigation or post renders a fresh document and there is no client cache to tear; `<Frame>` is the unit for an async section: one frame per source lets each fill in as it is ready, one frame around all three commits atomically. Light: whether a frame keeps its old content while reloading, drops stale responses and exposes pending state is not documented in this sheet, so keep the baseline's request counter, `AbortController` and dimming in client code; optimistic rollback by hand (verify). |
| 15 | State across navigation | Full-document navigation makes the light page the platform's: the filter in the URL, `history.scrollRestoration`, bfcache on back. Heavy: nothing like `<KeepAlive>` is documented; in SPA mode keep the three panels alive with `hidden` and `inert` and pause the animation by hand, as the baseline's `keepalive-heavy.js` does; how the component model preserves instance state across route changes is the first thing to test (verify). |
| 16 | Server functions | No `server$`-style call is documented; the native shape is a route receiving a `Request` and returning a `Response`, with `FormData` for writes. Light: one POST route returning JSON, called with `fetch`. Heavy: keep `src/lib/rpc.js` (batching, dedup, dispatch table) over that one route; validation as a 422 response; the auth guard reads the session cookie in the handler; the live subscription is a `Response` whose body is a `ReadableStream` of `text/event-stream`, which Web Streams make native on every runtime (verify). |
| 17 | Sync and local-first | Nothing built in. The server half is natural: a versioned change log as a route on `Request` and `Response`, idempotent POST keyed by client ids from Web Crypto `randomUUID`, the change feed as a streamed response. The client half has no framework bindings to lean on: keep `src/lib/sync.js` (IndexedDB outbox, replay on `online`) or the framework-agnostic `@tanstack/db` core (verify). |
| 18 | Morphing and streaming HTML | The server side is home ground: responses are Web Streams, so the heavy page's chunked HTML is a `ReadableStream` body and `<Frame>` fills async sections of a page as they arrive. Light: whether the client runtime morphs a refreshed fragment (keeping focus, typed text and node identity) or replaces it is not documented, so keep `src/lib/morph.js` or idiomorph for the three-second refresh and feature-detect `Element.moveBefore` by hand (verify). |
| 19 | Platform navigation | Server-first makes the light page the default: real paths and full documents, so cross-document view transitions, `<link rel="expect" blocking="render">` and `<script type="speculationrules">` go in the layout and need no framework support. Heavy: the Navigation-API router is redundant in server mode; in SPA mode, whether client navigation runs on the History API or the Navigation API, and what it does for scroll, focus and cancellation, must be read from the 3.0 docs; until then keep `navigation-heavy.js` with the shell served for `/navigation/app/*` (verify). |
| 20 | Error boundaries | Server side: a handler throws, a wrapping middleware or `try/catch` around the route turns it into an error response, and `<Frame>` confines an async section's failure to that section (the heavy page's three sections as three frames, each reloaded to retry). Light: `error` and `unhandledrejection` listeners beaconing to `/api/errors` are hand-rolled as in the baseline, exponential backoff and fingerprinting likewise; a declarative boundary inside the component model is not documented (verify). |
| 21 | Observability | Nothing built in. Light: the baseline's PerformanceObserver code runs unchanged as client script. Heavy: handlers are plain `Request` to `Response` functions, so one wrapper times them and sets `Server-Timing` on the `Response`; OpenTelemetry comes from the runtime's SDK (Node, Bun, Deno, workers) rather than the framework; browser spans and the waterfall stay hand-rolled with `traceparent` on the fetch (verify). |
| 22 | Security hardening | Web Crypto is in the foundation, so a per-request nonce (`crypto.getRandomValues`) and the `Content-Security-Policy` header are set in the handler and the nonce is passed to the layout's inline theme script; the open question is whether the framework's own bootstrap, SPA runtime and HMR client take a nonce, which decides between `'strict-dynamic'` and the baseline's build-time hashes. Heavy: a Trusted Types policy, the allow-list sanitiser and double-submit CSRF (token in `FormData`, cookie compared in the handler) are hand-rolled as in the baseline; zero dependencies is the supply-chain answer (verify). |
| 23 | Styling strategy | No styling system is documented: ship plain CSS as static assets, so the baseline's tokens, `light-dark()`, cascade layers, `@scope`, container queries, `@property`, `:has()` and subgrid are used unchanged and `@scope` or a naming convention is the scoping unit; CSS Modules, Tailwind or Lightning CSS depend on how 3.0 bundles assets, and there is no Vite plugin slot to assume (verify). |

## Migrating the baseline

1. `npx remix@latest new app`; keep the mock API as a separate process.
2. Port pattern by pattern; note where the framework's component model replaces `src/lib` and where it does not reach.

## From the 2025–26 blog

Six principles including model-first development (AI) and building on web APIs (Fetch, Streams, Web Crypto) for runtime portability; zero dependencies; packages ship agent skills; `<Frame>` for async sections; full-stack HMR and SPA mode landed during beta.

## Watch out for

- Remix 2 tutorials, StackOverflow answers and libraries do not apply; "Remix" search results are ambiguous.
- Zero-dependency means a smaller ecosystem by design; check what exists for widgets, motion and 3D.
- Record the exact version: 3.0 shipped days before this sheet was written.

## Links

- https://remix.run
