# Browser checks, flows, measurements

Headless-Chrome scripts that drive the baseline and every port the same way. They live in their own package so `playwright-core` does not count toward the baseline's dependencies.

```sh
cd tools/smoke && pnpm install          # once; Chrome at /usr/bin/google-chrome or $CHROME_PATH
```

From the project root:

| Command | What it does |
|---|---|
| `pnpm verify` | Build, check `dist/`, then open every page and run every flow against a preview server; exits non-zero on any problem |
| `pnpm compare` | Build the baseline and every `impl/<name>` with a `compare.config.json`, weigh the pages, open them, run the flows and the measurements, write `docs/results.md` and `tools/smoke/results.json`; `--lighthouse` refreshes the Lighthouse scores (the last ones are kept otherwise), `--only <name>` redoes one port, `--no-build` reuses `dist/` |

Each script also runs on its own against any server (a port keeps the URLs and ids, so nothing needs changing):

```sh
node pages.mjs http://localhost:4173 [pathFilter]     # every page: console errors, page errors, failed requests, structure
node flows.mjs http://localhost:4173 [nameFilter]     # 23 interactive flows; "state" runs only the ones whose name contains it
node measure.mjs http://localhost:4173 [pageFilter]   # the numbers the pages print: board render, dashboard rate, grid sort, rpc batching, vitals, trace
```

A flow's name starts with the page it drives; `compare.mjs` runs on a port only the flows whose pages it has.

Expected noise is filtered in `lib.mjs`: the deliberately flaky endpoints, the Trusted Types refusals the security page provokes, GPU warnings, and one Chrome headless quirk (an aborted cross-document view transition reported on random ordinary navigations, not tied to any page). Anything else printed under a `FAIL` line is a real problem.
