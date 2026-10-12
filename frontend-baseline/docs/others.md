# Other candidates

Short notes on frameworks and libraries worth a sheet if the survey widens, grouped by what they would be compared on. Versions are npm `latest` on 2026-10-12; projects that do not publish to npm say so. Datastar, Marko, Analog and Vike graduated to sheets of their own on 2026-10-12.

## Hypermedia and sprinkles (compare with htmx.md, alpine.md, datastar.md)

**Hotwire: Turbo (@hotwired/turbo 8.0.23) and Stimulus (@hotwired/stimulus 3.2.2)**: Turbo Drive for page navigation, Frames for partial updates, Streams over WebSocket or SSE, morphing page refreshes since Turbo 8; Stimulus adds controllers to HTML. The Rails default, usable with any server. Strong on patterns 18 and 19; nothing for client state.

**Unpoly (unpoly 3.14.3)**: server-rendered fragments with layers (modals, drawers), caching and revalidation, form validation round trips; the most complete hypermedia answer to patterns 2, 3 and 14 without a client model.

**Alpine AJAX (@imacrayon/alpine-ajax 0.12.7)**: htmx-style requests as an Alpine plugin; the smallest step from alpine.md toward patterns 3 and 18.

## Content and documentation generators (compare with astro.md on pattern 9)

**Eleventy (@11ty/eleventy 3.1.6)**: the zero-client-JS static site generator (ESM in 3.x), any template language, WebC for web components; the floor for patterns 1 and 9.

**VitePress (vitepress 1.6.4) and Docusaurus (@docusaurus/core 3.10.2)**: documentation sites on Vue and React respectively; relevant only if the survey's content pattern is the whole product.

## Web components (compare with lit.md)

**Stencil (@stencil/core 4.45.2, 5.0 at beta)**: compiler for web components with lazy loading and SSR; compare on pattern 11.

**Enhance (@enhance/ssr 4.0.3)**: HTML-first web components with server rendering and progressive enhancement; patterns 1 and 2 with no client framework.

**Lit Labs signals (@lit-labs/signals 0.3.0)**: Lit on the TC39 signals proposal; a pattern 4 and 6 experiment on top of lit.md.

## Compilers and small runtimes

**Ember (ember-source 7.3.0, 7.4 at beta; ember-cli 7.3.0, @embroider/core 4.6.9)**: the convention-over-configuration framework; Polaris edition with Glimmer components, tracked properties (signals-like), Vite-based builds through Embroider. Strong on patterns 3, 8 and 10 (router, DI, data via WarpDrive); large floor on pattern 1.

**Inferno (inferno 10.0.0, 2026-10-04)**: React-shaped virtual DOM with its own JSX plugins (v10 requires them), keyed diffing with a `Map`, `inferno-compat` for React libraries; a size-and-speed comparison with preact.md.

**Mithril (mithril 2.3.8, 3.0 on `next`), Riot (riot 10.1.6), Hyperapp (hyperapp 2.0.22)**: small virtual-DOM libraries; of interest when size is the only criterion.

**Million (million 3.1.11)**: a compiler that swaps React's reconciliation for block-based updates on hot components; a measurement on pattern 4 and 6 for react.md rather than a candidate.

**Mitosis (@builder.io/mitosis 0.14.1)**: write components once in a JSX subset, compile to React, Vue, Svelte, Solid, Qwik, Angular and web components; relevant to the "how many frameworks do we have to support" question, not to the patterns.

## Runtimes and servers that bring a UI story

**Fresh** (Deno; published on JSR, not npm): Preact meta-framework with islands and zero-JS-by-default, Fresh 2 on Vite; Deno only. Patterns 1 and 7 with preact.md's component rows.

**Hono (hono 4.13.13, 5.0.0-rc.1 on `next` since 2026-10-10) with JSX and HonoX**: a server framework with JSX rendering, islands in HonoX, tiny client helpers; a natural partner for htmx or Datastar and for patterns 1, 2 and 9 on any runtime. The 5.0 release candidate's notes could not be retrieved on 2026-10-12.

## Not JavaScript (hiring and tooling questions more than pattern questions)

**Elm, Gleam/Lustre, ReScript-React**: typed-language approaches that compile to JavaScript.

**Leptos, Dioxus, Yew** (Rust, WebAssembly), **Blazor** (.NET, WebAssembly or server), **Phoenix LiveView** (Elixir, server-driven over WebSocket), **Flutter web** (Dart, canvas-rendered): the comparison is runtime, bundle size, accessibility of the rendered output (Flutter) and how much of the platform the survey's light pages can still use.
