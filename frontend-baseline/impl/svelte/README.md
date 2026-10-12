# Svelte port

Svelte 5.57 (runes) on Vite 8. Same mock API, same public assets and the same stylesheet as the baseline (through the `@baseline` alias), same element ids, so the baseline's checks and measurement script run against this build unchanged. Set up exactly like `impl/react`, so the two ports compare with each other as well as with the baseline.

```sh
cd impl/svelte
pnpm install
pnpm dev        # http://localhost:5173 with the mock API
pnpm build && pnpm preview --port 4175
pnpm weight     # shipped bytes per page, to put next to the baseline's
node ../../scripts/check-dist.mjs dist                    # structure and links (sitemap lines are expected: the port is partial)
cd ../../tools/smoke
node pages.mjs http://localhost:4175 state                # page checks for the ported pattern
node flows.mjs http://localhost:4175 "state heavy"        # the board flow
node measure.mjs http://localhost:4175 state              # the board's numbers
```

## Ported so far

Patterns 1 to 4 light and pattern 4 heavy: `static/light.html`, `forms/light.html`, `dynamic/light.html`, `state/light.html`, `state/heavy.html`, plus a hub. Links to pages that are not ported lead nowhere in this build.

## Measured on 2026-10-12

Headless Chrome, Linux, Intel i7-13850HX; the baseline and the React port measured the same way on the same day. Bytes are gzip from `pnpm weight` (HTML + CSS + JS), excluding fonts and images.

| Page | Baseline | React port | Svelte port | Note |
|---|---|---|---|---|
| Static light | 6.6 kB, 0 JS | 73.3 kB | 23.3 kB, 18.2 JS | 17.2 kB is the Svelte runtime plus the layout, shared by every page |
| Forms light | 6.6 kB, 0 JS | 73.2 kB | 23.1 kB | identical form markup; it just does not exist until the component runs |
| Dynamic light | 7.8 kB, 1.5 JS | 73.2 kB | 23.3 kB, 1.1 page JS | |
| State light | 8.5 kB, 1.6 JS | 73.7 kB | 23.9 kB, 1.5 page JS | |
| State heavy | 11.6 kB, 3.7 JS | 76.7 kB | 27.1 kB, 4.2 page JS | the compiled board is slightly larger than the hand-written one; `store.js` and `dom.js` are not needed |
| Hub | 9.6 kB, 0 JS | 72.9 kB | 23.1 kB | |
| Board: render after "Add 300 cards" (306 cards) | 16.1 ms | 14.6 ms | 15.3 ms | dispatch to updated DOM, layout forced, like the baseline |
| Board: second "Add 300" (606 cards) | 22.6 ms | 14.0 ms | 11.8 ms | keyed `each` keeps the 306 existing nodes |
| Board: filter keystroke with 606 cards | 5.3 ms | 3.0 ms | 11.8 ms | the derived view removes most of 606 keyed items; worth profiling before drawing a conclusion |
| Lines, static light | 30 | 40 | 43 | plus 48 for `Layout.svelte` and 11 shared, which replace the baseline's 66 lines of partials |
| Lines, forms light | 33 | 43 | 45 | |
| Lines, dynamic light | 49 | 71 | 69 | |
| Lines, state light | 75 | 74 | 71 | |
| Lines, state heavy | 273 | 225 | 219 | `store.js` (71) and `dom.js` (54) not needed; `toast.js` still imported |
| Works without JavaScript | static, forms: yes | none | none | the built HTML has no `<h1>` and no `<main>`; `check-dist` flags every page |
| Install | 4 direct dependencies, 42 MB | 4, 42 MB | 3 direct dependencies, 43 MB | svelte, vite, @sveltejs/vite-plugin-svelte; no lifecycle scripts |

## What Svelte decided for me

- Client rendering, as with React: every page is an empty `<div>` until the runtime and the component have run; the light pages need SvelteKit's prerendering to be what they are in the baseline. The runtime is a quarter of React's, which is the difference that shows on every light page.
- Fine-grained updates from the compiler: the board's 606-card re-render beats both the baseline and React with no work on my part; the filter keystroke does not, and the keyed `each` over a derived view is the first thing to profile.
- Effects run after the DOM is updated, so timing a render is one `$effect` reading the derived list, where React needed `useLayoutEffect` and a ref.
- Deep `$state` for the to-do list (mutate in place) and `$state.raw` for the board (immutable snapshots for history): the choice is explicit and local.

## Where I fought it

- `export const` is not allowed in a runes-mode instance script, so the pattern list moved to a module.
- The edit dialog's uncontrolled fields reset through `{#key editing?.id}`, as in the React port, and the save handler reads the DOM.
- Drag-and-drop hover classes are toggled imperatively on `currentTarget`, as everywhere else.
- Focus after a keyboard move is restored by id in the effect; keyed blocks keep the element but moving it still drops focus in this Svelte version.
- The inline theme script and the `<title>` stay in each HTML file; a component runs too late for the first and `<svelte:head>` would add a second title.
- Toasts still come from the baseline's `toast.js`; a Svelte version is a module-level `$state` array and one component.
