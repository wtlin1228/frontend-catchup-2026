import './components-heavy.css';
import { h, mount } from '../lib/dom.js';
import { toast } from '../lib/toast.js';

const $ = (id) => document.getElementById(id);

// ---------- Tabs: automatic activation, roving tabindex
function initTabs(root) {
  const tabs = [...root.querySelectorAll('[role="tab"]')];
  const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));
  const select = (i, focus) => {
    tabs.forEach((t, j) => {
      t.setAttribute('aria-selected', String(i === j));
      t.tabIndex = i === j ? 0 : -1;
      panels[j].hidden = i !== j;
    });
    if (focus) tabs[i].focus();
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(i, false));
    tab.addEventListener('keydown', (e) => {
      const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
      if (next === undefined) return;
      e.preventDefault();
      select((next + tabs.length) % tabs.length, true);
    });
  });
}

// ---------- Combobox: editable input + listbox, aria-activedescendant
function initCombobox({ input, list, options, onSelect }) {
  let items = [];
  let active = -1;
  let open = false;
  const optionEls = () => [...list.querySelectorAll('[role="option"]')];
  const setActive = (i) => {
    active = i;
    optionEls().forEach((li, j) => li.setAttribute('aria-selected', String(j === i)));
    if (i >= 0) {
      const el = optionEls()[i];
      input.setAttribute('aria-activedescendant', el.id);
      el.scrollIntoView({ block: 'nearest' });
    } else {
      input.removeAttribute('aria-activedescendant');
    }
  };
  const render = () => {
    const q = input.value.trim().toLowerCase();
    items = options.filter((o) => o.label.toLowerCase().includes(q));
    mount(list, items.length
      ? items.map((o, i) => h('li', { role: 'option', id: `${list.id}-option-${i}`, onmousedown: (e) => e.preventDefault(), onclick: () => choose(i) }, o.label, o.hint && h('span', { class: 'muted' }, ` ${o.hint}`)))
      : h('li', { class: 'muted' }, 'No matches'));
    setActive(items.length ? 0 : -1);
  };
  const show = () => { open = true; list.hidden = false; input.setAttribute('aria-expanded', 'true'); render(); };
  const hide = () => { open = false; list.hidden = true; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); };
  const choose = (i) => {
    if (!items[i]) return;
    input.value = items[i].label;
    hide();
    onSelect?.(items[i]);
  };
  input.addEventListener('input', show);
  input.addEventListener('focus', show);
  input.addEventListener('blur', hide);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); open ? setActive(Math.min(active + 1, items.length - 1)) : show(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(Math.max(active - 1, 0)); }
    else if (e.key === 'Enter' && open && active >= 0) { e.preventDefault(); choose(active); }
    else if (e.key === 'Escape') { e.preventDefault(); if (open) hide(); else input.value = ''; }
  });
}

// ---------- Menu button: roving focus, typeahead, outside click
function initMenu(root) {
  const button = root.querySelector('[aria-haspopup="menu"]');
  const menu = document.getElementById(button.getAttribute('aria-controls'));
  const items = [...menu.querySelectorAll('[role="menuitem"]')];
  const open = (index) => { menu.hidden = false; button.setAttribute('aria-expanded', 'true'); items[index].focus(); };
  const close = (refocus = true) => { menu.hidden = true; button.setAttribute('aria-expanded', 'false'); if (refocus) button.focus(); };
  button.addEventListener('click', () => (menu.hidden ? open(0) : close()));
  button.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); open(0); }
    if (e.key === 'ArrowUp') { e.preventDefault(); open(items.length - 1); }
  });
  menu.addEventListener('keydown', (e) => {
    const i = items.indexOf(document.activeElement);
    const label = (el) => el.textContent.trim().toLowerCase();
    if (e.key === 'ArrowDown') items[(i + 1) % items.length].focus();
    else if (e.key === 'ArrowUp') items[(i - 1 + items.length) % items.length].focus();
    else if (e.key === 'Home') items[0].focus();
    else if (e.key === 'End') items.at(-1).focus();
    else if (e.key === 'Escape') close();
    else if (e.key === 'Tab') return close(false);
    else if (/^[a-z]$/i.test(e.key)) {
      const k = e.key.toLowerCase();
      (items.find((el, j) => j > i && label(el).startsWith(k)) ?? items.find((el) => label(el).startsWith(k)))?.focus();
    } else return;
    e.preventDefault();
  });
  items.forEach((item) => item.addEventListener('click', () => { toast(`${item.textContent.trim()}: done`); close(); }));
  document.addEventListener('pointerdown', (e) => { if (!menu.hidden && !root.contains(e.target)) close(false); });
}

// ---------- wire up
const FRAMEWORKS = [
  ['React', 'library'], ['Vue', 'library'], ['Svelte', 'library'], ['Angular', 'framework'], ['Solid', 'library'], ['Preact', 'library'],
  ['Qwik', 'framework'], ['Lit', 'library'], ['Alpine.js', 'library'], ['htmx', 'library'], ['Next.js', 'meta-framework'], ['React Router', 'meta-framework'],
  ['TanStack Start', 'meta-framework'], ['Nuxt', 'meta-framework'], ['SvelteKit', 'meta-framework'], ['Astro', 'meta-framework'], ['Remix 3', 'framework'],
].map(([label, hint]) => ({ label, hint }));

initTabs(document.querySelector('[data-widget="tabs"]'));
initCombobox({ input: $('cb'), list: $('cb-list'), options: FRAMEWORKS, onSelect: (o) => { $('cb-result').textContent = `Chosen: ${o.label} (${o.hint}).`; } });
initMenu(document.querySelector('[data-widget="menu"]'));

const palette = $('palette');
const pages = [...document.querySelectorAll('.nav-menu__list a')].flatMap((a) =>
  ['light', 'heavy'].map((v) => ({ label: `${a.textContent.trim()}, ${v}`, href: a.getAttribute('href').replace('light', v) })));
initCombobox({ input: $('palette-input'), list: $('palette-list'), options: [{ label: 'Home', href: '/' }, ...pages], onSelect: (o) => { palette.close(); location.href = o.href; } });
const openPalette = () => { $('palette-input').value = ''; palette.showModal(); };
$('open-palette').addEventListener('click', openPalette);
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    palette.open ? palette.close() : openPalette();
  }
});
palette.addEventListener('click', (e) => { if (e.target === palette) palette.close(); });
