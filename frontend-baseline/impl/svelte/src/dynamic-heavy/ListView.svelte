<script>
  import { untrack } from 'svelte';
  import { getJSON, prefetch, HttpError } from '@baseline/src/lib/api.js';
  import { route, lastList, href, navigate, announce } from './router.svelte.js';

  const PAGE_SIZE = 8;
  const q = $derived(route.query.get('q') ?? '');
  const page = $derived(Math.max(1, Number(route.query.get('page')) || 1));
  let input = $state(route.query.get('q') ?? '');
  let status = $state('loading');
  let data = $state(null);
  let error = $state(null);
  let timer;
  const formatDate = (iso) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(iso));

  // One effect per route state: it fetches, and its cleanup aborts the request a newer navigation made stale.
  $effect(() => {
    const url = `/api/posts?${new URLSearchParams({ q, page, limit: PAGE_SIZE })}`;
    announce(q ? `Search "${q}"` : 'All posts');
    lastList.href = location.hash || '#/';
    const controller = new AbortController();
    untrack(() => { status = data ? 'refreshing' : 'loading'; }); // reading `data` here must not make the effect depend on it
    getJSON(url, { signal: controller.signal })
      .then((result) => { data = result; error = null; status = 'done'; })
      .catch((err) => { if (controller.signal.aborted) return; error = err; status = 'error'; });
    return () => controller.abort();
  });
  // The search is written to the URL as you type (debounced, replacing history); the effect above follows the URL.
  function onInput() {
    clearTimeout(timer);
    timer = setTimeout(() => { if (input.trim() !== q) navigate('/', { q: input.trim() }, { replace: true }); }, 250);
  }
  const pageHref = (n) => href('/', { q, page: n });
</script>

<div class="posts-layout">
  <aside class="posts-side">
    <input type="search" class="input" bind:value={input} oninput={onInput} placeholder="Search titles and tags" aria-label="Search posts" autocomplete="off" />
    <p class="muted posts-side__hint">The search is written to the URL as you type.</p>
    <a class="btn btn--primary" href="#/new">New post</a>
  </aside>
  <div class="post-results" aria-busy={status === 'loading' || status === 'refreshing' || undefined}>
    {#if status === 'loading'}
      {#each { length: PAGE_SIZE } as _, i (i)}
        <div class="post-card post-card--skeleton" aria-hidden="true">
          <div class="skeleton" style="width: 60%; height: 1.4rem"></div>
          <div class="skeleton" style="width: 100%; height: 1rem; margin-top: 0.75rem"></div>
          <div class="skeleton" style="width: 40%; height: 0.9rem; margin-top: 0.5rem"></div>
        </div>
      {/each}
    {:else if status === 'error'}
      <div class="notice notice--error" role="alert">
        <p><strong>Could not load posts.</strong> {error instanceof HttpError ? `The server answered ${error.status}.` : 'The request failed before the server answered.'}</p>
        <button class="btn btn--sm" type="button" onclick={() => navigate('/', { q, page }, { replace: true })}>Try again</button>
      </div>
    {:else if !data.items.length}
      <div class="notice"><p>No posts match "{q}".</p><a href="#/">Clear the search</a></div>
    {:else}
      {#each data.items as post (post.id)}
        <article class="post-card">
          <h2 class="post-card__title"><a href="#/posts/{post.id}" onmouseenter={() => prefetch(`/api/posts/${post.id}`)} onfocus={() => prefetch(`/api/posts/${post.id}`)}>{post.title}</a></h2>
          <p class="post-card__excerpt">{post.excerpt}</p>
          <p class="post-meta muted">
            <span>{post.author}</span>
            <relative-time datetime={post.date}>{formatDate(post.date)}</relative-time>
            <span>{post.readingMinutes} min read</span>
            <span class="post-meta__tags">{#each post.tags as tag (tag)}<a class="tag" href={href('/', { q: tag })}>{tag}</a>{/each}</span>
          </p>
        </article>
      {/each}
      <nav class="pager" aria-label="Pagination">
        <a class="btn btn--sm" href={pageHref(page - 1)} aria-disabled={page <= 1 ? 'true' : undefined}>Previous</a>
        <span class="muted">Page {data.page} of {data.totalPages}, {data.total} posts</span>
        <a class="btn btn--sm" href={pageHref(page + 1)} aria-disabled={page >= data.totalPages ? 'true' : undefined}>Next</a>
      </nav>
    {/if}
  </div>
</div>
