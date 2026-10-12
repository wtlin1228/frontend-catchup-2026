<script setup>
// Combobox: editable input + listbox, aria-activedescendant. The filtered list is a computed.
import { ref, computed, watch, nextTick } from 'vue';
const props = defineProps({ id: String, listId: String, label: String, labelHidden: Boolean, placeholder: { type: String, default: '' }, options: Array });
const emit = defineEmits(['select']);
const query = ref('');
const open = ref(false);
const active = ref(-1);
const list = ref(null);
const items = computed(() => (open.value ? props.options.filter((o) => o.label.toLowerCase().includes(query.value.trim().toLowerCase())) : []));
const activeIndex = computed(() => (items.value.length ? Math.min(active.value, items.value.length - 1) : -1));
const show = () => { open.value = true; active.value = 0; };
const hide = () => { open.value = false; active.value = -1; };
const choose = (i) => { const item = items.value[i]; if (!item) return; query.value = item.label; hide(); emit('select', item); };
watch([open, activeIndex], async () => { await nextTick(); if (open.value && activeIndex.value >= 0) list.value?.children[activeIndex.value]?.scrollIntoView({ block: 'nearest' }); });
defineExpose({ reset: () => { query.value = ''; } });
function onKeyDown(e) {
  if (e.key === 'ArrowDown') { e.preventDefault(); if (open.value) active.value = Math.min(activeIndex.value + 1, items.value.length - 1); else show(); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); active.value = Math.max(activeIndex.value - 1, 0); }
  else if (e.key === 'Enter' && open.value && activeIndex.value >= 0) { e.preventDefault(); choose(activeIndex.value); }
  else if (e.key === 'Escape') { e.preventDefault(); if (open.value) hide(); else query.value = ''; }
}
</script>

<template>
  <label :for="id" :class="labelHidden ? 'visually-hidden' : undefined">{{ label }}</label>
  <input :id="id" class="input" role="combobox" aria-autocomplete="list" :aria-expanded="open" :aria-controls="listId" :aria-activedescendant="open && activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined" autocomplete="off" :placeholder="placeholder"
    v-model="query" @input="show" @focus="show" @blur="hide" @keydown="onKeyDown" />
  <ul :id="listId" ref="list" class="listbox" role="listbox" :hidden="!open">
    <template v-if="items.length">
      <li v-for="(o, i) in items" :key="o.label" role="option" :id="`${listId}-option-${i}`" :aria-selected="i === activeIndex" @mousedown.prevent @click="choose(i)">{{ o.label }}<span v-if="o.hint" class="muted"> {{ o.hint }}</span></li>
    </template>
    <li v-else class="muted">No matches</li>
  </ul>
</template>
