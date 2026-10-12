<script setup>
import { ref, computed, watch } from 'vue';
import Layout from './Layout.vue';
import '@baseline/src/pages/state-light.css';

const KEY = 'todo:v1';
const uid = () => `todo_${Math.random().toString(36).slice(2, 9)}`;
const load = () => { try { return JSON.parse(localStorage.getItem(KEY) ?? '[]'); } catch { return []; } };

const items = ref(load());
const filter = ref('all');
const draft = ref('');
const shown = computed(() => items.value.filter((t) => filter.value === 'all' || (filter.value === 'done') === t.done));
const left = computed(() => items.value.filter((t) => !t.done).length);
watch(items, (value) => localStorage.setItem(KEY, JSON.stringify(value)), { deep: true });

function add() {
  if (!draft.value.trim()) return;
  items.value.push({ id: uid(), title: draft.value.trim(), done: false });
  draft.value = '';
}
</script>

<template>
  <Layout pattern="state" variant="light">
    <template #header>
      <h1>To-do</h1>
      <p>Add, complete, remove, filter. State is one reactive array, saved to <code>localStorage</code> by a deep watcher; the list is a keyed <code>v-for</code> over a computed view of it. The baseline rebuilds the list by hand; here the renderer patches it.</p>
    </template>
    <form id="todo-form" class="cluster" style="margin-bottom: var(--space-4)" @submit.prevent="add">
      <label for="todo-input" class="visually-hidden">New item</label>
      <input id="todo-input" class="input" style="max-width: 24rem" placeholder="What needs doing?" required maxlength="80" autocomplete="off" v-model="draft" />
      <button class="btn btn--primary" type="submit">Add</button>
    </form>
    <div class="cluster" role="group" aria-label="Filter" style="margin-bottom: var(--space-3)">
      <button v-for="f in ['all', 'active', 'done']" :key="f" class="btn btn--sm" type="button" :data-filter="f" :aria-pressed="filter === f" @click="filter = f">{{ f[0].toUpperCase() + f.slice(1) }}</button>
    </div>
    <ul id="todo-list" class="todo">
      <li v-for="t in shown" :key="t.id" :class="t.done ? 'done' : ''">
        <input type="checkbox" :id="t.id" :checked="t.done" @change="t.done = !t.done" />
        <label :for="t.id">{{ t.title }}</label>
        <button class="btn btn--ghost btn--sm" type="button" :aria-label="`Remove ${t.title}`" @click="items = items.filter((x) => x !== t)">Remove</button>
      </li>
      <li v-if="!shown.length" class="muted">{{ filter === 'all' ? 'Nothing to do. Add something above.' : `No ${filter} items.` }}</li>
    </ul>
    <p id="todo-count" class="muted">{{ left }} of {{ items.length }} left</p>
  </Layout>
</template>
