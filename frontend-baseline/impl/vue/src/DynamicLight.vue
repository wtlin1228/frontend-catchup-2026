<script setup>
import { ref, watch, onUnmounted } from 'vue';
import Layout from './Layout.vue';

const formatDate = (iso) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(iso));
const status = ref('loading');
const items = ref([]);
const error = ref(null);
const attempt = ref(0);
let controller = null;

// A watcher that runs immediately owns the request; bumping `attempt` re-runs it for "Try again",
// and the previous request is aborted first, as the effect cleanup does in the other ports.
watch(attempt, () => {
  controller?.abort();
  controller = new AbortController();
  status.value = 'loading';
  fetch('/api/posts?limit=6', { signal: controller.signal })
    .then((res) => { if (!res.ok) throw new Error(`The server answered ${res.status}`); return res.json(); })
    .then((data) => { items.value = data.items; status.value = 'done'; })
    .catch((err) => { if (err.name !== 'AbortError') { error.value = err; status.value = 'error'; } });
}, { immediate: true });
onUnmounted(() => controller?.abort());
</script>

<template>
  <Layout pattern="dynamic" variant="light">
    <template #header>
      <h1>Latest posts</h1>
      <p>The smallest dynamic page: request <code>/api/posts</code>, show a loading state, render the list, handle failure. No router, no cache, no URL state. The state is three refs; the request lives in one immediate watcher that aborts its predecessor.</p>
    </template>
    <div v-if="status === 'loading'" id="list" aria-busy="true"><p class="muted">Loading posts…</p></div>
    <div v-else-if="status === 'error'" id="list">
      <div class="notice notice--error" role="alert">
        <p>Could not load posts. {{ error.message }}.</p>
        <button class="btn btn--sm" type="button" @click="attempt++">Try again</button>
      </div>
    </div>
    <div v-else id="list">
      <ul class="stack">
        <li v-for="post in items" :key="post.id">
          <a :href="`/dynamic/heavy.html#/posts/${post.id}`">{{ post.title }}</a>
          <p class="muted" style="margin-bottom: 0">{{ post.author }}, {{ formatDate(post.date) }}</p>
        </li>
      </ul>
    </div>
  </Layout>
</template>
