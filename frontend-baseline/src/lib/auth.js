// Session helpers. The cookie is set by the server (/api/login); the client only decides what to render.
import { getJSON, postJSON, invalidate } from './api.js';

export const hasSessionCookie = () => document.cookie.split('; ').some((c) => c.startsWith('session='));

/** Current user or null. Cached by api.js; pass { fresh: true } after login/logout. */
export function me(options) {
  if (!hasSessionCookie()) return Promise.resolve(null);
  return getJSON('/api/me', options).catch(() => null);
}

export async function login(email, password) {
  const user = await postJSON('/api/login', { email, password });
  invalidate('/api/me');
  return user;
}

export async function logout() {
  await postJSON('/api/logout', {});
  invalidate('/api/');
}

/** Only allow same-origin paths for post-login redirects. */
export const safeNext = (value) => (value && value.startsWith('/') && !value.startsWith('//') ? value : null);
