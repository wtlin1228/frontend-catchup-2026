<script setup>
import { onMounted } from 'vue';
// An async setup that rejects would stall the boundary, so the failure is caught here and rendered as the part's own error.
defineProps({ id: Number, attempt: Number });
const emit = defineEmits(['ready', 'log', 'lane', 'retry']);
let status = null;
let error = null;
try {
  const res = await fetch('/api/flaky');
  if (!res.ok) throw new Error(`status answered ${res.status}`);
  status = await res.json();
} catch (err) { error = err; }
onMounted(() => { if (error) emit('log', `status: failed (${error.message})`, 'err'); else emit('ready', 'status'); });
</script>

<template>
  <div v-if="error" class="notice notice--error"><p>Failed: {{ error.message }}</p><button class="btn btn--sm" type="button" @click="emit('retry', 'status')">Retry status only</button></div>
  <p v-else>Server value {{ status.value }}</p>
</template>
