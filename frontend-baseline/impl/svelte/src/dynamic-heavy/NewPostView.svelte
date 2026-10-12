<script>
  import { postJSON, invalidate, HttpError } from '@baseline/src/lib/api.js';
  import { toast } from '@baseline/src/lib/toast.js';
  import { lastList, navigate, announce } from './router.svelte.js';

  const hasSessionCookie = () => document.cookie.split('; ').some((c) => c.startsWith('session='));
  const loginRedirect = () => { addEventListener('pageswap', (e) => e.viewTransition?.skipTransition(), { once: true }); location.replace(`/account/heavy.html?next=${encodeURIComponent(location.pathname + location.hash)}`); };
  const signedIn = hasSessionCookie();
  let errors = $state({});
  let status = $state('');
  let pending = $state(false);
  let titleInput = $state(null);
  announce('New post');
  $effect(() => { if (!signedIn) loginRedirect(); else titleInput?.focus(); });

  async function submit(e) {
    e.preventDefault();
    errors = {}; status = 'Publishing…'; pending = true;
    try {
      const created = await postJSON('/api/posts', Object.fromEntries(new FormData(e.target)));
      invalidate('/api/posts');
      toast('Published', { type: 'success' });
      navigate(`/posts/${created.id}`);
    } catch (err) {
      if (err instanceof HttpError && err.status === 401) return loginRedirect();
      if (err instanceof HttpError && err.status === 400 && err.body?.errors) { errors = err.body.errors; status = 'Fix the highlighted fields.'; }
      else status = 'Publishing failed. Try again.';
    } finally { pending = false; }
  }
</script>

{#if signedIn}
  <form class="form panel" novalidate onsubmit={submit}>
    <h2>New post</h2>
    <div class="field"><label for="np-title">Title</label><input id="np-title" bind:this={titleInput} name="title" class="input" required maxlength="120" /><p class="field__error">{errors.title ?? ''}</p></div>
    <div class="field"><label for="np-tags">Tags, comma separated</label><input id="np-tags" name="tags" class="input" placeholder="routing, state" /></div>
    <div class="field"><label for="np-body">Body</label><textarea id="np-body" name="body" class="textarea" rows="8" required></textarea><p class="field__error">{errors.body ?? ''}</p></div>
    <div class="cluster"><button class="btn btn--primary" type="submit" disabled={pending}>Publish</button><a class="btn btn--ghost" href={lastList.href}>Cancel</a></div>
    <p class="form-status muted" role="status" aria-live="polite">{status}</p>
  </form>
{/if}
