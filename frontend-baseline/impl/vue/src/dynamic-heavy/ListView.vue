<script setup>
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/vue-query';
import { PAGE_SIZE, postsQuery, postQuery, HttpError, useTitle, lastList } from './data.js';

const route = useRoute();
const router = useRouter();
const client = useQueryClient();
const q = computed(() => String(route.query.q ?? ''));
const page = computed(() => Math.max(1, Number(route.query.page) || 1));
const input = ref(q.value);
useTitle(computed(() => (q.value ? `Search "${q.value}"` : 'All posts')));
watch(() => route.fullPath, (path) => { lastList.value = path; }, { immediate: true });
// The search is written to the URL as you type (debounced, replacing history); the query follows the URL.
let timer;
watch(input, (value) => { clearTimeout(timer); timer = setTimeout(() => { if (value.trim() !== q.value) router.replace({ path: '/', query: value.trim() ? { q: value.trim() } : {} }); }, 250); });
const list = useQuery(computed(() => ({ ...postsQuery(q.value, page.value), placeholderData: keepPreviousData })));
const prefetch = (id) => client.prefetchQuery(postQuery(String(id)));
const formatDate = (iso) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(iso));
const pageTo = (n) => ({ path: '/', query: { ...(q.value && { q: q.value }), page: n } });
</script>

<template>
  <div class="posts-layout">
    <aside class="posts-side">
      <input type="search" class="input" v-model="input" placeholder="Search titles and tags" aria-label="Search posts" autocomplete="off" />
      <p class="muted posts-side__hint">The search is written to the URL as you type.</p>
      <RouterLink class="btn btn--primary" to="/new">New post</RouterLink>
    </aside>
    <div class="post-results" :aria-busy="list.isFetching.value || undefined">
      <template v-if="list.isPending.value">
        <div v-for="i in PAGE_SIZE" :key="i" class="post-card post-card--skeleton" aria-hidden="true">
          <div class="skeleton" style="width: 60%; height: 1.4rem"></div>
          <div class="skeleton" style="width: 100%; height: 1rem; margin-top: 0.75rem"></div>
          <div class="skeleton" style="width: 40%; height: 0.9rem; margin-top: 0.5rem"></div>
        </div>
      </template>
      <div v-else-if="list.isError.value" class="notice notice--error" role="alert">
        <p><strong>Could not load posts.</strong> {{ list.error.value instanceof HttpError ? `The server answered ${list.error.value.status}.` : 'The request failed before the server answered.' }}</p>
        <button class="btn btn--sm" type="button" @click="list.refetch()">Try again</button>
      </div>
      <div v-else-if="!list.data.value.items.length" class="notice"><p>No posts match "{{ q }}".</p><RouterLink to="/">Clear the search</RouterLink></div>
      <template v-else>
        <article v-for="post in list.data.value.items" :key="post.id" class="post-card">
          <h2 class="post-card__title"><RouterLink :to="`/posts/${post.id}`" @mouseenter="prefetch(post.id)" @focus="prefetch(post.id)">{{ post.title }}</RouterLink></h2>
          <p class="post-card__excerpt">{{ post.excerpt }}</p>
          <p class="post-meta muted">
            <span>{{ post.author }}</span>
            <relative-time :datetime="post.date">{{ formatDate(post.date) }}</relative-time>
            <span>{{ post.readingMinutes }} min read</span>
            <span class="post-meta__tags"><RouterLink v-for="tag in post.tags" :key="tag" class="tag" :to="{ path: '/', query: { q: tag } }">{{ tag }}</RouterLink></span>
          </p>
        </article>
        <nav class="pager" aria-label="Pagination">
          <RouterLink class="btn btn--sm" :to="pageTo(page - 1)" :aria-disabled="page <= 1 ? 'true' : undefined">Previous</RouterLink>
          <span class="muted">Page {{ list.data.value.page }} of {{ list.data.value.totalPages }}, {{ list.data.value.total }} posts</span>
          <RouterLink class="btn btn--sm" :to="pageTo(page + 1)" :aria-disabled="page >= list.data.value.totalPages ? 'true' : undefined">Next</RouterLink>
        </nav>
      </template>
    </div>
  </div>
</template>
