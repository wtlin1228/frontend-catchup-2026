# Svelte

| | |
|---|---|
| Kind | Compiler plus runtime; components compile to direct DOM updates. Meta-framework: SvelteKit. |
| Version checked (2026-10-05) | svelte 5.57.1 |
| Reactivity | Runes: `$state` (deep proxies), `$derived`, `$effect`, `$props`, `$bindable`; signals under the hood, no virtual DOM. |
| Rendering | Client with Vite; SSR, SSG and hybrid via SvelteKit. |
| Best at | Small output, readable components, motion and transitions built in. |

## Pattern map

| # | Pattern | How you build it in Svelte |
|---|---|---|
| 1 | Static content | Layout components with snippets; static HTML needs SvelteKit prerendering. |
| 2 | Forms | `bind:value` on native inputs; SvelteKit form actions + `use:enhance` for progressive enhancement; Superforms + Zod/Valibot; remote `form` functions in recent SvelteKit. |
| 3 | Dynamic | SvelteKit `load` and routing; in plain Svelte: svelte-routing or a hand router; TanStack Query (Svelte adapter) for cache and prefetch. |
| 4 | Client state | `$state` in a `.svelte.js` module as a shared store; undo via a history array of snapshots (`$state.snapshot`); keyed `{#each items as item (item.id)}`. |
| 5 | 3D | `$effect` with cleanup return, or Threlte (declarative three.js); dynamic `import()` for the chunk. |
| 6 | Real-time | `$effect` opens the EventSource and returns `close`; `$state.raw` for the ring buffers so pushes are cheap; updates are already fine-grained. |
| 7 | Media | `<enhanced:img>` in SvelteKit for build-time images; `bind:this` for the dialog; IntersectionObserver in `$effect`. |
| 8 | Cross-cutting | Context (`setContext`/`getContext`) or module-level `$state`; SvelteKit `hooks.server` for sessions; Paraglide or svelte-i18n. |
| 9 | Content | mdsvex (Markdown + Svelte); collections are a `import.meta.glob` plus front matter in SvelteKit. |
| 10 | Data grid | TanStack Table (Svelte adapter) + TanStack Virtual or svelte-virtual-list; workers via Vite. |
| 11 | Composite widgets | Bits UI / Melt UI (headless), shadcn-svelte, Skeleton. |
| 12 | Motion | Built in: `transition:fade`, `animate:flip`, `crossfade`, springs and tweens in `svelte/motion`; `document.startViewTransition` in SvelteKit `onNavigate`. |
| 13 | Offline | SvelteKit service worker support (`src/service-worker.js`, `$app/service-worker` in Kit 3) or `@vite-pwa/sveltekit`. |

## Migrating the baseline

1. `npx sv create app` (SvelteKit) or `npm create vite@latest -- --template svelte-ts` for plain Svelte; keep `mockApi()` in `vite.config`.
2. Partials become `+layout.svelte` (Kit) or layout components; pages become routes.
3. `store.js` → a `.svelte.js` module exporting `$state`; `router.js` → SvelteKit routing; `api.js` → `load` functions or TanStack Query; `toast.js` → a store + component.
4. `h()` calls become templates; keep `rows.js` and the worker.

## From the 2025–26 blog

Async Svelte (`await` in components), remote functions (`query`, `form`, `command`, `prerender`, `query.batch`, `query.live`), OpenTelemetry tracing integrated in SvelteKit, a Svelte MCP server and community CLI plugins. Port pattern 3 twice: with the mock API and with remote functions.

## Watch out for

- `$effect` is for side effects, not for deriving state; put derived values in `$derived`.
- `$state` deep proxies cost on large arrays (grid, dashboard): use `$state.raw` and reassign.
- Svelte 4 stores still work but are the old model; decide whether the port uses runes only.
- Smaller component ecosystem than React; headless libraries exist but fewer full kits.
- SvelteKit 3 shipped very recently (Svelte 5, Node 22 and TypeScript 6 required; `#lib` replaces `$lib`); see sveltekit.md.

## Links

- https://svelte.dev
- https://threlte.xyz, https://bits-ui.com
