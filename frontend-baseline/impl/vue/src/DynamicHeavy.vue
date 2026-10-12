<script setup>
// Pattern 3 heavy in Vue's own terms: Vue Router on hash history (as in the baseline) for the routes and the URL
// state, TanStack Query for Vue as the cache, prefetching, invalidation and the optimistic like. The baseline's
// router.js and api.js disappear; the rest is the same page.
import Layout from './Layout.vue';
import '@baseline/src/lib/elements.js';
import '@baseline/src/pages/dynamic-heavy.css';
</script>

<template>
  <Layout pattern="dynamic" variant="heavy">
    <template #header>
      <h1>Posts</h1>
      <p>A small single-page app inside a multi-page site, with Vue Router on hash history and TanStack Query as the data layer. The URL hash carries the route and the search query; data comes from <code>/api/posts</code> with artificial latency so loading states stay visible. The like button updates optimistically and rolls back when the flaky endpoint fails.</p>
    </template>
    <p id="route-announcer" class="visually-hidden" aria-live="polite"></p>
    <div id="app"><RouterView /></div>
  </Layout>
</template>
