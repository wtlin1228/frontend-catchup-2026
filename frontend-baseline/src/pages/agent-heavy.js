import './common-2.css';
import './agent-heavy.css';
import { h, mount, formatDate } from '../lib/dom.js';
import { getJSON, postJSON, invalidate, HttpError } from '../lib/api.js';
import { me } from '../lib/auth.js';
import { getTheme, applyTheme, THEMES } from '../lib/theme.js';
import { registerTool, callTool, tools, hasAgentApi } from '../lib/agent.js';
import { toast } from '../lib/toast.js';

const $ = (id) => document.getElementById(id);
const log = (text, cls = '') => $('log').prepend(h('li', { class: cls }, `${new Date().toLocaleTimeString()} ${text}`));
const brief = (post) => ({ id: post.id, title: post.title, author: post.author, date: post.date, tags: post.tags, likes: post.likes, liked: post.liked });

// ---------------------------------------------------------------- the actions, written once
// Each one updates the UI as a side effect and returns plain data: the buttons use the data to react,
// an agent gets the data as the tool result.
const ACTIONS = [
  {
    name: 'list_posts',
    description: 'List posts, newest first, optionally filtered by a search term. Returns id, title, author, date, tags and likes for each.',
    inputSchema: { type: 'object', properties: { q: { type: 'string' }, page: { type: 'integer', minimum: 1 } } },
    async execute({ q = '', page = 1 }) {
      const data = await getJSON(`/api/posts?${new URLSearchParams({ q, page, limit: 6 })}`);
      const items = data.items.map(brief);
      $('q').value = q;
      renderList(items);
      return { page: data.page, totalPages: data.totalPages, total: data.total, items };
    },
  },
  {
    name: 'get_post',
    description: 'Open one post by id and return its title, author, tags and body.',
    inputSchema: { type: 'object', properties: { id: { type: 'integer', minimum: 1 } }, required: ['id'] },
    async execute({ id }) {
      const post = await getJSON(`/api/posts/${id}`);
      renderPost(post);
      return { ...brief(post), body: post.body };
    },
  },
  {
    name: 'like_post',
    description: 'Toggle the like on a post. Fails about one time in three on purpose; the result says whether the post is liked now.',
    inputSchema: { type: 'object', properties: { id: { type: 'integer', minimum: 1 } }, required: ['id'] },
    async execute({ id }) {
      const result = await postJSON(`/api/posts/${id}/like`, {});
      invalidate('/api/posts');
      const button = document.querySelector(`[data-like="${id}"]`);
      if (button) button.textContent = `${result.liked ? 'Liked' : 'Like'} (${result.likes})`;
      return result;
    },
  },
  {
    name: 'publish_post',
    description: 'Publish a new post. Requires a signed-in session (sign in on the account page). Title needs 3 characters, body 20.',
    inputSchema: { type: 'object', properties: { title: { type: 'string', minLength: 3 }, body: { type: 'string', minLength: 20 }, tags: { type: 'string' } }, required: ['title', 'body'] },
    async execute({ title, body, tags = 'agent' }) {
      const created = await postJSON('/api/posts', { title, body, tags });
      invalidate('/api/posts');
      $('publish').reset();
      toast(`Published "${created.title}"`, { type: 'success' });
      return brief(created);
    },
  },
  {
    name: 'set_theme',
    description: 'Switch the site theme for this browser.',
    inputSchema: { type: 'object', properties: { theme: { type: 'string', enum: THEMES } }, required: ['theme'] },
    execute({ theme }) {
      applyTheme(theme);
      $('theme').value = theme;
      return { theme };
    },
  },
  {
    name: 'current_user',
    description: 'Who is signed in, or null.',
    inputSchema: { type: 'object', properties: {} },
    async execute() {
      const user = await me({ fresh: true });
      $('session').textContent = user ? `Signed in as ${user.name}.` : 'Not signed in: publish_post will be refused.';
      return user;
    },
  },
];

// ---------------------------------------------------------------- UI bound to the actions
function renderList(items) {
  mount($('posts'), items.length
    ? items.map((p) => h('li', { class: 'agent-posts__item' },
        h('a', { href: `#post-${p.id}`, onclick: (e) => { e.preventDefault(); run('get_post', { id: p.id }, 'ui'); } }, p.title),
        h('span', { class: 'muted' }, ` ${p.author}, ${formatDate(p.date)} `),
        h('button', { class: 'btn btn--sm', type: 'button', dataset: { like: p.id }, onclick: () => run('like_post', { id: p.id }, 'ui') }, `${p.liked ? 'Liked' : 'Like'} (${p.likes})`),
      ))
    : h('li', { class: 'muted' }, 'No posts match.'));
}
function renderPost(post) {
  const box = $('post');
  box.hidden = false;
  mount(box, h('h3', null, post.title), ...post.body.split('\n\n').map((t) => h('p', null, t)));
}

// Every call, from a button or from the console, goes through callTool: the schema check runs for both.
async function run(name, input, source) {
  const started = performance.now();
  try {
    const result = await callTool(name, input);
    log(`${source}: ${name}(${JSON.stringify(input)}) → ok in ${Math.round(performance.now() - started)} ms`, 'ok');
    return result;
  } catch (err) {
    const reason = err.validation ? `rejected by the schema: ${err.message}` : err instanceof HttpError ? `server answered ${err.status}: ${err.message}` : err.message;
    log(`${source}: ${name}(${JSON.stringify(input)}) → ${reason}`, 'err');
    throw err;
  }
}

$('search').addEventListener('submit', (e) => { e.preventDefault(); run('list_posts', { q: $('q').value.trim() }, 'ui').catch(() => {}); });
$('publish').addEventListener('submit', (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  run('publish_post', data, 'ui').catch((err) => toast(err.message, { type: 'error' }));
});
$('theme').value = getTheme();
$('theme').addEventListener('change', (e) => run('set_theme', { theme: e.target.value }, 'ui'));

// ---------------------------------------------------------------- registration and the console
const EXAMPLES = { list_posts: { q: 'state' }, get_post: { id: 3 }, like_post: { id: 3 }, publish_post: { title: 'From the console', body: 'This post was published through the tool registry, not the form.' }, set_theme: { theme: 'dark' }, current_user: {} };
Promise.all(ACTIONS.map(registerTool)).then((taken) => {
  $('webmcp').textContent = hasAgentApi() ? `present, ${taken.filter(Boolean).length} of ${ACTIONS.length} tools registered` : `absent, ${ACTIONS.length} tools in the local registry`;
});
const select = $('tool');
mount(select, [...tools.keys()].map((name) => h('option', { value: name }, name)));
function showTool() {
  const tool = tools.get(select.value);
  $('tool-description').textContent = tool.description;
  $('schema').textContent = JSON.stringify(tool.inputSchema, null, 2);
  $('args').value = JSON.stringify(EXAMPLES[tool.name] ?? {}, null, 2);
}
select.addEventListener('change', showTool);
showTool();

async function consoleRun(input) {
  $('run').disabled = true;
  try {
    const result = await run(select.value, input, 'console');
    $('result').textContent = JSON.stringify(result, null, 2);
  } catch (err) {
    $('result').textContent = `Error: ${err.message}`;
  } finally {
    $('run').disabled = false;
  }
}
$('run').addEventListener('click', () => {
  let input;
  try { input = JSON.parse($('args').value); } catch { $('result').textContent = 'Error: the arguments are not valid JSON.'; return; }
  consoleRun(input);
});
$('bad').addEventListener('click', () => consoleRun({ id: 'three', theme: 'sepia', q: 7 }));

run('current_user', {}, 'ui').catch(() => {});
run('list_posts', {}, 'ui').catch(() => {});
