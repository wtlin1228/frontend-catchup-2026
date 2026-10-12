<script setup>
import { onMounted, ref, useTemplateRef } from 'vue';
import { useRouter } from 'vue-router';
import { useMutation, useQueryClient } from '@tanstack/vue-query';
import { toast } from '@baseline/src/lib/toast.js';
import { request, HttpError, hasSessionCookie, loginRedirect, useTitle, lastList } from './data.js';

const router = useRouter();
const client = useQueryClient();
const errors = ref({});
const status = ref('');
const titleInput = useTemplateRef('titleInput');
const signedIn = hasSessionCookie();
useTitle('New post');
onMounted(() => { if (!signedIn) loginRedirect(); else titleInput.value?.focus(); });
const publish = useMutation({
  mutationFn: (data) => request('/api/posts', { method: 'POST', body: JSON.stringify(data) }),
  onSuccess: (created) => { client.invalidateQueries({ queryKey: ['posts'] }); toast('Published', { type: 'success' }); router.push(`/posts/${created.id}`); },
  onError: (err) => {
    if (err instanceof HttpError && err.status === 401) return loginRedirect();
    if (err instanceof HttpError && err.status === 400 && err.body?.errors) { errors.value = err.body.errors; status.value = 'Fix the highlighted fields.'; }
    else status.value = 'Publishing failed. Try again.';
  },
});
function submit(e) { errors.value = {}; status.value = 'Publishing…'; publish.mutate(Object.fromEntries(new FormData(e.target))); }
</script>

<template>
  <form v-if="signedIn" class="form panel" novalidate @submit.prevent="submit">
    <h2>New post</h2>
    <div class="field"><label for="np-title">Title</label><input id="np-title" ref="titleInput" name="title" class="input" required maxlength="120" /><p class="field__error">{{ errors.title }}</p></div>
    <div class="field"><label for="np-tags">Tags, comma separated</label><input id="np-tags" name="tags" class="input" placeholder="routing, state" /></div>
    <div class="field"><label for="np-body">Body</label><textarea id="np-body" name="body" class="textarea" rows="8" required></textarea><p class="field__error">{{ errors.body }}</p></div>
    <div class="cluster"><button class="btn btn--primary" type="submit" :disabled="publish.isPending.value">Publish</button><RouterLink class="btn btn--ghost" :to="lastList">Cancel</RouterLink></div>
    <p class="form-status muted" role="status" aria-live="polite">{{ status }}</p>
  </form>
</template>
