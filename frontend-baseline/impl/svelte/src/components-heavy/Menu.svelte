<script>
  import { tick } from 'svelte';
  import { toast } from '@baseline/src/lib/toast.js';
  // Menu button: roving focus, typeahead, outside click. Open is state; which item has focus is the DOM's.
  let { id, menuId, items } = $props();
  let open = $state(false);
  let root = $state(null);
  let button = $state(null);
  let list = $state(null);
  const els = () => [...list.querySelectorAll('[role="menuitem"]')];
  async function openAt(i) { open = true; await tick(); els()[i].focus(); }
  const close = (refocus = true) => { open = false; if (refocus) button.focus(); };
  $effect(() => {
    if (!open) return;
    const onDown = (e) => { if (!root.contains(e.target)) close(false); };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  });
  function onButtonKey(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); openAt(0); }
    if (e.key === 'ArrowUp') { e.preventDefault(); openAt(items.length - 1); }
  }
  function onMenuKey(e) {
    const all = els();
    const i = all.indexOf(document.activeElement);
    const label = (el) => el.textContent.trim().toLowerCase();
    if (e.key === 'ArrowDown') all[(i + 1) % all.length].focus();
    else if (e.key === 'ArrowUp') all[(i - 1 + all.length) % all.length].focus();
    else if (e.key === 'Home') all[0].focus();
    else if (e.key === 'End') all.at(-1).focus();
    else if (e.key === 'Escape') close();
    else if (e.key === 'Tab') return close(false);
    else if (/^[a-z]$/i.test(e.key)) {
      const k = e.key.toLowerCase();
      (all.find((el, j) => j > i && label(el).startsWith(k)) ?? all.find((el) => label(el).startsWith(k)))?.focus();
    } else return;
    e.preventDefault();
  }
</script>

<div class="menu" data-widget="menu" bind:this={root}>
  <button class="btn" {id} bind:this={button} type="button" aria-haspopup="menu" aria-expanded={open} aria-controls={menuId} onclick={() => (open ? close() : openAt(0))} onkeydown={onButtonKey}>Actions</button>
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <ul id={menuId} bind:this={list} class="menu__list" role="menu" aria-labelledby={id} hidden={!open} onkeydown={onMenuKey}>
    {#each items as item (item)}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <li role="menuitem" tabindex="-1" onclick={() => { toast(`${item}: done`); close(); }}>{item}</li>
    {/each}
  </ul>
</div>
