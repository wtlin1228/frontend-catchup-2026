<script>
  // Combobox: editable input + listbox, aria-activedescendant. The filtered list is a derived.
  let { id, listId, label, labelHidden = false, placeholder = '', options, onSelect } = $props();
  let query = $state('');
  let open = $state(false);
  let active = $state(-1);
  let list = $state(null);
  const items = $derived(open ? options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase())) : []);
  const activeIndex = $derived(items.length ? Math.min(active, items.length - 1) : -1);
  const show = () => { open = true; active = 0; };
  const hide = () => { open = false; active = -1; };
  const choose = (i) => { const item = items[i]; if (!item) return; query = item.label; hide(); onSelect?.(item); };
  $effect(() => { if (open && activeIndex >= 0) list?.children[activeIndex]?.scrollIntoView({ block: 'nearest' }); });
  export function reset() { query = ''; }
  function onKeyDown(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (open) active = Math.min(activeIndex + 1, items.length - 1); else show(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(activeIndex - 1, 0); }
    else if (e.key === 'Enter' && open && activeIndex >= 0) { e.preventDefault(); choose(activeIndex); }
    else if (e.key === 'Escape') { e.preventDefault(); if (open) hide(); else query = ''; }
  }
</script>

<label for={id} class={labelHidden ? 'visually-hidden' : undefined}>{label}</label>
<input {id} class="input" role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={listId} aria-activedescendant={open && activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined} autocomplete="off" {placeholder}
  bind:value={query} oninput={show} onfocus={show} onblur={hide} onkeydown={onKeyDown} />
<ul id={listId} bind:this={list} class="listbox" role="listbox" hidden={!open}>
  {#if items.length}
    {#each items as o, i (o.label)}
      <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
      <li role="option" id="{listId}-option-{i}" aria-selected={i === activeIndex} onmousedown={(e) => e.preventDefault()} onclick={() => choose(i)}>{o.label}{#if o.hint}<span class="muted"> {o.hint}</span>{/if}</li>
    {/each}
  {:else}
    <li class="muted">No matches</li>
  {/if}
</ul>
