<script setup>
import { ref } from 'vue';
import Layout from './Layout.vue';
import TagPosts from './async-light/TagPosts.vue';
import '@baseline/src/pages/common-2.css';

const TAGS = ['rendering', 'state', 'forms', 'performance', 'routing'];
const t0 = performance.now();
const selected = ref(TAGS[0]);
const keep = ref(true);
const busy = ref(false);
const log = ref([]);
const add = (text, cls = '') => log.value.unshift({ text: `${((performance.now() - t0) / 1000).toFixed(2)}s ${text}`, cls });
const painted = (tag, n) => add(`${tag}: ${n} posts painted`, 'ok');
</script>

<template>
  <Layout pattern="async" variant="light">
    <template #header>
      <h1>Tabs that wait</h1>
      <p>Switching a tab mounts an async component for it inside <code>&lt;Suspense&gt;</code> (still marked experimental in 3.5). In naive mode the boundary's <code>timeout</code> is zero, so the fallback shows on every switch. In transition mode the old list stays, dimmed while the boundary is pending, until the new one is ready, and a newer switch replaces a pending one: the latest wins. Click between tabs quickly to see the difference.</p>
    </template>
    <p><label class="switch"><input type="checkbox" id="transition" v-model="keep" /> Keep the old content while loading (transition)</label></p>
    <div class="tabbar" role="tablist" id="tabs" aria-label="Tags">
      <button v-for="t in TAGS" :key="t" role="tab" type="button" :aria-selected="t === selected" :aria-busy="busy && t === selected ? 'true' : undefined" @click="selected = t">{{ t }}</button>
    </div>
    <div id="panel" role="tabpanel" :class="{ stale: keep && busy }">
      <Suspense :key="keep ? 'keep' : 'naive'" :timeout="keep ? undefined : 0" @pending="busy = true" @resolve="busy = false">
        <template #fallback><p class="skeleton" style="height: 8rem">&nbsp;</p></template>
        <TagPosts :key="selected" :tag="selected" @painted="painted" />
      </Suspense>
    </div>
    <h2 style="margin-top: var(--space-6)">Log</h2>
    <ol id="log" class="log-list"><li v-for="(entry, i) in log" :key="log.length - i" :class="entry.cls">{{ entry.text }}</li></ol>
  </Layout>
</template>
