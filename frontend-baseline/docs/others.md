# Other candidates

Short notes on frameworks worth a sheet if the survey widens. Versions are npm `latest` on 2026-10-05.

**Ember (ember-source 7.3)**: the convention-over-configuration framework; Polaris edition with Glimmer components, tracked properties (signals-like), Vite-based builds. Strong on patterns 3, 8 and 10 (router, DI, data via WarpDrive); large floor on pattern 1.

**Marko (marko 6.4)**: compiler-first, streaming SSR with automatic partial hydration (only stateful parts ship JS), Tags API. Interesting on patterns 1, 3 and 6; small ecosystem for 11 and 12.

**Analog (@analogjs/platform 2.8)**: meta-framework for Angular: file-based routing, Markdown content, SSR, Vite. Cover it inside angular.md unless Angular is a finalist.

**Vike (vike 0.4)**: a build-your-own meta-framework on Vite for React, Vue, Solid and others: file routing, SSR/SSG/SPA per page, data fetching hooks. Useful when a UI library is chosen and Next/Nuxt feel too opinionated.

**Fresh**: Deno's Preact meta-framework with islands and zero-JS-by-default; Deno only.

**Hono + JSX**: a server framework with JSX rendering and tiny client helpers; a natural partner for htmx and for patterns 1, 2, 9.

**Datastar**: hypermedia plus signals in one small library (SSE-driven); the htmx alternative to test on pattern 6.

**Stencil**: compiler for web components with lazy loading and SSR; compare with lit.md on pattern 11.

**Mithril, Inferno, Riot**: small virtual-DOM libraries; mostly of historical interest unless size is the only criterion.

**Elm, Gleam/Lustre, Rescript-React**: typed-language approaches; the survey question is tooling and hiring more than patterns.
