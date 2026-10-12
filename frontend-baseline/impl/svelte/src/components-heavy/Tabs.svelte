<script>
  // Tabs: automatic activation, roving tabindex. Selection is state; focus is a bound element.
  let { tabs } = $props();
  let selected = $state(0);
  let buttons = $state([]);
  const select = (i, focus) => { selected = (i + tabs.length) % tabs.length; if (focus) buttons[selected].focus(); };
  function onKeyDown(i, e) {
    const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    select(next, true);
  }
</script>

<div data-widget="tabs" class="tabs">
  <div role="tablist" aria-label="Framework families">
    {#each tabs as t, i (t.id)}
      <button bind:this={buttons[i]} role="tab" id="tab-{t.id}" aria-selected={i === selected} aria-controls="panel-{t.id}" type="button" tabindex={i === selected ? 0 : -1} onclick={() => select(i, false)} onkeydown={(e) => onKeyDown(i, e)}>{t.label}</button>
    {/each}
  </div>
  {#each tabs as t, i (t.id)}
    <div role="tabpanel" id="panel-{t.id}" aria-labelledby="tab-{t.id}" tabindex="0" hidden={i !== selected}><p>{t.panel}</p></div>
  {/each}
</div>
