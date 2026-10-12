<script setup>
import { ref, reactive, onMounted } from 'vue';
import { getJSON, postJSON } from '@baseline/src/lib/api.js';
import { toast } from '@baseline/src/lib/toast.js';
const props = defineProps({ id: Number });
const emit = defineEmits(['log', 'lane', 'ready']);
const fetchStatus = async () => {
  const res = await fetch('/api/flaky');
  if (!res.ok) throw new Error(`status answered ${res.status}`);
  return res.json();
};
// Atomic: one async setup awaits every source, so the <Suspense> above commits the three parts together, keeps the
// previous view until then and drops a pending view when the key changes again. The flaky source is caught, not thrown.
const [loaded, related, first] = await Promise.all([
  getJSON(`/api/posts/${props.id}`),
  getJSON(`/api/posts/${props.id}`).then(async (post) => (await getJSON(`/api/posts?tag=${encodeURIComponent(post.tags[0])}&limit=4`)).items.filter((p) => p.id !== post.id).slice(0, 3)),
  fetchStatus().then((value) => ({ value }), (error) => ({ error })),
]);
const post = reactive(loaded);
const status = ref(first);
const report = () => { if (status.value.error) emit('log', `status: failed (${status.value.error.message})`, 'err'); else emit('ready', 'status'); };
onMounted(() => { emit('ready', 'post'); emit('ready', 'related'); report(); });
async function retryStatus() {
  emit('log', 'retry status');
  status.value = null;
  status.value = await fetchStatus().then((value) => ({ value }), (error) => ({ error }));
  report();
}
// Optimistic lane: paint the intended result now, reconcile with the server later, roll back on refusal.
async function like() {
  const before = { liked: post.liked, likes: post.likes };
  Object.assign(post, { liked: !post.liked, likes: post.likes + (post.liked ? -1 : 1) });
  emit('lane', 1);
  try {
    Object.assign(post, await postJSON(`/api/posts/${post.id}/like`, {}));
    emit('log', 'like confirmed', 'ok');
  } catch (err) {
    Object.assign(post, before);
    emit('log', `like rolled back: ${err.message}`, 'err');
    toast('Like rolled back', { type: 'error' });
  } finally { emit('lane', -1); }
}
</script>

<template>
  <div id="view" class="two-col">
    <section class="panel stack">
      <h2 style="font-size: 1rem; margin: 0">Post</h2>
      <p><strong>{{ post.title }}</strong></p>
      <p class="muted">{{ post.excerpt }}</p>
      <button class="btn btn--sm" type="button" @click="like">{{ post.liked ? 'Liked' : 'Like' }} ({{ post.likes }})</button>
    </section>
    <section class="panel stack">
      <h2 style="font-size: 1rem; margin: 0">Related</h2>
      <ul><li v-for="p in related" :key="p.id">{{ p.title }}</li></ul>
    </section>
    <section class="panel stack">
      <h2 style="font-size: 1rem; margin: 0">Status (flaky)</h2>
      <p v-if="!status" class="skeleton" style="height: 3rem">&nbsp;</p>
      <div v-else-if="status.error" class="notice notice--error"><p>Failed: {{ status.error.message }}</p><button class="btn btn--sm" type="button" @click="retryStatus">Retry status only</button></div>
      <p v-else>Server value {{ status.value.value }}</p>
    </section>
  </div>
</template>
