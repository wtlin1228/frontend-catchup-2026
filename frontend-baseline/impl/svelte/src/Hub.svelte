<script>
  import Layout from './Layout.svelte';
  const PORTED = [
    ['Static content', '/static/light.html', null],
    ['Forms', '/forms/light.html', '/forms/heavy.html'],
    ['Dynamic data and routing', '/dynamic/light.html', '/dynamic/heavy.html'],
    ['Client state', '/state/light.html', '/state/heavy.html'],
    ['Real-time updates', null, '/realtime/heavy.html'],
    ['Data grid', null, '/table/heavy.html'],
    ['Composite widgets', null, '/components/heavy.html'],
    ['Motion', null, '/motion/heavy.html'],
    ['Async consistency', '/async/light.html', '/async/heavy.html'],
  ];
</script>

<Layout pattern="index" variant="">
  {#snippet header()}
    <h1>Svelte port</h1>
    <p>The same pages as the baseline, written in Svelte 5 (runes) with Vite 8. Same mock API, same stylesheet, same ids, so the baseline's smoke tests and measurement script run against this build unchanged. Pages not listed here are not ported yet; their links lead nowhere in this build.</p>
  {/snippet}
  <ul class="stack">
    {#each PORTED as [name, light, heavy] (name)}
      <li>{name}: {#if light}<a href={light}>light</a>{/if}{#if light && heavy} and {/if}{#if heavy}<a href={heavy}>heavy</a>{/if}</li>
    {/each}
  </ul>
  <p class="muted">Build it with <code>pnpm build</code>, then <code>pnpm weight</code> prints shipped bytes per page next to the baseline's.</p>
</Layout>
