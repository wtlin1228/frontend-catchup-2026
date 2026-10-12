<script>
  import { getJSON } from '@baseline/src/lib/api.js';
  let { id, current, ready } = $props();
  // Depends on the post: the second await reads the first; api.js's cache deduplicates the post request with PostPart's.
  const items = $derived(await current((async () => {
    const post = await getJSON(`/api/posts/${id}`);
    const { items } = await getJSON(`/api/posts?tag=${encodeURIComponent(post.tags[0])}&limit=4`);
    return items.filter((p) => p.id !== post.id).slice(0, 3);
  })()));
  $effect(() => { void items; ready('related'); });
</script>

<ul>{#each items as p (p.id)}<li>{p.title}</li>{/each}</ul>
