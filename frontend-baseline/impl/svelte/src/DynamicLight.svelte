<script>
  import Layout from './Layout.svelte';

  const formatDate = (iso) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(iso));
  let status = $state('loading');
  let items = $state([]);
  let error = $state(null);
  let attempt = $state(0);

  // The effect owns the request and its cancellation; bumping `attempt` re-runs it for "Try again".
  $effect(() => {
    attempt;
    const controller = new AbortController();
    status = 'loading';
    fetch('/api/posts?limit=6', { signal: controller.signal })
      .then((res) => { if (!res.ok) throw new Error(`The server answered ${res.status}`); return res.json(); })
      .then((data) => { items = data.items; status = 'done'; })
      .catch((err) => { if (err.name !== 'AbortError') { error = err; status = 'error'; } });
    return () => controller.abort();
  });
</script>

<Layout pattern="dynamic" variant="light">
  {#snippet header()}
    <h1>Latest posts</h1>
    <p>The smallest dynamic page: request <code>/api/posts</code>, show a loading state, render the list, handle failure. No router, no cache, no URL state. The state is three runes; the request lives in one effect with its cleanup.</p>
  {/snippet}
  {#if status === 'loading'}
    <div id="list" aria-busy="true"><p class="muted">Loading posts…</p></div>
  {:else if status === 'error'}
    <div id="list">
      <div class="notice notice--error" role="alert">
        <p>Could not load posts. {error.message}.</p>
        <button class="btn btn--sm" type="button" onclick={() => attempt++}>Try again</button>
      </div>
    </div>
  {:else}
    <div id="list">
      <ul class="stack">
        {#each items as post (post.id)}
          <li>
            <a href="/dynamic/heavy.html#/posts/{post.id}">{post.title}</a>
            <p class="muted" style="margin-bottom: 0">{post.author}, {formatDate(post.date)}</p>
          </li>
        {/each}
      </ul>
    </div>
  {/if}
</Layout>
