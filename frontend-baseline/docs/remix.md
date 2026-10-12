# Remix 3

| | |
|---|---|
| Kind | A new full-stack, zero-dependency JavaScript web framework. Not React: it has its own component model. Remix 1–2 became React Router (see react-router.md); the name was reused for this project. |
| Version checked (2026-10-12) | remix 3.0.0 (released 2026-10-01 after a long beta; expect rapid change) |
| Reactivity | Its own model; read the current docs before assuming anything from Remix 2. |
| Rendering | Server-first. |
| Best at | Teams that want a complete, opinionated stack from the React Router authors without React. |

## Pattern map

Mapped from the 3.0.0 API reference (api.remix.run) and the package list on 2026-10-12; the guides were still filling in, so rows ending in "(verify)" are claims they did not settle. Build the light pages first and replace these cells with what the port did.

| # | Pattern | How you build it in Remix 3 |
|---|---|---|
| 1 | Static content | Routes in `remix/router` render `remix/component` JSX on the server (`remix/component/server` renders to a string or a stream) or `remix/html-template` pages; layouts are components; `remix/middleware/static` and `remix/assets` serve files. Runtime-first: no build step, and a page without a client component ships no JavaScript. |
| 2 | Forms | The `form` helper in `remix/routes` defines the form route, `remix/form-data-parser` parses multipart bodies with upload handling and size limits (the 5 MB rule maps directly), `remix/data-schema` (`form-data` submodule) validates and coerces the fields; errors re-render server-side, so the page works without JavaScript; `remix/middleware/csrf` covers the token; inline validation and progress need a client component. |
| 3 | Dynamic data and routing | `remix/router` with `remix/route-pattern` (typed params, `href` creation) and controllers and actions per route; data is fetched in the handler and rendered on the server, so a loading state is a streamed `<Frame fallback>`; client-side navigation, caching and prefetching come from `remix/spa` (verify what it caches); the optimistic like is a client-component concern (verify). |
| 4 | Client state | `remix/component` is its own component model with client hydration, mixins and rendering roots; persistence, undo and cross-tab sync by hand; read the component docs before porting the board (verify). |
| 5 | 3D and imperative libraries | A client component's lifecycle hooks (verify their names) with a dynamic `import()`, or a plain `<script type="module">` on a server-rendered page, which needs nothing from the framework. |
| 6 | Real-time updates | A route returning a `Response` whose body is a `ReadableStream` of `text/event-stream` (Web Streams are the foundation); the `EventSource` lives in a client component or a plain script. |
| 7 | Media and lazy loading | Server-rendered `<img>` with `srcset`; `remix/file-storage` (memory, filesystem, S3) and `remix/lazy-file` serve uploads and byte ranges; infinite scroll and the dialog in a client component. |
| 8 | Cross-cutting concerns | `remix/session` with `remix/session-storage/*` (cookie, filesystem, Memcache, memory, Redis) behind a signed cookie, `remix/auth` providers (OAuth, OIDC, credentials) and `remix/middleware/auth`; theme and locale read from `remix/cookie` and `remix/headers` (`accept-language`) in the handler, so the inline theme script disappears. |
| 9 | Content pipeline | No content collections: a route reads Markdown through `remix/fs` and renders it with a component or `remix/html-template`; feeds and sitemaps are routes returning XML. |
| 10 | Data grid | `remix/data-table` (SQLite, Postgres, MySQL drivers, query operators, migrations) sorts and pages on the server; virtualisation is a client component or the baseline's code. |
| 11 | Composite widgets | `@remix-run/ui` primitives (accordion, anchor, combobox, listbox, menu, popover, select, tabs, toggle) are the headless layer, unstyled. |
| 12 | Motion | `@remix-run/ui` ships an animation module; CSS and the Web Animations API otherwise; view transitions are the platform's with full-document navigation. |
| 13 | Offline and installable | Nothing built in: a service worker served as a static asset, `remix/response` compression and file helpers for what it caches. |
| 14 | Async consistency | Server-first, so a navigation or post renders a fresh document and there is no client cache to tear; `<Frame src fallback>` is the unit for an async section (`fallback` shows while it is pending, `FrameHandle.reload()` refetches): one frame per source lets each fill in as it is ready, one frame around all three commits atomically. Light: whether a reloading frame keeps its old content and drops stale responses is not documented, so keep the baseline's request counter, `AbortController` and dimming in client code; optimistic rollback by hand (verify). |
| 15 | State across navigation | Full-document navigation makes the light page the platform's: the filter in the URL, `history.scrollRestoration`, bfcache on back. Heavy: nothing like `<KeepAlive>` is documented; in SPA mode (`remix/spa`) keep the three panels alive with `hidden` and `inert` and pause the animation by hand, as the baseline's `keepalive-heavy.js` does; how the component model preserves instance state across route changes is the first thing to test (verify). |
| 16 | Server functions | No `server$`-style call: the native shape is `remix/router` (a request router with typed middleware, controllers and actions) and the `remix/routes` helpers (`resource`, `resources`, `form`) receiving a `Request` and returning a `Response`, with `remix/form-data-parser` for writes and `remix/data-schema` for validation. Light: one POST route returning JSON, called with `fetch`. Heavy: keep `src/lib/rpc.js` (batching, dedup, dispatch table) over that one route; validation as a 422 response; the auth guard reads the session through `remix/session` and its middleware; the live subscription is a `Response` whose body is a `ReadableStream` of `text/event-stream`, native on every runtime. |
| 17 | Sync and local-first | Nothing built in on the client. The server half is natural: `remix/data-table` (SQLite, Postgres or MySQL drivers with migrations) holds the versioned change log, idempotent POSTs keyed by client ids from Web Crypto `randomUUID`, the change feed as a streamed response. Keep `src/lib/sync.js` (IndexedDB outbox, replay on `online`) or the framework-agnostic `@tanstack/db` core. |
| 18 | Morphing and streaming HTML | The server side is home ground: `remix/component/server` renders to strings or streams, responses are Web Streams, so the heavy page's chunked HTML is a `ReadableStream` body and `<Frame>` fills independent page regions as they arrive. Light: whether the client runtime morphs a refreshed frame (keeping focus, typed text and node identity) or replaces it is not documented, so keep `src/lib/morph.js` or idiomorph for the three-second refresh and feature-detect `Element.moveBefore` by hand (verify). |
| 19 | Platform navigation | Server-first makes the light page the default: real paths and full documents, so cross-document view transitions, `<link rel="expect" blocking="render">` and `<script type="speculationrules">` go in the layout and need no framework support. Heavy: the Navigation-API router is redundant in server mode; `remix/component` lists navigation and `remix/spa` is the client runtime, but whether client navigation runs on the History API or the Navigation API, and what it does for scroll, focus and cancellation, must be read from the 3.0 guides; until then keep `navigation-heavy.js` with the shell served for `/navigation/app/*` (verify). |
| 20 | Error boundaries | Server side: a handler throws, a wrapping middleware or `try/catch` around the route turns it into an error response (`remix/response` helpers), and `<Frame>` confines an async section's failure to that section (the heavy page's three sections as three frames, each retried with `FrameHandle.reload()`). Light: `error` and `unhandledrejection` listeners beaconing to `/api/errors` are hand-rolled as in the baseline, exponential backoff and fingerprinting likewise; a declarative boundary inside the component model is not documented (verify). |
| 21 | Observability | `remix/middleware/logger` logs requests; nothing traces. Light: the baseline's PerformanceObserver code runs unchanged as client script. Heavy: handlers are plain `Request` to `Response` functions, so one middleware times them and sets `Server-Timing` on the `Response`; OpenTelemetry comes from the runtime's SDK (Node, Bun, Deno, workers) rather than the framework; browser spans and the waterfall stay hand-rolled with `traceparent` on the fetch. |
| 22 | Security hardening | `remix/middleware/csrf` and `remix/session` (session data behind a signed cookie) are built in and `remix/html-template` escapes interpolations; Web Crypto is in the foundation, so a per-request nonce (`crypto.getRandomValues`) and the `Content-Security-Policy` header are set in a middleware and the nonce is passed to the layout's inline theme script; the open question is whether the framework's own bootstrap, SPA runtime and HMR client take a nonce, which decides between `'strict-dynamic'` and the baseline's build-time hashes (verify). Heavy: a Trusted Types policy and the allow-list sanitiser are hand-rolled as in the baseline; the CSRF middleware replaces the baseline's double-submit check. |
| 23 | Styling strategy | No styling system: `remix/assets` serves static files and script import maps, so plain CSS ships as assets and the baseline's tokens, `light-dark()`, cascade layers, `@scope`, container queries, `@property`, `:has()` and subgrid are used unchanged, with `@scope` or a naming convention as the scoping unit; `@remix-run/ui` primitives (accordion, combobox, listbox, menu, popover, select, tabs, toggle) come unstyled; CSS Modules, Tailwind or Lightning CSS mean adding the build step the runtime-first design does without. |
| 24 | Agent-ready UI | Packages ship agent skills for the coding agent; for the page, a component registers tools whose `execute` posts to the route's action and whose schema is the `remix/data-schema` definition the action validates with (verify how the client runtime runs effects). |

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
