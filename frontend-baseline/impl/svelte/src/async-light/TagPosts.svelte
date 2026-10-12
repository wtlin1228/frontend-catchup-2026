<script>
  // An async derived: the component suspends to the nearest <svelte:boundary> with a pending snippet on first render;
  // after that, the old value stays on screen while a new one loads, and a result for a stale tag never commits.
  let { tag, log, onPainted } = $props();
  const items = $derived(await fetch(`/api/posts?tag=${tag}&limit=5`).then((r) => r.json()).then((d) => d.items));
  $effect(() => { log(`${tag}: ${items.length} posts painted`, 'ok'); onPainted(tag); });
</script>

{#if items.length}
  <ul class="stack">{#each items as p (p.id)}<li><a href="/dynamic/heavy.html#/posts/{p.id}">{p.title}</a></li>{/each}</ul>
{:else}
  <p class="muted">No posts with this tag.</p>
{/if}
