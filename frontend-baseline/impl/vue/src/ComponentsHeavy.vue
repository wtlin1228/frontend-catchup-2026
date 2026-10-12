<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import Layout from './Layout.vue';
import { PATTERNS } from './patterns.js';
import Tabs from './components-heavy/Tabs.vue';
import Combobox from './components-heavy/Combobox.vue';
import Menu from './components-heavy/Menu.vue';
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
const chosen = ref(null);
const dialog = ref(null);
const palette = ref(null); // the palette's Combobox instance: its exposed reset() clears the query
const openPalette = () => { palette.value.reset(); dialog.value.showModal(); };
const onKey = (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); if (dialog.value.open) dialog.value.close(); else openPalette(); } };
onMounted(() => document.addEventListener('keydown', onKey));
onBeforeUnmount(() => document.removeEventListener('keydown', onKey));
</script>

<template>
  <Layout pattern="components" variant="heavy">
    <template #header>
      <h1>Custom widgets</h1>
      <p>The widgets component libraries exist for, written against the ARIA authoring patterns as three Vue components: selection and openness are state, focus and the active option stay in the DOM and template refs. Headless libraries (Reka UI, Ark UI, Headless UI) package exactly this.</p>
    </template>
    <div class="widgets">
      <section class="panel">
        <h2>Tabs</h2>
        <Tabs :tabs="TABS" />
        <p class="muted">Arrow keys move between tabs and activate them; Home and End jump.</p>
      </section>
      <section class="panel">
        <h2>Combobox</h2>
        <div class="combobox"><Combobox id="cb" list-id="cb-list" label="Pick a framework" placeholder="Type to filter" :options="FRAMEWORKS" @select="chosen = $event" /></div>
        <p id="cb-result" class="muted">{{ chosen ? `Chosen: ${chosen.label} (${chosen.hint}).` : 'Nothing chosen yet.' }}</p>
      </section>
      <section class="panel">
        <h2>Menu button</h2>
        <Menu id="mb" menu-id="mb-menu" :items="['Rename', 'Duplicate', 'Archive', 'Delete']" />
        <p class="muted">Arrow keys, Home, End, typeahead, Escape returns focus, clicking outside closes.</p>
      </section>
      <section class="panel">
        <h2>Command palette</h2>
        <p>Press <kbd>Ctrl</kbd>+<kbd>K</kbd> (or <kbd>⌘</kbd>+<kbd>K</kbd>) anywhere on this page. It is the combobox above inside a modal dialog, listing every page of this site.</p>
        <button id="open-palette" class="btn" type="button" @click="openPalette">Open the palette</button>
      </section>
    </div>
    <dialog id="palette" ref="dialog" class="palette" @click="(e) => { if (e.target === dialog) dialog.close(); }">
      <div class="dialog__body combobox combobox--static">
        <Combobox ref="palette" id="palette-input" list-id="palette-list" label="Go to a page" label-hidden placeholder="Go to a page" :options="PAGES" @select="(o) => { dialog.close(); location.href = o.href; }" />
      </div>
    </dialog>
  </Layout>
</template>
