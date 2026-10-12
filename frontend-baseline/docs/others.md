# Other candidates

Short notes on frameworks worth a sheet if the survey widens. Versions are npm `latest` on 2026-10-12.

**Ember (ember-source 7.3.0, 7.4 at beta)**: the convention-over-configuration framework; Polaris edition with Glimmer components, tracked properties (signals-like), Vite-based builds. Strong on patterns 3, 8 and 10 (router, DI, data via WarpDrive); large floor on pattern 1.

**Marko (marko 6.4.5)**: compiler-first, streaming SSR with automatic partial hydration (only stateful parts ship JS), Tags API. Interesting on patterns 1, 3 and 6; small ecosystem for 11 and 12.

**Analog (@analogjs/platform 2.8.0, 3.0 at alpha)**: meta-framework for Angular: file-based routing, Markdown content, SSR, Vite. Cover it inside angular.md unless Angular is a finalist.

**Vike (vike 0.4.267)**: a build-your-own meta-framework on Vite for React, Vue, Solid and others: file routing, SSR/SSG/SPA per page, data fetching hooks. Useful when a UI library is chosen and Next/Nuxt feel too opinionated.

**Fresh** (published on JSR, not npm): Deno's Preact meta-framework with islands and zero-JS-by-default; Deno only.

**Hono + JSX (hono 4.13.13, 5.0.0-rc.1 on `next` since 2026-10-10)**: a server framework with JSX rendering and tiny client helpers; a natural partner for htmx and for patterns 1, 2, 9.

**Datastar** (distributed as one 11.9 KiB file from its own site; the npm package `@starfederation/datastar` stopped at 1.0.0-beta.11 in March 2025, so install from the site): hypermedia plus signals in one small library (SSE-driven); the htmx alternative to test on pattern 6.

**Stencil (@stencil/core 4.45.2, 5.0 at beta)**: compiler for web components with lazy loading and SSR; compare with lit.md on pattern 11.

**Mithril (2.3.8, 3.0 on `next`), Inferno (10.0.0 on 2026-10-04: new JSX plugins required, smaller vnodes), Riot (10.1.6)**: small virtual-DOM libraries; mostly of historical interest unless size is the only criterion.

**Elm, Gleam/Lustre, Rescript-React**: typed-language approaches; the survey question is tooling and hiring more than patterns.
