<script>
  // Pattern 3 heavy in plain Svelte: no router ships with Svelte, so the baseline's hash router is one rune module
  // (router.svelte.js); the cache, prefetch and invalidation stay the baseline's api.js, which Svelte does not
  // replace (the sheet's alternative is TanStack Query's Svelte adapter). The views are one component each.
  import Layout from './Layout.svelte';
  import { route } from './dynamic-heavy/router.svelte.js';
  import ListView from './dynamic-heavy/ListView.svelte';
  import DetailView from './dynamic-heavy/DetailView.svelte';
  import NewPostView from './dynamic-heavy/NewPostView.svelte';
  import NotFound from './dynamic-heavy/NotFound.svelte';
  import '@baseline/src/lib/elements.js';
  import '@baseline/src/pages/dynamic-heavy.css';
</script>

<Layout pattern="dynamic" variant="heavy">
  {#snippet header()}
    <h1>Posts</h1>
    <p>A small single-page app inside a multi-page site, with a hash router written as a rune module and the baseline's cache as the data layer. The URL hash carries the route and the search query; data comes from <code>/api/posts</code> with artificial latency so loading states stay visible. The like button updates optimistically and rolls back when the flaky endpoint fails.</p>
  {/snippet}
  <p id="route-announcer" class="visually-hidden" aria-live="polite"></p>
  <div id="app">
    {#if route.name === 'list'}<ListView />
    {:else if route.name === 'post'}{#key route.params.id}<DetailView />{/key}
    {:else if route.name === 'new'}<NewPostView />
    {:else}<NotFound />{/if}
  </div>
</Layout>
