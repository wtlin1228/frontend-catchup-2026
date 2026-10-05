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
