# Solid

| | |
|---|---|
| Kind | UI library with fine-grained reactivity; JSX compiled to direct DOM updates. Meta-framework: SolidStart. |
| Version checked (2026-10-05) | solid-js 1.9.15; 2.0.0 at release candidate (new reactive core, async primitives); @solidjs/start 2.0.5 |
| Reactivity | Signals: `createSignal`, `createMemo`, `createEffect`, `createResource`, `createStore` (nested proxies). Components run once. |
| Rendering | Client with Vite; SSR, streaming and islands via SolidStart. |
| Best at | Raw update performance with a React-like syntax; small runtime. |

## Pattern map

| # | Pattern | How you build it in Solid |
|---|---|---|
| 1 | Static content | Layout components; static HTML needs SolidStart prerendering. |
| 2 | Forms | Native inputs with `onInput`; `@modular-forms/solid` or TanStack Form; SolidStart `action` + `useSubmission` for progressive enhancement. |
| 3 | Dynamic | `@solidjs/router` (data APIs: `query`, `action`, preload) or TanStack Router; `createResource` with `<Suspense>`; TanStack Query (Solid adapter). |
| 4 | Client state | `createStore` with `produce` for nested updates; undo via snapshots (`unwrap`); `<For>` is keyed by reference, `<Index>` by position. |
| 5 | 3D | `onMount` + `onCleanup` with a ref; solid-three exists but is less mature than R3F/TresJS; `lazy()` for the chunk. |
| 6 | Real-time | `createEffect` + `onCleanup` for the EventSource; a signal per metric already updates only its DOM nodes, so the patch strategy is the default. |
| 7 | Media | Plain `<img>`; `<Portal>` for overlays or native dialog; IntersectionObserver in `onMount`. |
| 8 | Cross-cutting | `createContext`; router guards via `preload`/redirects; `@solid-primitives/i18n`. |
| 9 | Content | `solid-mdx` with Vite; SolidStart file routes; collections by hand. |
| 10 | Data grid | TanStack Table + Virtual (Solid adapters); workers via Vite. |
| 11 | Composite widgets | Kobalte (headless), Ark UI; solid-ui copies Kobalte-based components. |
| 12 | Motion | `solid-transition-group`, Motion for Solid, `@solid-primitives/transition-group`; FLIP by hand as in the baseline. |
| 13 | Offline | `vite-plugin-pwa`. |

## Migrating the baseline

1. `npm create solid@latest` (SolidStart) or the Vite solid template; keep `mockApi()`.
2. Partials become layout components; pages become routes.
3. `store.js` → `createStore`; `router.js` → `@solidjs/router`; `api.js` → `createResource`/`query`; `toast.js` → a signal + `<Portal>`.

## From the 2025–26 blog

Solid 2.0 (RC, 2026) makes async native: computations return promises, `<Loading>` replaces `<Suspense>`, `action()` with optimistic lanes, projections, self-healing retry, one reactive graph across server and client. It is the reference implementation for the async-consistency candidate pattern.

## Watch out for

- Destructuring props breaks reactivity; use `splitProps`/`mergeProps` and read `props.x` inside JSX.
- `.map`, ternaries and early returns in JSX do not track; use `<For>`, `<Show>`, `<Switch>`.
- Solid 2.0 changes the async model (resources, `createAsync`, transitions); check which version the port targets and note it.
- Smaller ecosystem; expect to write more primitives yourself on the widgets and motion pages.

## Links

- https://www.solidjs.com, https://start.solidjs.com
- https://kobalte.dev
