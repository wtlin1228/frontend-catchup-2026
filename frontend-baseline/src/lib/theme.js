// Theme preference. Reading happens in src/partials/head.html before first paint; this is the write side.
export const THEMES = ['system', 'light', 'dark'];

export const getTheme = () => localStorage.getItem('theme') ?? 'system';

export function applyTheme(theme) {
  if (theme === 'system') {
    delete document.documentElement.dataset.theme;
    localStorage.removeItem('theme');
  } else {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('theme', theme);
  }
}
