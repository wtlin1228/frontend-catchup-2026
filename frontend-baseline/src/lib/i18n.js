// Minimal i18n: dictionaries, a t() function, and a DOM pass over [data-i18n] elements.
// Frameworks add message formats (ICU), lazy-loaded locales and locale-prefixed routes on top.
const dictionaries = {
  en: {
    'account.title': 'Account',
    'account.lead': 'Theme, language and sign-in: the settings every page has to agree on.',
    'theme.title': 'Theme',
    'theme.help': 'Applied before first paint by an inline script in <head>, so there is no flash of the wrong theme.',
    'theme.system': 'Match the system',
    'theme.light': 'Light',
    'theme.dark': 'Dark',
    'lang.title': 'Language',
    'lang.help': 'Strings swap at runtime from a dictionary; the <html lang> attribute follows.',
    'session.title': 'Sign-in',
    'session.help': 'Any email works. The password is "demo". The server sets a cookie; protected content loads from /api/me.',
    'login.email': 'Email',
    'login.password': 'Password',
    'login.submit': 'Sign in',
    'login.pending': 'Signing in…',
    'login.invalid': 'Invalid email or password.',
    'login.failed': 'Could not sign in. Check your connection and try again.',
    'login.success': 'Signed in',
    'profile.signedInAs': 'Signed in as',
    'profile.hint': 'This block renders only after /api/me confirms the session. "New post" on the Posts page is guarded by the same cookie.',
    'logout': 'Sign out',
    'logout.done': 'Signed out',
    'next.notice': 'Sign in to continue to the page you requested.',
  },
  ja: {
    'account.title': 'アカウント',
    'account.lead': 'テーマ、言語、サインイン：すべてのページで一致させる必要がある設定です。',
    'theme.title': 'テーマ',
    'theme.help': '<head> 内のインラインスクリプトが最初の描画前に適用するため、テーマのちらつきは起きません。',
    'theme.system': 'システムに合わせる',
    'theme.light': 'ライト',
    'theme.dark': 'ダーク',
    'lang.title': '言語',
    'lang.help': '文字列は実行時に辞書から差し替えられ、<html lang> 属性も追従します。',
    'session.title': 'サインイン',
    'session.help': 'メールアドレスは何でも構いません。パスワードは "demo" です。サーバーが Cookie を設定し、保護されたコンテンツは /api/me から読み込まれます。',
    'login.email': 'メールアドレス',
    'login.password': 'パスワード',
    'login.submit': 'サインイン',
    'login.pending': 'サインイン中…',
    'login.invalid': 'メールアドレスまたはパスワードが正しくありません。',
    'login.failed': 'サインインできませんでした。接続を確認してもう一度お試しください。',
    'login.success': 'サインインしました',
    'profile.signedInAs': 'サインイン中：',
    'profile.hint': 'このブロックは /api/me がセッションを確認した後にのみ表示されます。Posts ページの「New post」も同じ Cookie で保護されています。',
    'logout': 'サインアウト',
    'logout.done': 'サインアウトしました',
    'next.notice': 'リクエストしたページに進むにはサインインしてください。',
  },
};

export const LANGS = { en: 'English', ja: '日本語' };

export function getLang() {
  const saved = localStorage.getItem('lang');
  if (saved && dictionaries[saved]) return saved;
  const browser = navigator.language.slice(0, 2);
  return dictionaries[browser] ? browser : 'en';
}

export function setLang(lang) {
  localStorage.setItem('lang', lang);
  document.documentElement.lang = lang;
}

export function t(key, lang = getLang()) {
  return dictionaries[lang]?.[key] ?? dictionaries.en[key] ?? key;
}

/** Translate every [data-i18n] element under root. */
export function translateDom(root = document) {
  const lang = getLang();
  for (const el of root.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n, lang);
}
