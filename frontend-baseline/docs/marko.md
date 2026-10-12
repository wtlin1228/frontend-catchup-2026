# Marko

| | |
|---|---|
| Kind | Compiler-first UI language (HTML extended with JavaScript) with its own meta-framework, Marko Run: streaming SSR, fine-grained compiled reactivity, and bundling that ships only the sub-templates that need JavaScript. Maintained by eBay. |
| Version checked (2026-10-12) | marko 6.4.5 (the 6.x "Tags API" line is current; 6.1 on `next`); @marko/run 0.11.13 |
| Reactivity | Compiled and fine-grained: `<let>` declares state, `<const>` derived values, templates re-run only the dependent output; `<script>` blocks re-run when referenced state changes, with `$signal` for cleanup. |
| Rendering | Streaming SSR by default: HTML flushes up to each `<await>`, and `<try>` with `@placeholder` opts a section into out-of-order streaming; the client gets the JavaScript for stateful sub-templates only. |
| Best at | Content and commerce pages where first paint and shipped bytes matter and most of the page is static; the pattern-1-through-3 end of the survey. |

## Pattern map

| # | Pattern | How you build it with Marko |
|---|---|---|
| 1 | Static content | A `.marko` template is the page; layouts are tags that render `<${input.renderBody}/>`; a page without `<let>` or `<script>` ships no JavaScript at all, which is the headline measurement. In Marko Run, `src/routes/<pattern>/light/+page.marko` with a shared `+layout.marko` (file conventions beyond `+page.marko` need checking against the routing docs) (verify). |
| 2 | Forms | Light: a native `<form>` posting to the mock API. Heavy: `<let>` per field, `valueChange=` for controlled inputs, `<script>` for the Constraint Validation API and the `fetch` submit, server errors written into state; upload with `XMLHttpRequest` in a `<script>`; `<id>` for label and error ids. |
| 3 | Dynamic data and routing | Marko Run routes are server routes with full-document navigation; data loads in the route's handler and arrives as `input`; `<await|post|=getPost()>` streams the slow part behind a `@placeholder`; a client router is not part of the framework, so the heavy page's hash router stays the baseline's code inside a `<script>`, or the SPA becomes server routes and loses the client cache (record which). |
| 4 | Client state | `<let/cards=[]>` and `<const>` for derived counts, `<for|card| of=cards by="id">` for keyed rendering, `<show>` to hide without unmounting; undo and redo as a history array in state; persistence and cross-tab sync in a `<script>` with `localStorage`; drag and drop with native events on the tags. |
| 5 | 3D and imperative libraries | `<lifecycle onMount onUpdate onDestroy>` wraps three.js: build in `onMount`, mutate in `onUpdate` from state, dispose in `onDestroy`; `import()` inside `onMount` keeps the chunk lazy; the canvas is reached through a tag variable (`<canvas/canvas>`). |
| 6 | Real-time updates | `<script>` opens the `EventSource` and writes into `<let>` state, `$signal` closes it on teardown; per-frame coalescing by hand or by trusting the compiled updates (measure: Marko's fine-grained output is the "patch" strategy for free); keyed rows with `by=`. |
| 7 | Media and lazy loading | Native image attributes in the template; `<script>` for the IntersectionObserver and the `<dialog>`; `gallery.json` imported at build time as in the baseline. |
| 8 | Cross-cutting concerns | Theme and language are server-rendered from cookies in the Marko Run handler (inline reader unnecessary when the server sets `data-theme`); session from a cookie in the handler; `$global` carries request data into every template. |
| 9 | Content pipeline | A build script as in the baseline, or Marko Run routes that read Markdown in their handlers and render it through a tag; `<await>` streams a slow article body. |
| 10 | Data grid | The baseline's virtual window inside a `<script>` with state in `<let>`, or server-side paging with streaming rows; the worker is Vite's. |
| 11 | Composite widgets | Hand-written against the ARIA patterns with `<id>` for the ids and state in `<let>`; no headless library in the ecosystem, which is a finding. |
| 12 | Motion | CSS; FLIP in a `<script>` that runs on list changes; `document.startViewTransition` around a state write. |
| 13 | Offline and installable | `vite-plugin-pwa` through the Vite plugin; nothing of its own. |
| 14 | Async consistency | `<await>` inside `<try>` with `@placeholder` and `@catch` is the server-side answer (one `<try>` around three awaits commits together, three separate ones stream); on the client, state writes are synchronous and fine-grained, so stale-response dropping and latest-wins are the baseline's counter in a `<script>`. |
| 15 | State across navigation | Full-document navigation: the platform restores scroll and the URL carries the filter; `<show>` keeps hidden tabs mounted with their state, which is the keep-alive mode; `<if>` is the destroy mode. |
| 16 | Server functions | Nothing like `server$`; Marko Run route handlers are the API and `fetch` the client, so keep `rpc.js` for batching and dedupe over one handler. |
| 17 | Sync and local-first | Nothing built in; `src/lib/sync.js` in a `<script>` writing into state. |
| 18 | Morphing and streaming HTML | Streaming is home ground (`<await>`, out-of-order placeholders); morphing a server fragment into live state is not Marko's model (it would re-render from state), so keep `morph.js` or idiomorph in a `<script>` for the light page. |
| 19 | Platform navigation | Full documents by default: cross-document view transitions, `rel="expect"` and speculation rules in the layout; no client router, so the Navigation-API router is the baseline's code or not ported. |
| 20 | Error boundaries | `<try>` with `@catch|err|` is a declarative boundary around a section (server and client), `@placeholder` its pending state; retry by re-running the awaited call from state; reporting and backoff by hand. |
| 21 | Observability | Nothing built in; `Server-Timing` from the Marko Run handler; the fine-grained bundling report is the thing to record. |
| 22 | Security hardening | Templates escape by default and `<html-script>`/`<html-style>` are the only raw sinks; compiled output needs no `eval`; CSP nonces on Marko's own scripts need checking in the SSR output (verify); Trusted Types: no DOM-string sinks in normal templates, so enforcement should hold (verify). |
| 23 | Styling strategy | `<style>` per component with CSS Modules when given a tag variable (`<style/styles>`), `.scss` and `.less` supported; global tokens imported once; platform features pass through. |

## Migrating the baseline

1. `npm init marko` with the Marko Run template; keep `mockApi()` in the Vite config (Marko Run uses `@marko/vite`) or port the endpoints to route handlers.
2. Partials become tags; each page a route; the inline theme script disappears if the handler reads the cookie.
3. `dom.js` and `store.js` disappear into templates and `<let>`; `router.js` has no equivalent, so decide server routes or a hand-written client router before porting pattern 3.

## Watch out for

- The 6.x Tags API is a different language from Marko 5's class components; make sure examples and libraries you find are 6.x.
- Small ecosystem: widgets, motion and data libraries are hand-rolled or framework-agnostic; count the lines.
- Marko Run is pre-1.0 (0.11); its file conventions and adapters move, so pin the version in the sheet.
- The comparison that matters is pattern 1 and 3 bytes and first paint: Marko's reason to exist is streaming and sub-template bundling, and the heavy client-state pages will not show it off.

## Links

- https://markojs.com, https://markojs.com/docs/reference/core-tag
- https://github.com/marko-js/marko, https://github.com/marko-js/run
