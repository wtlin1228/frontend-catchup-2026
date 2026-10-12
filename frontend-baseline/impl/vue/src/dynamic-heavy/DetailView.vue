<script setup>
import { computed, nextTick, watch, useTemplateRef } from 'vue';
import { useRoute } from 'vue-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import { toast } from '@baseline/src/lib/toast.js';
import { postQuery, relatedQuery, request, HttpError, useTitle, lastList } from './data.js';
import NotFound from './NotFound.vue';

const route = useRoute();
const client = useQueryClient();
const id = computed(() => String(route.params.id));
const post = useQuery(computed(() => postQuery(id.value)));
const related = useQuery(computed(() => ({ ...relatedQuery(post.data.value?.tags[0] ?? ''), enabled: Boolean(post.data.value) }))); // dependent: the waterfall
const others = computed(() => related.data.value?.items.filter((p) => p.id !== post.data.value.id).slice(0, 3) ?? []);
const title = useTemplateRef('title');
useTitle(computed(() => post.data.value?.title ?? 'Loading…'));
watch(() => post.data.value, async (value) => { if (value) { await nextTick(); title.value?.focus({ preventScroll: true }); } });
const formatDate = (iso) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(iso));
const prefetch = (pid) => client.prefetchQuery(postQuery(String(pid)));

// Optimistic like: write the cache first, roll back from the snapshot on failure, refetch after.
const key = computed(() => ['post', id.value]);
const like = useMutation({
  mutationFn: () => request(`/api/posts/${id.value}/like`, { method: 'POST', body: '{}' }),
  onMutate: async () => {
    await client.cancelQueries({ queryKey: key.value });
    const before = client.getQueryData(key.value);
    client.setQueryData(key.value, (p) => ({ ...p, liked: !p.liked, likes: p.likes + (p.liked ? -1 : 1) }));
    return { before };
  },
  onError: (err, _vars, context) => { client.setQueryData(key.value, context.before); toast(err.message || 'Could not save your like', { type: 'error' }); },
  onSuccess: (result) => client.setQueryData(key.value, (p) => ({ ...p, ...result })),
  onSettled: () => client.invalidateQueries({ queryKey: key.value }),
});
</script>

<template>
  <article v-if="post.isPending.value" class="post" aria-busy="true">
    <div class="skeleton" style="width: 70%; height: 2rem"></div>
    <div v-for="i in 3" :key="i" class="skeleton" style="width: 100%; height: 4rem; margin-top: 1rem"></div>
  </article>
  <NotFound v-else-if="post.isError.value && post.error.value instanceof HttpError && post.error.value.status === 404" />
  <div v-else-if="post.isError.value" class="notice notice--error" role="alert">
    <p><strong>Could not load this post.</strong> {{ post.error.value instanceof HttpError ? `The server answered ${post.error.value.status}.` : 'The request failed before the server answered.' }}</p>
    <button class="btn btn--sm" type="button" @click="post.refetch()">Try again</button>
  </div>
  <article v-else class="post">
    <p><RouterLink :to="lastList">Back to all posts</RouterLink></p>
    <h2 ref="title" class="post__title" tabindex="-1">{{ post.data.value.title }}</h2>
    <p class="post-meta muted">
      <span>{{ post.data.value.author }}</span>
      <relative-time :datetime="post.data.value.date">{{ formatDate(post.data.value.date) }}</relative-time>
      <span>{{ post.data.value.readingMinutes }} min read</span>
      <span class="post-meta__tags"><RouterLink v-for="tag in post.data.value.tags" :key="tag" class="tag" :to="{ path: '/', query: { q: tag } }">{{ tag }}</RouterLink></span>
    </p>
    <p><button class="btn btn--sm" type="button" :aria-pressed="post.data.value.liked" @click="like.mutate()">{{ post.data.value.liked ? 'Liked' : 'Like' }} ({{ post.data.value.likes }})</button></p>
    <div class="post__body"><p v-for="(text, i) in post.data.value.body.split('\n\n')" :key="i">{{ text }}</p></div>
    <h3>Related</h3>
    <div class="post-related">
      <p v-if="related.isPending.value" class="muted">Loading related posts…</p>
      <p v-else-if="related.isError.value" class="muted">Related posts are unavailable right now.</p>
      <ul v-else-if="others.length" class="post-related__list"><li v-for="p in others" :key="p.id"><RouterLink :to="`/posts/${p.id}`" @mouseenter="prefetch(p.id)" @focus="prefetch(p.id)">{{ p.title }}</RouterLink></li></ul>
      <p v-else class="muted">No other post shares this tag.</p>
    </div>
  </article>
</template>
