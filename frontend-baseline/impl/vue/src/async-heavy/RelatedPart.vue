<script setup>
import { onMounted } from 'vue';
import { getJSON } from '@baseline/src/lib/api.js';
const props = defineProps({ id: Number });
const emit = defineEmits(['ready', 'log', 'lane', 'retry']);
// Depends on the post: api.js's cache deduplicates the post request with PostPart's.
const post = await getJSON(`/api/posts/${props.id}`);
const items = (await getJSON(`/api/posts?tag=${encodeURIComponent(post.tags[0])}&limit=4`)).items.filter((p) => p.id !== post.id).slice(0, 3);
onMounted(() => emit('ready', 'related'));
</script>

<template><ul><li v-for="p in items" :key="p.id">{{ p.title }}</li></ul></template>
