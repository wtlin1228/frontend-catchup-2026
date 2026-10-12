<script setup>
// An async setup: the component is an async dependency of the <Suspense> above it and renders once the await settles.
import { onMounted } from 'vue';
const props = defineProps({ tag: String });
const emit = defineEmits(['painted']);
const { items } = await (await fetch(`/api/posts?tag=${props.tag}&limit=5`)).json();
onMounted(() => emit('painted', props.tag, items.length));
</script>

<template>
  <ul v-if="items.length" class="stack"><li v-for="p in items" :key="p.id"><a :href="`/dynamic/heavy.html#/posts/${p.id}`">{{ p.title }}</a></li></ul>
  <p v-else class="muted">No posts with this tag.</p>
</template>
