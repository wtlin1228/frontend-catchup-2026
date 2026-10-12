<script>
  import Layout from './Layout.svelte';
  import '@baseline/src/pages/state-light.css';

  const KEY = 'todo:v1';
  const uid = () => `todo_${Math.random().toString(36).slice(2, 9)}`;
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) ?? '[]'); } catch { return []; } };

  let items = $state(load());
  let filter = $state('all');
  let draft = $state('');
  const shown = $derived(items.filter((t) => filter === 'all' || (filter === 'done') === t.done));
  const left = $derived(items.filter((t) => !t.done).length);
  $effect(() => { localStorage.setItem(KEY, JSON.stringify(items)); });

  function add(e) {
    e.preventDefault();
    if (!draft.trim()) return;
    items.push({ id: uid(), title: draft.trim(), done: false });
    draft = '';
  }
</script>

<Layout pattern="state" variant="light">
  {#snippet header()}
    <h1>To-do</h1>
    <p>Add, complete, remove, filter. State is one <code>$state</code> array, saved to <code>localStorage</code> by an effect; the list is a keyed <code>each</code> over a derived view of it. The baseline rebuilds the list by hand; here the compiler updates only what changed.</p>
  {/snippet}
  <form id="todo-form" class="cluster" style="margin-bottom: var(--space-4)" onsubmit={add}>
    <label for="todo-input" class="visually-hidden">New item</label>
    <input id="todo-input" class="input" style="max-width: 24rem" placeholder="What needs doing?" required maxlength="80" autocomplete="off" bind:value={draft} />
    <button class="btn btn--primary" type="submit">Add</button>
  </form>
  <div class="cluster" role="group" aria-label="Filter" style="margin-bottom: var(--space-3)">
    {#each ['all', 'active', 'done'] as f (f)}
      <button class="btn btn--sm" type="button" data-filter={f} aria-pressed={filter === f} onclick={() => (filter = f)}>{f[0].toUpperCase() + f.slice(1)}</button>
    {/each}
  </div>
  <ul id="todo-list" class="todo">
    {#each shown as t (t.id)}
      <li class={t.done ? 'done' : ''}>
        <input type="checkbox" id={t.id} checked={t.done} onchange={() => (t.done = !t.done)} />
        <label for={t.id}>{t.title}</label>
        <button class="btn btn--ghost btn--sm" type="button" aria-label="Remove {t.title}" onclick={() => (items = items.filter((x) => x !== t))}>Remove</button>
      </li>
    {:else}
      <li class="muted">{filter === 'all' ? 'Nothing to do. Add something above.' : `No ${filter} items.`}</li>
    {/each}
  </ul>
  <p id="todo-count" class="muted">{left} of {items.length} left</p>
</Layout>
