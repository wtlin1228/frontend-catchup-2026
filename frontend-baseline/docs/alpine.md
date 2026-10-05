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

## Migrating the baseline

1. Add `<script defer src="alpine">` to the partials; no bundler needed, though Vite still works.
2. Replace the light pages' JS with `x-data` attributes; keep the heavy pages' vanilla modules where Alpine does not fit, and say so in the sheet: that is the finding.

## Watch out for

- Logic in attributes scales badly; extract components with `Alpine.data()` early.
- CSP: `x-data` expressions are evaluated at runtime (use the CSP build if needed).
- No SSR, routing or data layer; it is deliberately not a framework.

## Links

- https://alpinejs.dev
