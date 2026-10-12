// The data layer for the Vue port of pattern 3 heavy: query definitions for TanStack Query, the request helper,
// and the two cross-cutting bits (title plus route announcement, the last list URL for "Back to all posts").
import { ref, watchEffect, unref } from 'vue';

export const PAGE_SIZE = 8;
export class HttpError extends Error { constructor(status, body) { super(body?.error ?? `HTTP ${status}`); this.status = status; this.body = body; } }
export async function request(url, init) {
  const res = await fetch(url, { credentials: 'same-origin', headers: { accept: 'application/json', ...(init?.body && { 'content-type': 'application/json' }) }, ...init });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new HttpError(res.status, data);
  return data;
}
export const postsQuery = (q, page) => ({ queryKey: ['posts', { q, page }], queryFn: () => request(`/api/posts?${new URLSearchParams({ q, page, limit: PAGE_SIZE })}`) });
export const postQuery = (id) => ({ queryKey: ['post', id], queryFn: () => request(`/api/posts/${id}`) });
export const relatedQuery = (tag) => ({ queryKey: ['posts', { tag, limit: 4 }], queryFn: () => request(`/api/posts?tag=${encodeURIComponent(tag)}&limit=4`) });
export const hasSessionCookie = () => document.cookie.split('; ').some((c) => c.startsWith('session='));
export const loginRedirect = () => { addEventListener('pageswap', (e) => e.viewTransition?.skipTransition(), { once: true }); location.replace(`/account/heavy.html?next=${encodeURIComponent(location.pathname + location.hash)}`); };
export const lastList = ref('/');

/** Set the document title and announce the route from a string or a ref. */
export function useTitle(text) {
  watchEffect(() => {
    document.title = `${unref(text)} · Posts · Frontend Baseline, Vue port`;
    const announcer = document.getElementById('route-announcer');
    if (announcer) announcer.textContent = `Navigated to ${document.title}`;
  });
}
