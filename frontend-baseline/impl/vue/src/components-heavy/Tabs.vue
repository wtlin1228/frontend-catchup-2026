<script setup>
// Tabs: automatic activation, roving tabindex. Selection is state; focus is a template ref.
import { ref } from 'vue';
const props = defineProps({ tabs: Array });
const selected = ref(0);
const buttons = ref([]);
const select = (i, focus) => { selected.value = (i + props.tabs.length) % props.tabs.length; if (focus) buttons.value[selected.value].focus(); };
function onKeyDown(i, e) {
  const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: props.tabs.length - 1 }[e.key];
  if (next === undefined) return;
  e.preventDefault();
  select(next, true);
}
</script>

<template>
  <div data-widget="tabs" class="tabs">
    <div role="tablist" aria-label="Framework families">
      <button v-for="(t, i) in tabs" :key="t.id" :ref="(el) => { buttons[i] = el; }" role="tab" :id="`tab-${t.id}`" :aria-selected="i === selected" :aria-controls="`panel-${t.id}`" type="button" :tabindex="i === selected ? 0 : -1" @click="select(i, false)" @keydown="onKeyDown(i, $event)">{{ t.label }}</button>
    </div>
    <div v-for="(t, i) in tabs" :key="t.id" role="tabpanel" :id="`panel-${t.id}`" :aria-labelledby="`tab-${t.id}`" tabindex="0" :hidden="i !== selected"><p>{{ t.panel }}</p></div>
  </div>
</template>
