<script setup>
import { useTitle } from './data.js';
useTitle('Not found');
</script>

<template>
  <div class="notice notice--warning">
    <p><strong>Nothing here.</strong> The route {{ $route.fullPath }} does not exist.</p>
    <RouterLink to="/">Go to all posts</RouterLink>
  </div>
</template>
