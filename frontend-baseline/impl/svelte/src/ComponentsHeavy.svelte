<script>
  import Layout from './Layout.svelte';
  import { PATTERNS } from './patterns.js';
  import Tabs from './components-heavy/Tabs.svelte';
  import Combobox from './components-heavy/Combobox.svelte';
  import Menu from './components-heavy/Menu.svelte';
  import '@baseline/src/pages/components-heavy.css';

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
  let chosen = $state(null);
  let dialog = $state(null);
  let palette = $state(null); // the palette's Combobox instance: its exported reset() clears the query
  const openPalette = () => { palette.reset(); dialog.showModal(); };
  const onKey = (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); if (dialog.open) dialog.close(); else openPalette(); } };
</script>

<svelte:document onkeydown={onKey} />

<Layout pattern="components" variant="heavy">
  {#snippet header()}
    <h1>Custom widgets</h1>
    <p>The widgets component libraries exist for, written against the ARIA authoring patterns as three Svelte components: selection and openness are state, focus and the active option stay in the DOM and bound elements. Headless libraries (Bits UI, Melt UI) package exactly this.</p>
  {/snippet}
  <div class="widgets">
    <section class="panel">
      <h2>Tabs</h2>
      <Tabs tabs={TABS} />
      <p class="muted">Arrow keys move between tabs and activate them; Home and End jump.</p>
    </section>
    <section class="panel">
      <h2>Combobox</h2>
      <div class="combobox"><Combobox id="cb" listId="cb-list" label="Pick a framework" placeholder="Type to filter" options={FRAMEWORKS} onSelect={(o) => (chosen = o)} /></div>
      <p id="cb-result" class="muted">{chosen ? `Chosen: ${chosen.label} (${chosen.hint}).` : 'Nothing chosen yet.'}</p>
    </section>
    <section class="panel">
      <h2>Menu button</h2>
      <Menu id="mb" menuId="mb-menu" items={['Rename', 'Duplicate', 'Archive', 'Delete']} />
      <p class="muted">Arrow keys, Home, End, typeahead, Escape returns focus, clicking outside closes.</p>
    </section>
    <section class="panel">
      <h2>Command palette</h2>
      <p>Press <kbd>Ctrl</kbd>+<kbd>K</kbd> (or <kbd>⌘</kbd>+<kbd>K</kbd>) anywhere on this page. It is the combobox above inside a modal dialog, listing every page of this site.</p>
      <button id="open-palette" class="btn" type="button" onclick={openPalette}>Open the palette</button>
    </section>
  </div>
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
  <dialog id="palette" bind:this={dialog} class="palette" onclick={(e) => { if (e.target === dialog) dialog.close(); }}>
    <div class="dialog__body combobox combobox--static">
      <Combobox bind:this={palette} id="palette-input" listId="palette-list" label="Go to a page" labelHidden placeholder="Go to a page" options={PAGES} onSelect={(o) => { dialog.close(); location.href = o.href; }} />
    </div>
  </dialog>
</Layout>
