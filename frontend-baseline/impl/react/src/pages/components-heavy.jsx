import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { mount } from '../mount.jsx';
import { Layout, PATTERNS } from '../Layout.jsx';
import { toast } from '@baseline/src/lib/toast.js';
import '@baseline/src/pages/components-heavy.css';

// ---------- Tabs: automatic activation, roving tabindex. Selection is state; focus is a ref.
function Tabs({ tabs }) {
  const [selected, setSelected] = useState(0);
  const buttons = useRef([]);
  const select = (i, focus) => { const n = (i + tabs.length) % tabs.length; setSelected(n); if (focus) buttons.current[n].focus(); };
  const onKeyDown = (i) => (e) => {
    const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    select(next, true);
  };
  return (
    <div data-widget="tabs" className="tabs">
      <div role="tablist" aria-label="Framework families">
        {tabs.map((t, i) => <button key={t.id} ref={(el) => { buttons.current[i] = el; }} role="tab" id={`tab-${t.id}`} aria-selected={i === selected} aria-controls={`panel-${t.id}`} type="button" tabIndex={i === selected ? 0 : -1} onClick={() => select(i, false)} onKeyDown={onKeyDown(i)}>{t.label}</button>)}
      </div>
      {tabs.map((t, i) => <div key={t.id} role="tabpanel" id={`panel-${t.id}`} aria-labelledby={`tab-${t.id}`} tabIndex={0} hidden={i !== selected}><p>{t.panel}</p></div>)}
    </div>
  );
}

// ---------- Combobox: editable input + listbox, aria-activedescendant. The filtered list is derived during render.
function Combobox({ id, listId, label, labelHidden, placeholder, options, onSelect }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const list = useRef(null);
  const items = open ? options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase())) : [];
  const activeIndex = items.length ? Math.min(active, items.length - 1) : -1;
  const show = () => { setOpen(true); setActive(0); };
  const hide = () => { setOpen(false); setActive(-1); };
  const choose = (i) => { const item = items[i]; if (!item) return; setQuery(item.label); hide(); onSelect?.(item); };
  useEffect(() => { if (open && activeIndex >= 0) list.current.children[activeIndex]?.scrollIntoView({ block: 'nearest' }); }, [open, activeIndex]);
  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (open) setActive(Math.min(activeIndex + 1, items.length - 1)); else show(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(Math.max(activeIndex - 1, 0)); }
    else if (e.key === 'Enter' && open && activeIndex >= 0) { e.preventDefault(); choose(activeIndex); }
    else if (e.key === 'Escape') { e.preventDefault(); if (open) hide(); else setQuery(''); }
  };
  return (
    <>
      <label htmlFor={id} className={labelHidden ? 'visually-hidden' : undefined}>{label}</label>
      <input id={id} className="input" role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={listId} aria-activedescendant={open && activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined} autoComplete="off" placeholder={placeholder}
        value={query} onChange={(e) => { setQuery(e.target.value); show(); }} onFocus={show} onBlur={hide} onKeyDown={onKeyDown} />
      <ul id={listId} ref={list} className="listbox" role="listbox" hidden={!open}>
        {items.length
          ? items.map((o, i) => <li key={o.label} role="option" id={`${listId}-option-${i}`} aria-selected={i === activeIndex} onMouseDown={(e) => e.preventDefault()} onClick={() => choose(i)}>{o.label}{o.hint && <span className="muted"> {o.hint}</span>}</li>)
          : <li className="muted">No matches</li>}
      </ul>
    </>
  );
}

// ---------- Menu button: roving focus, typeahead, outside click. Open is state; which item has focus is the DOM's.
function Menu({ id, menuId, items }) {
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  const button = useRef(null);
  const list = useRef(null);
  const focusIndex = useRef(0);
  const els = () => [...list.current.querySelectorAll('[role="menuitem"]')];
  const openAt = (i) => { focusIndex.current = i; setOpen(true); };
  const close = (refocus = true) => { setOpen(false); if (refocus) button.current.focus(); };
  useLayoutEffect(() => { if (open) els()[focusIndex.current].focus(); }, [open]); // after the list is unhidden
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (!root.current.contains(e.target)) close(false); };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);
  const onButtonKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); openAt(0); }
    if (e.key === 'ArrowUp') { e.preventDefault(); openAt(items.length - 1); }
  };
  const onMenuKey = (e) => {
    const all = els();
    const i = all.indexOf(document.activeElement);
    const label = (el) => el.textContent.trim().toLowerCase();
    if (e.key === 'ArrowDown') all[(i + 1) % all.length].focus();
    else if (e.key === 'ArrowUp') all[(i - 1 + all.length) % all.length].focus();
    else if (e.key === 'Home') all[0].focus();
    else if (e.key === 'End') all.at(-1).focus();
    else if (e.key === 'Escape') close();
    else if (e.key === 'Tab') return close(false);
    else if (/^[a-z]$/i.test(e.key)) {
      const k = e.key.toLowerCase();
      (all.find((el, j) => j > i && label(el).startsWith(k)) ?? all.find((el) => label(el).startsWith(k)))?.focus();
    } else return;
    e.preventDefault();
  };
  return (
    <div className="menu" data-widget="menu" ref={root}>
      <button className="btn" id={id} ref={button} type="button" aria-haspopup="menu" aria-expanded={open} aria-controls={menuId} onClick={() => (open ? close() : openAt(0))} onKeyDown={onButtonKey}>Actions</button>
      <ul id={menuId} ref={list} className="menu__list" role="menu" aria-labelledby={id} hidden={!open} onKeyDown={onMenuKey}>
        {items.map((item) => <li key={item} role="menuitem" tabIndex={-1} onClick={() => { toast(`${item}: done`); close(); }}>{item}</li>)}
      </ul>
    </div>
  );
}

const FRAMEWORKS = [
  ['React', 'library'], ['Vue', 'library'], ['Svelte', 'library'], ['Angular', 'framework'], ['Solid', 'library'], ['Preact', 'library'],
  ['Qwik', 'framework'], ['Lit', 'library'], ['Alpine.js', 'library'], ['htmx', 'library'], ['Next.js', 'meta-framework'], ['React Router', 'meta-framework'],
  ['TanStack Start', 'meta-framework'], ['Nuxt', 'meta-framework'], ['SvelteKit', 'meta-framework'], ['Astro', 'meta-framework'], ['Remix 3', 'framework'],
].map(([label, hint]) => ({ label, hint }));
const TABS = [
  { id: 'lib', label: 'Libraries', panel: 'React, Vue, Svelte, Solid, Preact, Lit and Angular render components; most need a router and a data layer added.' },
  { id: 'meta', label: 'Meta-frameworks', panel: 'Next.js, Nuxt, SvelteKit, React Router, TanStack Start, Astro and Analog add routing, data loading, rendering modes and a server.' },
  { id: 'alt', label: 'Alternatives', panel: 'htmx, Alpine.js and web components take a different shape: the server renders, the browser sprinkles.' },
];
const PAGES = [{ label: 'Home', href: '/' }, ...PATTERNS.flatMap(([id, label]) => ['light', 'heavy'].map((v) => ({ label: `${label}, ${v}`, href: `/${id}/${v}.html` })))];

function Widgets() {
  const [chosen, setChosen] = useState(null);
  const dialog = useRef(null);
  const [opened, setOpened] = useState(0);
  // A fresh combobox per opening (the key) resets its query; flushSync puts it in the DOM before showModal focuses it.
  const openPalette = () => { flushSync(() => setOpened((n) => n + 1)); dialog.current.showModal(); };
  useEffect(() => {
    const onKey = (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); if (dialog.current.open) dialog.current.close(); else openPalette(); } };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  return (
    <>
      <div className="widgets">
        <section className="panel">
          <h2>Tabs</h2>
          <Tabs tabs={TABS} />
          <p className="muted">Arrow keys move between tabs and activate them; Home and End jump.</p>
        </section>
        <section className="panel">
          <h2>Combobox</h2>
          <div className="combobox"><Combobox id="cb" listId="cb-list" label="Pick a framework" placeholder="Type to filter" options={FRAMEWORKS} onSelect={setChosen} /></div>
          <p id="cb-result" className="muted">{chosen ? `Chosen: ${chosen.label} (${chosen.hint}).` : 'Nothing chosen yet.'}</p>
        </section>
        <section className="panel">
          <h2>Menu button</h2>
          <Menu id="mb" menuId="mb-menu" items={['Rename', 'Duplicate', 'Archive', 'Delete']} />
          <p className="muted">Arrow keys, Home, End, typeahead, Escape returns focus, clicking outside closes.</p>
        </section>
        <section className="panel">
          <h2>Command palette</h2>
          <p>Press <kbd>Ctrl</kbd>+<kbd>K</kbd> (or <kbd>⌘</kbd>+<kbd>K</kbd>) anywhere on this page. It is the combobox above inside a modal dialog, listing every page of this site.</p>
          <button id="open-palette" className="btn" type="button" onClick={openPalette}>Open the palette</button>
        </section>
      </div>
      <dialog id="palette" ref={dialog} className="palette" onClick={(e) => { if (e.target === dialog.current) dialog.current.close(); }}>
        <div className="dialog__body combobox combobox--static">
          <Combobox key={opened} id="palette-input" listId="palette-list" label="Go to a page" labelHidden placeholder="Go to a page" options={PAGES} onSelect={(o) => { dialog.current.close(); location.href = o.href; }} />
        </div>
      </dialog>
    </>
  );
}

mount(
  <Layout pattern="components" variant="heavy">
    <>
      <h1>Custom widgets</h1>
      <p>The widgets component libraries exist for, written against the ARIA authoring patterns as three React components: selection and openness are state, focus and the active option stay in the DOM and refs. Headless libraries (Radix, React Aria, Headless UI, Ark) package exactly this.</p>
    </>
    <Widgets />
  </Layout>,
);
