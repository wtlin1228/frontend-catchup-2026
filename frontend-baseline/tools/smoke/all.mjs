// `pnpm verify`: the whole gate for the baseline in one command. Builds, checks dist/, starts a preview server,
// opens every page and runs every flow, then exits non-zero if anything failed.
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, waitFor } from './lib.mjs';
import { checkPages } from './pages.mjs';
import { runFlows } from './flows.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const port = 4179;
const sh = (cmd, args) => new Promise((done, fail) => { const c = spawn(cmd, args, { cwd: root, stdio: 'inherit' }); c.on('close', (code) => (code === 0 ? done() : fail(new Error(`${cmd} ${args.join(' ')} exited ${code}`)))); });

await sh('pnpm', ['build']);
await sh('node', ['scripts/check-dist.mjs']);
const server = spawn(resolve(root, 'node_modules/.bin/vite'), ['preview', '--port', String(port), '--strictPort'], { cwd: root, stdio: 'ignore' });
let failed = 0;
try {
  const base = `http://localhost:${port}`;
  if (!(await waitFor(base + '/'))) throw new Error('preview server did not start');
  const { browser, context } = await launch();
  const pages = await checkPages(base, { context });
  for (const p of pages.filter((p) => p.issues.length)) { failed++; console.log(`FAIL ${p.path}\n      ${p.issues.join('\n      ')}`); }
  console.log(`${pages.length - pages.filter((p) => p.issues.length).length}/${pages.length} pages clean`);
  const flows = await runFlows(base, { context });
  for (const f of flows.filter((f) => !f.ok)) { failed++; console.log(`FAIL ${f.name}\n      ${f.error}`); }
  console.log(`${flows.filter((f) => f.ok).length}/${flows.length} flows passed`);
  await browser.close();
} finally {
  server.kill();
}
console.log(failed ? `\n${failed} problem(s)` : '\nall green');
process.exit(failed ? 1 : 0);
