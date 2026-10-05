// Search over a build-time index plus tag filtering. Without script the page is still a complete list.
const items = [...document.querySelectorAll('#articles li')];
const search = document.getElementById('search');
const count = document.getElementById('result-count');
let index = null;
let tag = new URLSearchParams(location.search).get('tag') ?? '';

async function loadIndex() {
  try {
    const res = await fetch('/data/content-index.json');
    index = await res.json();
  } catch {
    index = null; // search degrades to title matching from the DOM
  }
}

function apply() {
  const q = search.value.trim().toLowerCase();
  let shown = 0;
  for (const li of items) {
    const entry = index?.find((e) => e.slug === li.dataset.slug);
    const haystack = (entry ? [entry.title, entry.description, ...entry.headings].join(' ') : li.textContent).toLowerCase();
    const visible = (!tag || li.dataset.tags.split(' ').includes(tag)) && (!q || haystack.includes(q));
    li.hidden = !visible;
    shown += visible;
  }
  count.textContent = `${shown} of ${items.length}`;
  for (const a of document.querySelectorAll('#tags a')) {
    if (a.dataset.tag === tag) a.setAttribute('aria-current', 'true');
    else a.removeAttribute('aria-current');
  }
}

search.addEventListener('input', apply);
document.getElementById('tags').addEventListener('click', (e) => {
  const a = e.target.closest('a[data-tag]');
  if (!a) return;
  e.preventDefault();
  tag = a.dataset.tag;
  history.replaceState(null, '', tag ? `?tag=${tag}` : location.pathname);
  apply();
});
loadIndex().then(apply);
apply();
