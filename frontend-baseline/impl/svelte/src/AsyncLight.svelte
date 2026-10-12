<script>
  import { tick, untrack } from 'svelte';
  import Layout from './Layout.svelte';
  import TagPosts from './async-light/TagPosts.svelte';
  import '@baseline/src/pages/common-2.css';

  const TAGS = ['rendering', 'state', 'forms', 'performance', 'routing'];
  const t0 = performance.now();
  let selected = $state(TAGS[0]); // the tab bar: updates at once
  let tag = $state(TAGS[0]); // the panel: changed in a later batch, since a batch that starts async work is held back whole
  let keep = $state(true);
  let log = $state([]);
  let shown = $state(TAGS[0]);
  const busy = $derived(keep && shown !== selected);
  // Called from effects inside the parts: untrack, or reading `log` there would make every part's effect depend on the log it writes.
  const add = (text, cls = '') => untrack(() => { log = [{ text: `${((performance.now() - t0) / 1000).toFixed(2)}s ${text}`, cls }, ...log]; });
  const naive = async (tag) => { const { items } = await (await fetch(`/api/posts?tag=${tag}&limit=5`)).json(); add(`${tag}: ${items.length} posts painted`, 'ok'); return items; };
</script>

<Layout pattern="async" variant="light">
  {#snippet header()}
    <h1>Tabs that wait</h1>
    <p>Switching a tab fetches its posts. In naive mode an <code>{'{#await}'}</code> block shows its pending branch on every switch. In transition mode the list is an async <code>$derived</code> inside a <code>&lt;svelte:boundary&gt;</code>: the old list stays, dimmed by <code>$effect.pending()</code>, until the new one is ready, and a stale result never commits. Click between tabs quickly to see the difference.</p>
  {/snippet}
  <p><label class="switch"><input type="checkbox" id="transition" bind:checked={keep} /> Keep the old content while loading (transition)</label></p>
  <div class="tabbar" role="tablist" id="tabs" aria-label="Tags">
    {#each TAGS as t (t)}
      <button role="tab" type="button" aria-selected={t === selected} aria-busy={busy && t === selected ? 'true' : undefined} onclick={async () => { selected = t; await tick(); tag = t; }}>{t}</button>
    {/each}
  </div>
  {#if keep}
    <svelte:boundary>
      {#snippet pending()}<div id="panel" role="tabpanel"><p class="skeleton" style="height: 8rem">&nbsp;</p></div>{/snippet}
      <div id="panel" role="tabpanel" class:stale={$effect.pending() > 0}>
        <TagPosts {tag} log={add} onPainted={(painted) => (shown = painted)} />
      </div>
    </svelte:boundary>
  {:else}
    <div id="panel" role="tabpanel">
      {#await naive(tag)}
        <p class="skeleton" style="height: 8rem">&nbsp;</p>
      {:then items}
        {#if items.length}<ul class="stack">{#each items as p (p.id)}<li><a href="/dynamic/heavy.html#/posts/{p.id}">{p.title}</a></li>{/each}</ul>{:else}<p class="muted">No posts with this tag.</p>{/if}
      {:catch err}
        <p class="notice notice--error">Could not load {tag}: {err.message}</p>
      {/await}
    </div>
  {/if}
  <h2 style="margin-top: var(--space-6)">Log</h2>
  <ol id="log" class="log-list">{#each log as entry, i (log.length - i)}<li class={entry.cls}>{entry.text}</li>{/each}</ol>
</Layout>
