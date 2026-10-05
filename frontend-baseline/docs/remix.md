# Remix 3

| | |
|---|---|
| Kind | A new full-stack, zero-dependency JavaScript web framework. Not React: it has its own component model. Remix 1–2 became React Router (see react-router.md); the name was reused for this project. |
| Version checked (2026-10-05) | remix 3.0.0 (just released after a long beta; expect rapid change) |
| Reactivity | Its own model; read the current docs before assuming anything from Remix 2. |
| Rendering | Server-first. |
| Best at | Teams that want a complete, opinionated stack from the React Router authors without React. |

## Pattern map

Too new and too different to map responsibly here. When surveying: build the light pages first and fill in this table from the experience. Expect strong answers on patterns 1, 2, 3, 8 and 9 (server-first routing, forms, sessions, content) and uncertain answers on 4, 6, 10 and 12 (client-heavy state, high-frequency updates, grids, motion).

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
