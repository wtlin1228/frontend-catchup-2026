# Vue port

Vue 3.5.43 (Composition API, `<script setup>`) on Vite 8. Same mock API, same public assets and the same stylesheet as the baseline (through the `@baseline` alias), same element ids, so the baseline's checks and measurement script run against this build unchanged. Set up exactly like `impl/react` and `impl/svelte`, so the three ports compare with each other as well as with the baseline.

```sh
cd impl/vue
pnpm install
pnpm dev        # http://localhost:5173 with the mock API
pnpm build && pnpm preview --port 4176
pnpm weight     # shipped bytes per page, to put next to the baseline's
node ../../scripts/check-dist.mjs dist                    # structure and links (sitemap lines are expected: the port is partial)
cd ../../tools/smoke
node pages.mjs http://localhost:4176 state                # page checks for the ported pattern
node flows.mjs http://localhost:4176 "state heavy"        # the board flow
node measure.mjs http://localhost:4176 state              # the board's numbers
```

## Ported so far

Patterns 1 to 4 light, pattern 4 heavy and pattern 6 heavy: `static/light.html`, `forms/light.html`, `dynamic/light.html`, `state/light.html`, `state/heavy.html`, `realtime/heavy.html`, plus a hub. Links to pages that are not ported lead nowhere in this build.

## Measured on 2026-10-12

Headless Chrome, Linux, Intel i7-13850HX; the baseline and the other ports measured the same way on the same day. Bytes are gzip from `pnpm weight` (HTML + CSS + JS), excluding fonts and images.

| Page | Baseline | React | Svelte | Vue | Note |
|---|---|---|---|---|---|
| Static light | 6.6 kB, 0 JS | 73.3 kB | 23.3 kB | 32.4 kB, 27.4 JS | 26.5 kB is the Vue runtime plus the layout, shared by every page |
| Forms light | 6.6 kB, 0 JS | 73.2 kB | 23.1 kB | 32.3 kB | identical form markup; it just does not exist until the component runs |
| Dynamic light | 7.8 kB, 1.5 JS | 73.2 kB | 23.3 kB | 32.4 kB, 0.9 page JS | |
| State light | 8.5 kB, 1.6 JS | 73.7 kB | 23.9 kB | 33.0 kB, 1.3 page JS | |
| State heavy | 11.6 kB, 3.7 JS | 76.7 kB | 27.1 kB | 36.3 kB, 4.0 page JS | `store.js` and `dom.js` are not needed |
| Real-time heavy | 10.3 kB, 2.8 JS | 75.4 kB | 26.3 kB | 34.8 kB, 2.5 page JS | |
| Hub | 9.6 kB, 0 JS | 72.9 kB | 23.1 kB | 32.1 kB | |
| Board: render after "Add 300 cards" (306 cards) | 16.1 ms | 14.6 ms | 15.3 ms | 18.1 ms | dispatch to patched DOM, layout forced, like the baseline |
| Board: second "Add 300" (606 cards) | 22.6 ms | 14.0 ms | 11.8 ms | 22.6 ms | the whole board template re-renders; keys reuse the nodes but the vnode diff is paid in full |
| Board: filter keystroke with 606 cards | 5.3 ms | 3.0 ms | 11.8 ms | 22.6 ms | `inColumn()` runs three times per render over the filtered list; `v-memo` or a `Column` component with a computed per column is the first fix |
| Dashboard at 30 Hz, patch: renders per second, last render | 31, 0.6 ms | 31, 0.8 ms | 31, 0.6 ms | 31, 0.4 ms | the fastest of the four at this size |
| Dashboard at 30 Hz, rebuild: renders per second, last render | 32, 1.4 ms | 31, 1.4 ms | 31, 1.4 ms | 31, 0.6 ms | a keyed `<template>` fragment; verified to recreate the card elements every frame |
| Lines, static light | 30 | 40 | 43 | 45 | plus 49 for `Layout.vue` and 11 shared, which replace the baseline's 66 lines of partials |
| Lines, forms light | 33 | 43 | 45 | 47 | |
| Lines, dynamic light | 49 | 71 | 69 | 68 | |
| Lines, state light | 75 | 74 | 71 | 68 | |
| Lines, state heavy | 273 | 225 | 219 | 220 | `store.js` (71) and `dom.js` (54) not needed; `toast.js` still imported |
| Lines, real-time heavy | 238 | 155 | 148 | 151 | the two strategies are one keyed fragment instead of two render functions |
| Lighthouse static light: performance, accessibility, best practices, LCP | 100, 95, 92, 1.4 s | 99, 95, 92, 1.8 s | 100, 95, 92, 1.5 s | 100, 95, 92, 1.4 s | one run each, mobile throttling |
| Works without JavaScript | static, forms: yes | none | none | none | the built HTML has no `<h1>` and no `<main>`; `check-dist` flags every page |
| Install | 4 direct dependencies, 42 MB | 4, 42 MB | 3, 43 MB | 3 direct dependencies, 52 MB | vue, vite, @vitejs/plugin-vue; no lifecycle scripts |

The table above was taken on 2026-10-12 before three stylesheet fixes made the same day (image aspect ratio, accent and tag contrast, a reserved app region on the dynamic heavy page); they add about 0.1 kB of CSS to every build and lift the accessibility score to 100 everywhere. `docs/verify.md` carries the final comparison table.

## What Vue decided for me

- Client rendering, as with the other ports: every page is an empty `<div>` until the 26 kB runtime and the component have run; the light pages need Nuxt's prerendering (or `vite-ssg`) to be what they are in the baseline.
- A compiled template with a virtual DOM: the dashboard, whose per-frame work is small and well-keyed, patches faster than React, Svelte and the baseline's hand-written node patching.
- Whole-component re-render on every state change: the board's filter keystroke diffs 606 keyed items three times (once per column helper call) and costs four times Svelte's number; Vue leaves memoisation (`v-memo`, child components with their own computeds) to the author where Svelte's compiler and React's reconciler needed nothing here.
- Post-flush watchers (`{ flush: 'post' }`) run after the DOM is patched, so timing a render is one watcher, as in Svelte.
- `shallowRef` for immutable history snapshots, `ref` with a deep watcher for the to-do list: the choice is explicit and local.

## Where I fought it

- Template refs through `useTemplateRef()` (3.5) rather than matching variable names, which is easy to get subtly wrong.
- The edit dialog's uncontrolled fields reset through a keyed `<template>`, as in the other ports, and the save handler reads the DOM.
- Drag-and-drop hover classes are toggled imperatively on `currentTarget`, as everywhere else.
- Focus after a keyboard move is restored by id in the post-flush watcher; keys keep the element but moving it still drops focus.
- The inline theme script and the `<title>` stay in each HTML file; `useHead`-style helpers belong to Nuxt or a library.
- Toasts still come from the baseline's `toast.js`; a Vue version is a `reactive` array in a module and one component.
