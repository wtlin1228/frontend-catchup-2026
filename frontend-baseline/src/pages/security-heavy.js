import './common-2.css';
import { h } from '../lib/dom.js';

const $ = (id) => document.getElementById(id);
const log = (text, cls = '') => $('log').prepend(h('li', { class: cls }, `${new Date().toLocaleTimeString()} ${text}`));
document.addEventListener('securitypolicyviolation', (e) => log(`${e.violatedDirective} blocked ${e.blockedURI || 'an inline resource'}`, 'err'));

// Allow-list sanitiser: keep a few tags and safe attributes, drop everything else and every on* handler.
const ALLOWED = { P: [], B: [], I: [], EM: [], STRONG: [], A: ['href'], UL: [], OL: [], LI: [], CODE: [], PRE: [], BR: [], H3: [] };
const DROP = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'TEMPLATE']);
function sanitize(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const clean = (node) => {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === Node.TEXT_NODE) continue;
      if (child.nodeType !== Node.ELEMENT_NODE || DROP.has(child.tagName)) { child.remove(); continue; }
      clean(child);
      const allowed = ALLOWED[child.tagName];
      if (!allowed) { child.replaceWith(...child.childNodes); continue; }
      for (const attr of [...child.attributes]) {
        if (!allowed.includes(attr.name)) child.removeAttribute(attr.name);
        else if (attr.name === 'href' && !/^(https?:|mailto:|\/|#)/i.test(attr.value.trim())) child.removeAttribute('href');
      }
      if (child.tagName === 'A') child.setAttribute('rel', 'noopener noreferrer');
    }
  };
  clean(doc.body);
  return doc.body.innerHTML;
}
const policy = window.trustedTypes?.createPolicy('baseline', { createHTML: sanitize });
$('tt').textContent = policy ? 'Trusted Types are enforced here: raw strings cannot be assigned to innerHTML.' : 'Trusted Types are not supported in this browser; the sanitiser still runs, but nothing stops a raw assignment.';

$('render').addEventListener('click', () => {
  $('preview').innerHTML = policy ? policy.createHTML($('raw').value) : sanitize($('raw').value);
  log('rendered through the sanitising policy', 'ok');
});
$('raw-inject').addEventListener('click', () => {
  try { $('preview').innerHTML = $('raw').value; log('raw innerHTML assignment went through (no Trusted Types here)', 'err'); }
  catch (err) { log(`raw innerHTML refused: ${err.message}`, 'ok'); }
});

// CSRF: the server sets a cookie; the request must repeat its value in a header (double submit).
let token = null;
fetch('/api/csrf').then((r) => r.json()).then((data) => { token = data.token; log('CSRF token issued'); });
async function submit(withToken) {
  const res = await fetch('/api/secure-action', { method: 'POST', headers: { 'content-type': 'application/json', ...(withToken && token ? { 'x-csrf-token': token } : {}) }, body: JSON.stringify({ value: $('secure').elements.namedItem('value').value }) });
  const body = await res.json();
  $('csrf-out').textContent = res.ok ? `Accepted: ${JSON.stringify(body)}` : `Rejected (${res.status}): ${body.error}`;
  log(res.ok ? 'secure action accepted' : `secure action rejected: ${body.error}`, res.ok ? 'ok' : 'err');
}
$('secure').addEventListener('submit', (e) => { e.preventDefault(); submit(true); });
$('without').addEventListener('click', () => submit(false));
