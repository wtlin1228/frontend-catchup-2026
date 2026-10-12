<script setup>
import { reactive, onMounted } from 'vue';
import { getJSON, postJSON } from '@baseline/src/lib/api.js';
import { toast } from '@baseline/src/lib/toast.js';
const props = defineProps({ id: Number });
const emit = defineEmits(['ready', 'log', 'lane', 'retry']);
const post = reactive(await getJSON(`/api/posts/${props.id}`));
onMounted(() => emit('ready', 'post'));
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
  <p><strong>{{ post.title }}</strong></p>
  <p class="muted">{{ post.excerpt }}</p>
  <button class="btn btn--sm" type="button" @click="like">{{ post.liked ? 'Liked' : 'Like' }} ({{ post.likes }})</button>
</template>
