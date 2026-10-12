# React port

React 19.3 on Vite 8, React Compiler off, StrictMode on. Same mock API, same public assets and the same stylesheet as the baseline (through the `@baseline` alias), same element ids, so the baseline's checks and measurement script run against this build unchanged.

```sh
cd impl/react
pnpm install
pnpm dev        # http://localhost:5173 with the mock API
pnpm build && pnpm preview --port 4174
pnpm weight     # shipped bytes per page, to put next to the baseline's
node ../../scripts/check-dist.mjs dist                    # structure and links (sitemap lines are expected: the port is partial)
cd ../../tools/smoke
node pages.mjs http://localhost:4174 state                # page checks for the ported pattern
node flows.mjs http://localhost:4174 "state heavy"        # the board flow
node measure.mjs http://localhost:4174 state              # the board's numbers
```

## Ported so far

Patterns 1 to 4 light and pattern 4 heavy: `static/light.html`, `forms/light.html`, `dynamic/light.html`, `state/light.html`, `state/heavy.html`, plus a hub. Links to pages that are not ported lead nowhere in this build.

## Measured on 2026-10-12

Headless Chrome, Linux, Intel i7-13850HX; the baseline measured the same way on the same day. Bytes are gzip from `pnpm weight` (HTML + CSS + JS), excluding fonts and images.

| Page | Baseline | React port | Note |
|---|---|---|---|
| Static light | 6.6 kB, 0 JS | 73.3 kB, 68.2 JS | 67.4 kB of it is the react + react-dom chunk every page shares; the page's own code is under 1 kB |
| Forms light | 6.6 kB, 0 JS | 73.2 kB | the form is identical markup; it just does not exist until React runs |
| Dynamic light | 7.8 kB, 1.5 JS | 73.2 kB, 0.9 page JS | page code is smaller than the baseline's hand-written DOM code |
| State light | 8.5 kB, 1.6 JS | 73.7 kB, 1.1 page JS | |
| State heavy | 11.6 kB, 3.7 JS | 76.7 kB, 3.6 page JS | the reducer with history replaces `store.js`; the reconciler replaces `dom.js` |
| Hub | 9.6 kB, 0 JS | 72.9 kB | |
| Board: render after "Add 300 cards" (306 cards) | 16.1 ms | 14.6 ms | dispatch to committed DOM, layout forced, like the baseline |
| Board: second "Add 300" (606 cards) | 22.6 ms | 14.0 ms | keyed reconciliation reuses the 306 existing nodes; the baseline rebuilds all 606 |
| Board: filter keystroke with 606 cards | 5.3 ms | 3.0 ms | |
| Lines, static light | 30 | 40 | plus 62 for `Layout.jsx`, which replaces the baseline's 66 lines of partials |
| Lines, forms light | 33 | 43 | |
| Lines, dynamic light | 49 | 71 | the state machine and cancellation are explicit |
| Lines, state light | 75 | 74 | |
| Lines, state heavy | 273 | 225 | and `store.js` (71) and `dom.js` (54) are not needed; `toast.js` is still imported |
| Works without JavaScript | static, forms: yes | none | the built HTML has no `<h1>` and no `<main>`; `check-dist` flags every page |
| Install | 4 direct dependencies, 42 MB `node_modules` | 4 direct dependencies, 42 MB | react, react-dom, vite, @vitejs/plugin-react; no lifecycle scripts |

## What React decided for me

- Client rendering. With Vite alone every page is an empty `<div>` until 67 kB of framework has run; the light pages' reason to exist (zero JS, HTML in the response) is gone unless a meta-framework or prerendering is added. That is the first thing a React survey has to price in.
- Keyed reconciliation. The board's 606-card re-render is faster than the baseline's naive rebuild without any work on my part, and the filter keystroke too.
- StrictMode runs effects twice in development, so the fetch in the dynamic page needs its AbortController from day one.
- Controlled inputs for the to-do form and the filter, uncontrolled ones everywhere a native form does the job.

## Where I fought it

- Timing a render: there is no "render done" callback, so the number comes from a `useLayoutEffect` that forces layout and writes into a ref'd element, to avoid a second render for the stat itself.
- The edit dialog: native `<dialog>` with `defaultValue` inputs needs a `key` per card so the fields reset, and the save handler reads the DOM rather than state.
- Drag and drop: the hover class is toggled imperatively on `currentTarget`, since putting it in state would re-render the column on every `dragover`.
- Focus after a keyboard move: React moves the node with `insertBefore`, which drops focus, so the baseline's restore-by-id stays.
- The inline theme script and the `<title>` stay in each HTML file: a component runs too late for the first, and React 19's hoisted `<title>` would duplicate the second.
- Toasts still come from the baseline's `toast.js`; a React version is a context, a portal and a reducer for the same twenty lines.
