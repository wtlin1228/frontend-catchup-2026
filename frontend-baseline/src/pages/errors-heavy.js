import './common-2.css';
import { h, mount } from '../lib/dom.js';

const $ = (id) => document.getElementById(id);
const counts = { stable: { ok: 0, fail: 0 }, flaky: { ok: 0, fail: 0 }, buggy: { ok: 0, fail: 0 } };
const seen = new Map(); // fingerprint -> count
const log = (text, cls = '') => $('log').prepend(h('li', { class: cls }, `${new Date().toLocaleTimeString()} ${text}`));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function report(name, err) {
  const fingerprint = `${name}:${err.message}`;
  const count = (seen.get(fingerprint) ?? 0) + 1;
  seen.set(fingerprint, count);
  if (count === 1 || count % 5 === 0) {
    fetch('/api/errors', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ fingerprint, count, message: err.message, section: name }) }).catch(() => {});
    log(`sent ${fingerprint} (occurrence ${count})`, 'err');
  } else {
    log(`counted ${fingerprint} (occurrence ${count}, not resent)`);
  }
}
const paintCounts = () => { $('counts').textContent = Object.entries(counts).map(([k, c]) => `${k}: ${c.ok} ok / ${c.fail} failed`).join(', '); };

// A boundary owns one subtree: it renders, catches, shows a fallback and retries without touching its siblings.
function boundary(root, { name, render, autoRetries = 2 }) {
  let attempt = 0;
  async function run(auto = false) {
    attempt++;
    mount(root, h('p', { class: 'muted' }, auto ? `Retrying (attempt ${attempt})…` : 'Loading…'));
    try {
      mount(root, await render({ attempt }));
      counts[name].ok++;
    } catch (err) {
      counts[name].fail++;
      report(name, err);
      const delay = Math.min(4000, 500 * 2 ** (attempt - 1));
      const willRetry = attempt <= autoRetries;
      mount(root, h('div', { class: 'notice notice--error stack' },
        h('p', null, h('strong', null, 'This section failed: '), err.message),
        willRetry ? h('p', { class: 'muted' }, `Retrying in ${delay / 1000}s.`) : h('button', { class: 'btn btn--sm', type: 'button', onclick: () => { attempt = 0; run(); } }, 'Try again'),
      ));
      if (willRetry) { await sleep(delay); return run(true); }
    }
    paintCounts();
  }
  return { run: () => { attempt = 0; return run(); } };
}

const sections = [
  boundary($('s-stable'), { name: 'stable', render: async () => { await sleep(300); return h('p', null, 'Rendered fine.'); } }),
  boundary($('s-flaky'), { name: 'flaky', render: async () => {
    const res = await fetch('/api/flaky');
    if (!res.ok) throw new Error(`The server answered ${res.status}`);
    return h('p', null, `Server value ${(await res.json()).value}.`);
  } }),
  boundary($('s-buggy'), { name: 'buggy', render: async () => {
    if ($('bug').checked) throw new TypeError("Cannot read properties of undefined (reading 'title') (simulated)");
    return h('p', null, 'No bug this time.');
  } }),
];
$('reload').addEventListener('click', () => sections.forEach((s) => s.run()));
$('bug').addEventListener('change', () => sections[2].run());
sections.forEach((s) => s.run());
