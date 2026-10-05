# Preact

| | |
|---|---|
| Kind | 3–4 kB React-compatible UI library. Meta-framework: Fresh (Deno). |
| Version checked (2026-10-05) | preact 11.0.0 (new major in 2026); @preact/signals 2.11.3 |
| Reactivity | Virtual DOM like React; optional fine-grained updates with `@preact/signals` (signals bound in JSX skip the component re-render). |
| Rendering | Client; SSR with `preact-render-to-string`; islands via Fresh or Astro. |
| Best at | React's API at a fraction of the size; sprinkles and islands. |

## Pattern map

| # | Pattern | How you build it in Preact |
|---|---|---|
| 1 | Static content | Islands or prerendering (`@preact/preset-vite` has a prerender option); Fresh and Astro give static output by default. |
| 2 | Forms | Native inputs; React Hook Form via `preact/compat`; keep the plain form working yourself. |
| 3 | Dynamic | `preact-iso` (router + lazy + prerender helpers), or React Router via compat; TanStack Query works through compat. |
| 4 | Client state | `@preact/signals` (`signal`, `computed`, `effect`, deep signals via `@preact/signals-core` helpers) or Zustand via compat; undo via snapshots. |
| 5 | 3D | `useRef` + `useEffect`; react-three-fiber works via compat with caveats; dynamic `import()` for the chunk. |
| 6 | Real-time | Signals updated from the EventSource handler bind straight to text nodes and SVG attributes: close to the baseline's patch strategy. |
| 7 | Media | Plain `<img>`; native dialog; `createPortal` from `preact/compat`. |
| 8 | Cross-cutting | Context, or a module of signals; `preact-i18n` or i18next. |
| 9 | Content | Fresh or Astro for collections; MDX via Vite. |
| 10 | Data grid | TanStack Table/Virtual via compat; workers via Vite. |
| 11 | Composite widgets | React Aria / Radix via compat (test each), or hand-written as in the baseline. |
| 12 | Motion | Motion via compat; FLIP by hand. |
| 13 | Offline | `vite-plugin-pwa`. |

## Migrating the baseline

1. `npm create preact@latest` or Vite's preact template; alias `react` to `preact/compat` only if you pull in React libraries.
2. Same shape as the React port; replace `useState` with signals where the heavy pages need fine-grained updates.

## From the 2025–26 blog

Preact 11: Hydration 2.0, `Object.is` dependency checks, components may return nothing or fragments; `preact-iso` replaces `preact-router`; Vite replaces `preact-cli`; a security patch in January 2026.

## Watch out for

- Preact 11 is a fresh major: check the changelog for removed APIs before trusting compat with older libraries.
- Compat gaps: no Server Components, some React 19 APIs; every React library is "probably works, test it".
- Hooks come from `preact/hooks`, not `preact`.
- Fresh is Deno-only; for Node, Astro is the usual islands host.

## Links

- https://preactjs.com, https://preactjs.com/guide/v10/signals
- https://fresh.deno.dev
