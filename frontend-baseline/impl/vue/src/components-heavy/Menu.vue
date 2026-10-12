<script setup>
// Menu button: roving focus, typeahead, outside click. Open is state; which item has focus is the DOM's.
import { ref, watch, nextTick, onBeforeUnmount } from 'vue';
import { toast } from '@baseline/src/lib/toast.js';
const props = defineProps({ id: String, menuId: String, items: Array });
const open = ref(false);
const root = ref(null);
const button = ref(null);
const list = ref(null);
const els = () => [...list.value.querySelectorAll('[role="menuitem"]')];
async function openAt(i) { open.value = true; await nextTick(); els()[i].focus(); }
const close = (refocus = true) => { open.value = false; if (refocus) button.value.focus(); };
const onDown = (e) => { if (!root.value.contains(e.target)) close(false); };
watch(open, (isOpen) => { if (isOpen) document.addEventListener('pointerdown', onDown); else document.removeEventListener('pointerdown', onDown); });
onBeforeUnmount(() => document.removeEventListener('pointerdown', onDown));
function onButtonKey(e) {
  if (e.key === 'ArrowDown') { e.preventDefault(); openAt(0); }
  if (e.key === 'ArrowUp') { e.preventDefault(); openAt(props.items.length - 1); }
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

<template>
  <div class="menu" data-widget="menu" ref="root">
    <button class="btn" :id="id" ref="button" type="button" aria-haspopup="menu" :aria-expanded="open" :aria-controls="menuId" @click="open ? close() : openAt(0)" @keydown="onButtonKey">Actions</button>
    <ul :id="menuId" ref="list" class="menu__list" role="menu" :aria-labelledby="id" :hidden="!open" @keydown="onMenuKey">
      <li v-for="item in items" :key="item" role="menuitem" tabindex="-1" @click="toast(`${item}: done`); close();">{{ item }}</li>
    </ul>
  </div>
</template>
