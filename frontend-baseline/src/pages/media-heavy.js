import './media-heavy.css';
import gallery from '../data/gallery.json'; // build-time data, inlined by Vite: the static-site way, no fetch
import { h } from '../lib/dom.js';

const PAGE = 12;
const SIZES = '(min-width: 64rem) 25vw, (min-width: 40rem) 33vw, 50vw';
const $ = (id) => document.getElementById(id);
const grid = $('gallery-grid');
const sentinel = $('sentinel');
const moreButton = $('load-more');
const dialog = $('lightbox');
const lbImg = $('lb-img');
const lbCaption = $('lb-caption');
let shown = 0;
let active = -1;
let returnFocus = null;

$('gallery-count').textContent = `${gallery.length} images, ${PAGE} at a time.`;

const srcset = (item) => Object.entries(item.src).map(([w, url]) => `${url} ${w}w`).join(', ');

function figure(item, index) {
  return h('figure', { class: 'gallery__figure', id: item.id },
    h('button', { class: 'gallery__button', type: 'button', 'aria-label': `Open ${item.title}`, onclick: () => open(index) },
      h('img', {
        src: item.src['400'],
        srcset: srcset(item),
        sizes: SIZES,
        width: item.width, // intrinsic size reserves space: no layout shift while loading
        height: item.height,
        alt: item.alt,
        loading: 'lazy',
        decoding: 'async',
        style: { backgroundColor: item.color }, // dominant colour as placeholder
      }),
    ),
    h('figcaption', null, item.title),
  );
}

// --- infinite scroll with a button fallback ---
function showMore() {
  const batch = gallery.slice(shown, shown + PAGE);
  grid.append(...batch.map((item, i) => figure(item, shown + i)));
  shown += batch.length;
  if (shown >= gallery.length) {
    observer.disconnect();
    sentinel.hidden = true;
    moreButton.hidden = true;
  }
}
const observer = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) showMore(); }, { rootMargin: '600px 0px' });
observer.observe(sentinel);
moreButton.addEventListener('click', showMore);
showMore();

// --- lightbox: native <dialog> (focus trap, Escape, inert background come for free) ---
function show(index) {
  active = (index + gallery.length) % gallery.length;
  const item = gallery[active];
  lbImg.src = item.src['1200'];
  lbImg.srcset = srcset(item);
  lbImg.sizes = '90vw';
  lbImg.alt = item.alt;
  lbImg.style.backgroundColor = item.color;
  lbCaption.textContent = `${item.title}, ${active + 1} of ${gallery.length}`;
  history.replaceState(null, '', `#${item.id}`); // deep link without scrolling
}
function open(index) {
  returnFocus = document.activeElement;
  const update = () => {
    show(index);
    if (!dialog.open) dialog.showModal();
  };
  // Same-document view transition where supported; a plain update otherwise.
  if (document.startViewTransition && !dialog.open) document.startViewTransition(update);
  else update();
}
$('lb-prev').addEventListener('click', () => show(active - 1));
$('lb-next').addEventListener('click', () => show(active + 1));
$('lb-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); }); // backdrop click
dialog.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') show(active - 1);
  else if (e.key === 'ArrowRight') show(active + 1);
});
dialog.addEventListener('close', () => {
  history.replaceState(null, '', location.pathname);
  // Return focus to the thumbnail that is now current (it may differ from the one that opened the dialog).
  const current = active >= 0 ? document.querySelector(`#${gallery[active].id} button`) : null;
  (current ?? returnFocus)?.focus();
  active = -1;
});

// --- deep link: /gallery.html#photo-07 ---
const initial = gallery.findIndex((item) => `#${item.id}` === location.hash);
if (initial >= 0) {
  while (shown <= initial) showMore();
  open(initial);
}
