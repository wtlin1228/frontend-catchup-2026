import './account-heavy.css';
import { h } from '../lib/dom.js';
import { getTheme, applyTheme } from '../lib/theme.js';
import { getLang, setLang, t, translateDom, LANGS } from '../lib/i18n.js';
import { me, login, logout, safeNext } from '../lib/auth.js';
import { HttpError } from '../lib/api.js';
import { toast } from '../lib/toast.js';

const $ = (id) => document.getElementById(id);

// --- theme: the read side runs in <head> before paint; this is the write side ---
const themeForm = $('theme-form');
themeForm.elements.namedItem('theme').value = getTheme();
themeForm.addEventListener('change', (e) => applyTheme(e.target.value));

// --- language ---
const langSelect = $('lang');
langSelect.append(...Object.entries(LANGS).map(([code, name]) => h('option', { value: code }, name)));
langSelect.value = getLang();
langSelect.addEventListener('change', () => {
  setLang(langSelect.value);
  translateDom();
});
document.documentElement.lang = getLang();
translateDom();

// --- session ---
const next = safeNext(new URLSearchParams(location.search).get('next'));
$('next-notice').hidden = !next;
const loginForm = $('login-form');
const loginError = $('login-error');
const submit = $('login-submit');

async function renderSession() {
  const user = await me({ fresh: true });
  $('login-panel').hidden = Boolean(user);
  $('profile-panel').hidden = !user;
  if (user) {
    $('profile-name').textContent = user.name;
    $('profile-email').textContent = user.email;
  }
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.textContent = '';
  submit.disabled = true;
  submit.textContent = t('login.pending');
  const data = Object.fromEntries(new FormData(loginForm));
  try {
    await login(data.email, data.password);
    toast(t('login.success'), { type: 'success' });
    if (next) return location.replace(next); // redirect-after-login
    loginForm.reset();
    await renderSession();
  } catch (err) {
    loginError.textContent = err instanceof HttpError && err.status === 401 ? t('login.invalid') : t('login.failed');
  } finally {
    submit.disabled = false;
    submit.textContent = t('login.submit');
  }
});
$('logout').addEventListener('click', async () => {
  await logout();
  toast(t('logout.done'));
  renderSession();
});
renderSession();
