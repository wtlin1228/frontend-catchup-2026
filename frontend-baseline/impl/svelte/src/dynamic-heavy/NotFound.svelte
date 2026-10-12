<script>
  import { announce } from './router.svelte.js';
  announce('Not found');
</script>

<div class="notice notice--warning">
  <p><strong>Nothing here.</strong> The route {location.hash || '#/'} does not exist.</p>
  <a href="#/">Go to all posts</a>
</div>
