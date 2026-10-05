import './common-2.css';
import { h } from '../lib/dom.js';

const $ = (id) => document.getElementById(id);
const log = (text, cls = '') => $('log').prepend(h('li', { class: cls }, `${new Date().toLocaleTimeString()} ${text}`));
$('policy').textContent = document.querySelector('meta[http-equiv="Content-Security-Policy"]').content.replaceAll('; ', ';\n');
document.addEventListener('securitypolicyviolation', (e) => log(`${e.violatedDirective} blocked ${e.blockedURI || 'an inline resource'}${e.sample ? ` (${e.sample.slice(0, 50)})` : ''}`, 'err'));

$('eval').addEventListener('click', () => {
  try { new Function('return 1 + 1')(); log('eval ran: the policy is not being enforced in this context'); }
  catch (err) { log(`eval refused: ${err.message}`, 'ok'); }
});
$('inline').addEventListener('click', () => {
  const holder = $('injected');
  holder.innerHTML = '<button type="button" class="btn btn--sm" onclick="document.body.style.background=\'red\'">Click me: this inline handler is not allowed</button>';
  log('inline handler injected; clicking it should do nothing and log a violation');
});
$('third').addEventListener('click', () => {
  const script = document.createElement('script');
  script.src = 'https://example.com/analytics.js';
  script.onerror = () => log('third-party script did not load', 'ok');
  document.head.append(script);
});
