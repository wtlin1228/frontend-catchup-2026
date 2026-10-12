<script>
  import { flushSync, untrack } from 'svelte';
  import Layout from './Layout.svelte';
  import PostPart from './async-heavy/PostPart.svelte';
  import RelatedPart from './async-heavy/RelatedPart.svelte';
  import StatusPart from './async-heavy/StatusPart.svelte';
  import '@baseline/src/pages/common-2.css';

  let t0 = performance.now();
  let id = $state(3);
  let atomic = $state(true);
  let attempts = $state({ post: 0, related: 0, status: 0 });
  let pendingLikes = $state(0);
  let loading = $state(false); // the stale marker, kept until the latest request has committed
  let log = $state([]);
  let version = 0;
  let ready = 0;
  // Called from effects inside the parts: untrack, or reading `log` there would make every part's effect depend on the log it writes.
  const add = (text, cls = '') => untrack(() => { log = [{ text: `${((performance.now() - t0) / 1000).toFixed(2)}s ${text}`, cls }, ...log]; });
  const lane = (delta) => { pendingLikes += delta; };
  // The version check the baseline does by hand, in the async-derived world: a part awaits its request through
  // `current`, and a request that was superseded never resolves, so its batch never commits. Without it, each batch
  // committed when its own promises landed and an older post could overwrite the newer one. A batch that starts
  // async work is held back as a whole, so the stale marker is flushed on its own first.
  const current = async (promise) => {
    const v = version;
    const value = await promise;
    if (v !== version) await new Promise(() => {});
    return value;
  };
  function load(next) {
    if (loading) add(`version ${version}: superseded, nothing painted`, 'err');
    t0 = performance.now();
    ready = 0;
    flushSync(() => { loading = true; }); // also evaluates a previous change's deriveds, so the version bumps after it
    const v = ++version;
    id = next;
    add(`load post ${next}, request version ${v}`);
  }
  // Each part reports from an effect, after its boundary committed; the third report is the paint.
  function settle(name, ok = true) {
    add(ok ? `${name}: ready` : name, ok ? 'ok' : 'err');
    if (++ready === 3 && loading) { loading = false; add(atomic ? 'committed in one paint' : 'all sources settled'); }
  }
  const retry = (name) => { add(`retry ${name}`); attempts[name]++; };
  const PARTS = [['post', 'Post'], ['related', 'Related'], ['status', 'Status (flaky)']];
</script>

{#snippet skeleton()}<section class="panel stack"><p class="skeleton" style="height: 3rem">&nbsp;</p></section>{/snippet}
{#snippet part(name)}
  {#if name === 'post'}<PostPart {id} {current} ready={settle} log={add} {lane} />
  {:else if name === 'related'}<RelatedPart {id} {current} ready={settle} />
  {:else}<StatusPart {id} attempt={attempts.status} {current} ready={settle} />{/if}
{/snippet}

<Layout pattern="async" variant="heavy">
  {#snippet header()}
    <h1>Composed view</h1>
    <p>One screen built from three sources: the post, related posts (which depend on the post) and a status call that fails half the time. Each part is an async <code>$derived</code>. Atomic mode puts the three inside one <code>&lt;svelte:boundary&gt;</code> with a pending snippet: the old view stays, dimmed by <code>$effect.pending()</code>, until all have resolved, then they commit together, and a stale answer never commits. Stream mode gives each part its own boundary, recreated per post. A failed part shows its boundary's <code>failed</code> snippet and retries alone; likes apply in an optimistic lane and roll back when the server refuses.</p>
  {/snippet}
  <div class="cluster" style="margin-bottom: var(--space-4)">
    <label>Post <select id="post" class="select" value={id} onchange={(e) => load(Number(e.target.value))}>{#each { length: 14 } as _, i (i)}<option value={i + 1}>Post {i + 1}</option>{/each}</select></label>
    <label class="switch"><input type="checkbox" id="atomic" bind:checked={atomic} onchange={() => load(id)} /> Atomic commit</label>
    <span id="lane" class="muted">{pendingLikes ? `${pendingLikes} optimistic update${pendingLikes === 1 ? '' : 's'} pending` : ''}</span>
  </div>
  {#if atomic}
    <svelte:boundary>
      {#snippet pending()}<div id="view" class="two-col">{#each PARTS as [name, title] (name)}<section class="panel stack"><h2 style="font-size: 1rem; margin: 0">{title}</h2>{@render skeleton()}</section>{/each}</div>{/snippet}
      <div id="view" class="two-col" class:stale={loading}>
        {#each PARTS as [name, title] (name)}
          <!-- Keyed by post, or a part that failed for the previous post keeps showing its failure: a boundary leaves its
               failed state only through reset(). $effect.pending() counts the promises of the boundary it is read in, and
               these per-part error boundaries are where the deriveds pend, so the view's marker is the flag above. -->
          {#key id}
            <svelte:boundary onerror={(e) => settle(`${name}: failed (${e.message})`, false)}>
              {#snippet failed(error, reset)}
                <section class="panel stack"><h2 style="font-size: 1rem; margin: 0">{title}</h2><div class="notice notice--error"><p>Failed: {error.message}</p><button class="btn btn--sm" type="button" onclick={reset}>Retry {name} only</button></div></section>
              {/snippet}
              <section class="panel stack">
                <h2 style="font-size: 1rem; margin: 0">{title}</h2>
                {@render part(name)}
              </section>
            </svelte:boundary>
          {/key}
        {/each}
      </div>
    </svelte:boundary>
  {:else}
    <div id="view" class="two-col">
      {#each PARTS as [name, title] (name)}
        {#key id}
          <svelte:boundary pending={skeleton} onerror={(e) => settle(`${name}: failed (${e.message})`, false)}>
            {#snippet failed(error, reset)}
              <section class="panel stack"><h2 style="font-size: 1rem; margin: 0">{title}</h2><div class="notice notice--error"><p>Failed: {error.message}</p><button class="btn btn--sm" type="button" onclick={reset}>Retry {name} only</button></div></section>
            {/snippet}
            <section class="panel stack">
              <h2 style="font-size: 1rem; margin: 0">{title}</h2>
              {@render part(name)}
            </section>
          </svelte:boundary>
        {/key}
      {/each}
    </div>
  {/if}
  <h2 style="margin-top: var(--space-6)">Timeline</h2>
  <ol id="log" class="log-list">{#each log as entry, i (log.length - i)}<li class={entry.cls}>{entry.text}</li>{/each}</ol>
</Layout>
