import './common-2.css';
import { h, mount, debounce } from '../lib/dom.js';
import { rpc, live, metrics } from '../lib/rpc.js';
import { toast } from '../lib/toast.js';

const $ = (id) => document.getElementById(id);
const counters = () => { $('counters').textContent = `${metrics.requests} request${metrics.requests === 1 ? '' : 's'} carried ${metrics.calls} call${metrics.calls === 1 ? '' : 's'}.`; };

$('q').addEventListener('input', debounce(async () => {
  const q = $('q').value;
  const items = await rpc('searchPosts', { q, limit: 5 });
  if ($('q').value !== q) return; // latest wins
  mount($('results'), items.length ? items.map((p) => h('li', null, p.title)) : h('li', { class: 'muted' }, 'No matches'));
  counters();
}, 200));

$('batch').addEventListener('click', async () => {
  $('batch-out').textContent = 'Working…';
  const before = metrics.requests;
  const results = await Promise.all([1, 2, 3, 4, 5].map((n) => rpc('slowSquare', { n })));
  $('batch-out').textContent = `${results.map((r) => r.square).join(', ')} came back in ${metrics.requests - before} request.`;
  counters();
});

$('publish').addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  $('publish-out').textContent = '';
  try {
    const post = await rpc('publish', data);
    toast(`Published "${post.title}"`, { type: 'success' });
    e.target.reset();
  } catch (err) {
    if (err.status === 401) return location.assign(`/account/heavy.html?next=${encodeURIComponent(location.pathname)}`);
    $('publish-out').textContent = err.message;
  }
  counters();
});

const stop = live('status', ({ online, time }) => { $('live').textContent = `${online} online at ${new Date(time).toLocaleTimeString()}`; });
window.addEventListener('pagehide', stop);
counters();
