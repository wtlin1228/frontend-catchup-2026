<script>
  import { getJSON, postJSON } from '@baseline/src/lib/api.js';
  import { toast } from '@baseline/src/lib/toast.js';
  let { id, current, ready, log, lane } = $props();
  const loaded = $derived(await current(getJSON(`/api/posts/${id}`)));
  let override = $state(null); // the optimistic lane and, once confirmed, the server's answer
  const post = $derived({ ...loaded, ...override });
  $effect(() => { void loaded; override = null; ready('post'); });
  // The handler checks the derived against the prop: after a superseded batch (post 4, then 5 before 4 had landed) the
  // derived read here was still post 4 while the DOM showed post 5 (Svelte 5.57, experimental async). The cache answers
  // the re-read at once, and the override carries the whole post so the view cannot fall back to the stale one.
  async function like() {
    const current = post.id === id ? { ...post } : await getJSON(`/api/posts/${id}`);
    override = { ...current, liked: !current.liked, likes: current.likes + (current.liked ? -1 : 1) };
    lane(1);
    try {
      override = { ...current, ...(await postJSON(`/api/posts/${id}/like`, {})) };
      log('like confirmed', 'ok');
    } catch (err) {
      override = current;
      log(`like rolled back: ${err.message}`, 'err');
      toast('Like rolled back', { type: 'error' });
    } finally { lane(-1); }
  }
</script>

<p><strong>{post.title}</strong></p>
<p class="muted">{post.excerpt}</p>
<button class="btn btn--sm" type="button" onclick={like}>{post.liked ? 'Liked' : 'Like'} ({post.likes})</button>
