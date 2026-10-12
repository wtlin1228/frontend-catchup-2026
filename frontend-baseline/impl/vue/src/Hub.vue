<script setup>
import Layout from './Layout.vue';
const PORTED = [
  ['Static content', '/static/light.html', null],
  ['Forms', '/forms/light.html', null],
  ['Dynamic data and routing', '/dynamic/light.html', null],
  ['Client state', '/state/light.html', '/state/heavy.html'],
  ['Real-time updates', null, '/realtime/heavy.html'],
];
</script>

<template>
  <Layout pattern="index" variant="">
    <template #header>
      <h1>Vue port</h1>
      <p>The same pages as the baseline, written in Vue 3.5 (Composition API, <code>&lt;script setup&gt;</code>) with Vite 8. Same mock API, same stylesheet, same ids, so the baseline's smoke tests and measurement script run against this build unchanged. Pages not listed here are not ported yet; their links lead nowhere in this build.</p>
    </template>
    <ul class="stack">
      <li v-for="[name, light, heavy] in PORTED" :key="name">{{ name }}: <a v-if="light" :href="light">light</a><template v-if="light && heavy"> and </template><a v-if="heavy" :href="heavy">heavy</a></li>
    </ul>
    <p class="muted">Build it with <code>pnpm build</code>, then <code>pnpm weight</code> prints shipped bytes per page next to the baseline's.</p>
  </Layout>
</template>
