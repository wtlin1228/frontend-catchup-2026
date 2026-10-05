# Survey guide

How to compare frameworks against the baseline, so that notes taken months apart remain comparable.

## Candidates

| Sheet | Kind | Version checked on 2026-10-05 (npm `latest`) |
|---|---|---|
| [react.md](react.md) | UI library | react 19.3.0 |
| [vue.md](vue.md) | UI framework | vue 3.5.43 (3.6 at RC) |
| [svelte.md](svelte.md) | Compiler + UI framework | svelte 5.57.1 |
| [angular.md](angular.md) | Full framework | @angular/core 22.2.1 |
| [solid.md](solid.md) | UI library | solid-js 1.9.15 (2.0 at RC) |
| [preact.md](preact.md) | UI library | preact 11.0.0 |
| [qwik.md](qwik.md) | Framework | @builder.io/qwik 1.20.1, @qwik.dev/core 2.0.0-rc.0 |
| [lit.md](lit.md) | Web components library | lit 3.3.3 |
| [alpine.md](alpine.md) | Sprinkles library | alpinejs 3.17.4 |
| [htmx.md](htmx.md) | Hypermedia library | htmx.org 2.0.11 (4.0 on `next`) |
| [nextjs.md](nextjs.md) | Meta-framework (React) | next 16.3.8 |
| [react-router.md](react-router.md) | Router / meta-framework (React) | react-router 8.4.0 |
| [remix.md](remix.md) | Full-stack framework (not React) | remix 3.0.0 |
| [tanstack-start.md](tanstack-start.md) | Meta-framework (React, Solid) | @tanstack/react-start 1.168.60 |
| [nuxt.md](nuxt.md) | Meta-framework (Vue) | nuxt 4.5.2 |
| [sveltekit.md](sveltekit.md) | Meta-framework (Svelte) | @sveltejs/kit 3.0.0 |
| [astro.md](astro.md) | Content-first meta-framework | astro 7.3.5 |
| [others.md](others.md) | Ember, Marko, Analog, Vike, Fresh, Hono, Datastar, Stencil | see sheet |

Add a candidate by copying [_template.md](_template.md). [landscape-2026.md](landscape-2026.md) summarises what each project's maintainers were writing about this year and which patterns the baseline still lacks. Re-check versions with `npm view <package> version` before porting; this landscape moves monthly.

## Patterns 14 to 23

Patterns 14 to 23 (async consistency, state across navigation, server functions, sync, morphing, platform navigation, error boundaries, observability, security, styling) were added after the landscape review. Every sheet maps them. Rows written from memory rather than from a port end in "(verify)": confirm those against the current docs while porting, and replace the cell with what the port actually did.

## Procedure

1. Read the sheet. Write down the current version and anything that changed since the sheet was written.
2. Scaffold with the framework's official starter. Record dependency count and install size.
3. Register `scripts/mock-api.js` (and `html-partials.js` if the framework has no layouts) in the framework's Vite config, or run the mock API as a separate process. Every port must talk to the same API.
4. Port the light pages in order 1 to 23, then the heavy pages. Keep a running list of decisions the framework made for you and places where you fought it.
5. Measure (below). Fill in the rubric the same day.
6. File the implementation under `impl/<name>/` (or a sibling repository) and link it from the sheet.

## Measurements

| Measurement | Pages | How |
|---|---|---|
| Shipped JS and CSS per page (gzip) | All | `pnpm build`; group chunks per entry; shared chunks count once per page that loads them |
| Lines of code per page | All | Only files that exist because of that page; config counts once |
| Works without JavaScript | Static, forms, content, media light | Disable scripts in the browser |
| Lighthouse, mobile preset, median of 3 | Static heavy, dynamic heavy, media heavy | Throttled CPU and network |
| Board: "last render" after Add 300 cards | State heavy | Printed on the page |
| Dashboard: renders/s and render ms at 30 Hz, both strategies | Real-time heavy | Printed on the page |
| Grid: sort time for 50,000 rows, worker vs main | Data grid heavy | Printed on the page |
| Requests per five same-tick calls | Server functions heavy | Printed on the page (1 in the baseline) |
| Vitals and trace duration | Observability pages | Printed on the page |
| Inline scripts the framework needs allowed | Security light | Count the hashes or nonces required for the page to work |
| three.js chunk: size and when it loads | Scene light vs heavy | Network panel |
| Install and dependency count, lifecycle scripts | Project | `pnpm ls --depth=0`, `du -sh node_modules`, `npm query ":attr(scripts, [postinstall])"` |
| Build time, cold and warm | Project | `time pnpm build` twice |
| Server throughput for the dynamic heavy page | Project (SSR ports) | `autocannon` or `oha` against the route, 10 s |
| Caching model | Dynamic heavy | How invalidation is expressed (`invalidate`, tags, `"use cache"`, route caching, CDN providers), what is cached where, and what a like does to the cached list |
| Compile targets inside one framework | State heavy, real-time heavy | Where a framework has two modes (Vue Vapor on or off, React Compiler on or off, Svelte runes or legacy), record shipped bytes and the on-page render numbers for both |

## Rubric

Score 1 to 5 with a one-line justification. The shape of the scores matters more than the total.

| Criterion | What it covers | Score | Note |
|---|---|---|---|
| Floor | Cost and ceremony of the light pages | | |
| Ceiling | How the heavy pages held up | | |
| Rendering | Static, server, client, streaming, and mixing them | | |
| Data | Loading, caching, invalidation, mutations, optimistic updates | | |
| Forms | Progressive enhancement, validation, server round trips, uploads | | |
| State and reactivity | Model clarity, performance under load, derived state | | |
| Interop | Imperative libraries, web components, workers | | |
| Widgets and motion | Headless primitives, animation support, accessibility defaults | | |
| Content | Markdown/MDX, collections, feeds, search | | |
| Tooling | Build, dev server, TypeScript, tests, debugging, deploy targets | | |
| Ecosystem and longevity | Maintenance, governance, licensing, support windows, upgrade history | | |
| AI fluency and agent integration | How well coding assistants generate it; docs in `node_modules`, skills, MCP servers; WebMCP or agent-facing hooks | | |
| Supply chain | Dependency count, lifecycle scripts, provenance and trusted publishing, response to incidents | | |
| Observability | Built-in tracing, performance tracks, error reporting, dev tools | | |
| Portability | Runtimes (Node, Bun, Deno, workers), deployment targets, build tool coupling | | |

Then two free-text fields: *What it decided for me* and *Where I fought it*.
