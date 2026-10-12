# Datastar

| | |
|---|---|
| Kind | Hypermedia library with signals: `data-*` attributes on server-rendered HTML, requests through `@get()`/`@post()` actions, responses as HTML fragments or server-sent events that patch elements and signals. The htmx alternative with reactive state built in. |
| Version checked (2026-10-12) | v1.0.4, one file (`datastar.js`, 11.9 KiB) served from the project's CDN or self-hosted; the npm package `@starfederation/datastar` stopped at 1.0.0-beta.11 in March 2025, so a port imports the CDN URL or vendors the file. Server SDKs for Go, Python, PHP, .NET, Java, Kotlin, Ruby, Rust, Clojure, Zig and Node. A set of "Pro" attributes is commercially licensed. |
| Reactivity | Signals declared with `data-signals`, read in expressions (`$name`), bound with `data-bind`, `data-text`, `data-computed`, `data-attr`, `data-class`, `data-show`, `data-style`, `data-effect`; the server patches signals too (`datastar-patch-signals`). |
| Rendering | The server renders everything. A `text/html` response is morphed into the page by element id; a `text/event-stream` response carries any number of `datastar-patch-elements` and `datastar-patch-signals` events, which is how one request can update the page many times over. |
| Best at | Real-time and multiplayer pages where the server owns the state and the client is a thin, reactive view; replacing htmx plus Alpine with one file. |

## Pattern map

| # | Pattern | How you build it with Datastar |
|---|---|---|
| 1 | Static content | Not Datastar's concern: the server (or any static generator) renders the page and the layout; a page with no interaction does not even load the script. |
| 2 | Forms | Light: the native form, nothing added. Heavy: `data-bind` ties each input to a signal, `data-on:submit="@post('/api/contact')"` sends the signals as the request body, the server answers with a fragment that morphs the field errors into place and `data-indicator` holds a pending signal for the button; drafts persist with `data-persist` (Pro) or a `data-on-signal-patch` expression writing `localStorage`; a file input bound to a signal is sent base64-encoded, and upload progress is the server's to report back over SSE, since there is no XHR progress event. |
| 3 | Dynamic data and routing | Server routes and full documents are the default; an in-page "route" is `data-on:click="@get('/posts?page=2')"` with the server returning the list fragment and `data-replace-url` (Pro) or a `history.pushState()` expression keeping the URL; no client cache or prefetch beyond the browser's; the optimistic like is `data-on:click="$likes++; @post('/api/posts/1/like')"` with the server's `datastar-patch-signals` correcting the count on failure; guards and redirects live on the server. |
| 4 | Client state | `data-signals` plus `data-computed` hold the to-do list and its derived counts, `data-persist` (Pro) or a storage expression keeps it; the board is better server-owned: each drop posts to the server and the columns come back as a fragment, which the morph applies without rebuilding untouched cards. Undo and redo, cross-tab sync and keyboard shortcuts (`data-on:keydown__window`) are hand-written expressions or server state; "Add 300 cards" measures the morph. |
| 5 | 3D and imperative libraries | Unaffected: a plain module owns the canvas; `data-ref` or `data-init` hands it the element, `data-ignore-morph` keeps the morph away from the canvas subtree, and the controls write signals the module reads in `data-effect`. |
| 6 | Real-time updates | Home ground. Light: `data-on-interval` polling `@get('/api/status')` (the server returns the panel fragment). Heavy: one `@get('/api/stream')` opened from `data-init` and kept alive; the server pushes `datastar-patch-signals` for the metrics at 30 Hz and `datastar-patch-elements` for log rows; sparklines are `data-attr:d` expressions on the paths; the measurement is how the morph compares with the baseline's patch strategy at 30 Hz, and reconnection is built into the SSE plugin. |
| 7 | Media and lazy loading | Native `loading="lazy"`, `srcset` and `sizes`; `data-on-intersect="@get('/gallery?page=2')"` appends the next page; the lightbox is `<dialog>` driven by `data-on:click="el.showModal()"` and a signal for the current image; the `__viewtransition` modifier on `data-on` wraps the update in a view transition; deep links by hand. |
| 8 | Cross-cutting concerns | Theme: a signal with `data-class` on `<html>` and `data-persist` (Pro) or the inline reader from the baseline; language: the server renders the right strings and `lang`; session: a cookie the server checks, protected content rendered or omitted server-side, redirects server-side. |
| 9 | Content pipeline | Whatever renders your HTML: a static generator or server templates; Datastar adds search as `data-on:input__debounce.300ms="@get('/search')"`. |
| 10 | Data grid | Sorting, filtering and paging are server round trips returning rows, so 200,000 rows never reach the browser (no virtualisation or worker needed), `data-on-intersect` for the next page, selection in signals, keyboard navigation by hand; the measurement moves to the server. |
| 11 | Composite widgets | Light: the native elements. Heavy: signals plus `data-attr:aria-expanded`, `data-show`, `data-class` and `data-on:keydown` expressions implement tabs, menu and combobox by hand (the combobox's options come from `@get` with `__debounce`); no headless library exists, so the ARIA work is yours. |
| 12 | Motion | CSS as in the baseline; the morph keeps nodes, so transitions survive updates; `__viewtransition` on actions for layout changes; FLIP by hand; `data-animate` (Pro) tweens attributes over time. |
| 13 | Offline and installable | Nothing built in: the manifest and a service worker by hand; SSE reconnects automatically; server-owned state means little works offline, which is the honest finding for this architecture. |
| 14 | Async consistency | The server decides: one SSE event that patches several elements commits atomically, several events stream; `data-indicator` dims the old content while a request is in flight; stale responses and latest-wins are the server's to sequence (one connection, ordered events), with the fetch options' abort behaviour to check (verify). |
| 15 | State across navigation | Full-document navigation makes the light page the platform's (URL state, scroll restoration, bfcache); in-page updates keep DOM state because they morph; signals survive navigation only through `data-persist` (Pro) or storage expressions. |
| 16 | Server functions | Not a concept: every call is an endpoint, `@post('/api/rpc')` sends the signals as the arguments and the server's SDK (`ServerSentEventGenerator` with `PatchElements`/`PatchSignals`) answers; no batching, dedupe or typed client, which is the comparison with the baseline's `rpc.js`. |
| 17 | Sync and local-first | The live feed is home ground (other devices' changes arrive as element or signal patches over the one SSE connection); offline queue, versions and conflict resolution are server design plus hand-written expressions; nothing local-first is built in. |
| 18 | Morphing and streaming HTML | Home ground: every HTML response is morphed by id, `data-preserve-attr` and `data-ignore-morph` tune it, and an SSE response is applied event by event as it streams; whether the morph uses `moveBefore` for reorders is not documented (verify). |
| 19 | Platform navigation | Full documents by default, so cross-document view transitions, `rel="expect"` and speculation rules apply unchanged; there is no client router, so the heavy page's Navigation-API router is either the baseline's code or not ported. |
| 20 | Error boundaries | The server renders the fallback fragment for a failed section; request lifecycle events (`datastar-fetch` with started, finished and error details) can drive a retry expression with backoff (verify the event names); global handlers by hand as in the baseline. |
| 21 | Observability | `Server-Timing` from your server, request lifecycle events and `data-indicator` for client timing; nothing else is built in. |
| 22 | Security hardening | Expressions are compiled from attribute strings at runtime, so the CSP needs `'unsafe-eval'` for the script (check the current security guidance before porting the light page); fragments are server-escaped; CSRF through an action's `headers` option or a signal the server checks; Trusted Types: the morph writes HTML, so a default policy is needed under enforcement (verify). |
| 23 | Styling strategy | Plain CSS with `data-class` and `data-style` for state; no scoping of its own; tokens, `light-dark()`, layers, `@scope`, container queries, `@property`, subgrid and `color-mix()` pass through. |
| 24 | Agent-ready UI | Server-owned actions are endpoints already; a short `<script>` registers tools whose `execute` issues the same `@get`/`@post` the attributes issue (or a `fetch` to the endpoint); the schema lives with the server SDK. |

## Migrating the baseline

1. Keep `scripts/mock-api.js` for the JSON endpoints and add fragment and SSE endpoints next to them with the Node SDK, or port the mock API to one of the SDK languages; the pages become server templates that include the one script tag.
2. Partials stay partials (server-side includes); `src/lib/` disappears except `rows.js` on the server.
3. Port the real-time, morph and sync pages first: they are the ones Datastar was built for and where the comparison with the baseline is sharpest.

## Watch out for

- The "Pro" attributes (`data-persist`, `data-query-string`, `data-replace-url`, `data-animate`, `data-scroll-into-view`, `data-view-transition`, `data-on-resize`) are commercially licensed; the open-source core covers the baseline only with hand-written expressions for those cases. Record which pages needed Pro.
- The npm package is abandoned at a 2025 beta; pin the CDN version or vendor the file, and note the supply-chain shape (one file, no dependencies, but no registry provenance either).
- State lives on the server by design: pages that must work offline or hold large client state (the board, the grid) are measuring the architecture, not the library.
- Expressions in attributes have the same CSP cost as Alpine's; the light security page will not pass a strict policy without `'unsafe-eval'` (verify the current guidance).

## Links

- https://data-star.dev, https://data-star.dev/reference/attributes
- https://github.com/starfederation/datastar
