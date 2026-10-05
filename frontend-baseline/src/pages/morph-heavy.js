import './common-2.css';
import './morph-heavy.css';
import { h, mount } from '../lib/dom.js';
import { morph, parseHTML } from '../lib/morph.js';

const $ = (id) => document.getElementById(id);

$('stream').addEventListener('click', async () => {
  const target = $('stream-target');
  const res = await fetch('/api/fragment/stream');
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let text = '';
  let chunks = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
    chunks++;
    const fresh = parseHTML(text); // the parser closes open tags for us; the morph adds only what is new
    fresh.id = target.id;
    morph(target, fresh);
    $('stream-status').textContent = `${chunks} chunk${chunks === 1 ? '' : 's'} applied`;
  }
  $('stream-status').textContent += ', stream closed';
});

const bars = $('bars');
mount(bars, [1, 2, 3, 4, 5].map((i) => h('li', { id: `bar-${i}` }, `Bar ${i}`, h('div', { class: 'bar' }, h('div', { class: 'bar__fill' })))));
const supported = typeof Element.prototype.moveBefore === 'function';
$('move-support').textContent = supported ? 'moveBefore is available in this browser.' : 'moveBefore is not available here; the second button falls back to insertBefore.';
$('reverse-insert').addEventListener('click', () => { for (const li of [...bars.children].reverse()) bars.insertBefore(li, null); });
$('reverse-move').addEventListener('click', () => { for (const li of [...bars.children].reverse()) (supported ? bars.moveBefore(li, null) : bars.insertBefore(li, null)); });
