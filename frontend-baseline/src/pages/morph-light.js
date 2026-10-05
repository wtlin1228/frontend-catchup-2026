import './common-2.css';
import { morph, parseHTML } from '../lib/morph.js';

const $ = (id) => document.getElementById(id);
const target = $('target');
let lost = 0;
let seconds = 3;

async function refresh() {
  const html = await (await fetch('/api/fragment/status')).text();
  const note = () => target.querySelector('#status-note');
  const typed = note()?.value ?? '';
  const focused = document.activeElement === note();
  if (document.querySelector('input[name="mode"]:checked').value === 'morph') {
    const fresh = parseHTML(html);
    fresh.id = target.id;
    morph(target, fresh);
  } else {
    target.innerHTML = html;
  }
  if (typed && (note()?.value ?? '') !== typed) lost++;
  if (focused && document.activeElement !== note()) note()?.focus();
  $('lost').textContent = lost;
}
setInterval(() => {
  seconds--;
  if (seconds <= 0) { seconds = 3; refresh(); }
  $('countdown').textContent = seconds;
}, 1000);
refresh();
