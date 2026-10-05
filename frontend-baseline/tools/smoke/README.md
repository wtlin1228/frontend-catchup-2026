# Browser smoke tests

Two scripts drive a headless Chrome over every page. They live in their own package so `playwright-core` does not count toward the baseline's dependencies.

```sh
# from the project root, in two terminals
pnpm dev                       # or: pnpm build && pnpm preview (port 4173)
cd tools/smoke && pnpm install
node pages.mjs http://localhost:5173    # opens all 51 pages: console errors, page errors, failed requests, structure
node flows.mjs http://localhost:5173    # 17 interactive flows: forms, login, routing, grid, palette, rpc, security, sync…
```

Both scripts look for Chrome at `/usr/bin/google-chrome`; change `executablePath` if yours is elsewhere. Expected noise is filtered: the deliberately flaky `/api/flaky` 500s, the 30% failing like endpoint, Trusted Types refusals the security page provokes on purpose, and headless GPU warnings. Anything else printed under a `FAIL` line is a real problem. `pnpm check` at the project root is the dependency-free static check of `dist/` and runs without a browser.
