<script>
  import { getJSON, postJSON, prefetch, invalidate, HttpError } from '@baseline/src/lib/api.js';
  import { toast } from '@baseline/src/lib/toast.js';
  import { route, lastList, href, navigate, announce } from './router.svelte.js';
  import NotFound from './NotFound.svelte';

  let post = $state(null);
  let error = $state(null);
  let related = $state({ status: 'loading', items: [] });
  let title = $state(null);
  const formatDate = (iso) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(iso));

  // The post, then its related posts (a dependent request, the waterfall); a newer id aborts both.
  $effect(() => {
    const id = route.params.id;
    const controller = new AbortController();
    post = null; error = null; related = { status: 'loading', items: [] };
    announce('Loading…');
    (async () => {
      try {
        const loaded = await getJSON(`/api/posts/${id}`, { signal: controller.signal });
        if (controller.signal.aborted) return;
        post = loaded;
        announce(loaded.title);
        try {
          const data = await getJSON(`/api/posts?tag=${encodeURIComponent(loaded.tags[0])}&limit=4`, { signal: controller.signal });
          if (!controller.signal.aborted) related = { status: 'done', items: data.items.filter((p) => p.id !== loaded.id).slice(0, 3) };
        } catch { if (!controller.signal.aborted) related = { status: 'error', items: [] }; }
      } catch (err) { if (!controller.signal.aborted) error = err; }
    })();
    return () => controller.abort();
  });
  $effect(() => { if (post && title) title.focus({ preventScroll: true }); });

  // Optimistic update: flip the UI first, send the request, roll back if the server says no.
  async function like() {
    const before = { liked: post.liked, likes: post.likes };
    post = { ...post, liked: !post.liked, likes: post.likes + (post.liked ? -1 : 1) };
    try {
      post = { ...post, ...(await postJSON(`/api/posts/${post.id}/like`, {})) };
      invalidate(`/api/posts/${post.id}`);
    } catch (err) {
      post = { ...post, ...before };
      toast(err.message || 'Could not save your like', { type: 'error' });
    }
  }
</script>

{#if error instanceof HttpError && error.status === 404}
  <NotFound />
{:else if error}
  <div class="notice notice--error" role="alert">
    <p><strong>Could not load this post.</strong> {error instanceof HttpError ? `The server answered ${error.status}.` : 'The request failed before the server answered.'}</p>
    <button class="btn btn--sm" type="button" onclick={() => navigate('/posts/' + route.params.id, null, { replace: true })}>Try again</button>
  </div>
{:else if !post}
  <article class="post" aria-busy="true">
    <div class="skeleton" style="width: 70%; height: 2rem"></div>
    {#each [1, 2, 3] as i (i)}<div class="skeleton" style="width: 100%; height: 4rem; margin-top: 1rem"></div>{/each}
  </article>
{:else}
  <article class="post">
    <p><a href={lastList.href}>Back to all posts</a></p>
    <h2 bind:this={title} class="post__title" tabindex="-1">{post.title}</h2>
    <p class="post-meta muted">
      <span>{post.author}</span>
      <relative-time datetime={post.date}>{formatDate(post.date)}</relative-time>
      <span>{post.readingMinutes} min read</span>
      <span class="post-meta__tags">{#each post.tags as tag (tag)}<a class="tag" href={href('/', { q: tag })}>{tag}</a>{/each}</span>
    </p>
    <p><button class="btn btn--sm" type="button" aria-pressed={post.liked} onclick={like}>{post.liked ? 'Liked' : 'Like'} ({post.likes})</button></p>
    <div class="post__body">{#each post.body.split('\n\n') as text, i (i)}<p>{text}</p>{/each}</div>
    <h3>Related</h3>
    <div class="post-related">
      {#if related.status === 'loading'}<p class="muted">Loading related posts…</p>
      {:else if related.status === 'error'}<p class="muted">Related posts are unavailable right now.</p>
      {:else if related.items.length}<ul class="post-related__list">{#each related.items as p (p.id)}<li><a href="#/posts/{p.id}" onmouseenter={() => prefetch(`/api/posts/${p.id}`)}>{p.title}</a></li>{/each}</ul>
      {:else}<p class="muted">No other post shares this tag.</p>{/if}
    </div>
  </article>
{/if}
