// Light/dark theme, user-selected, defaults to light. Applied as a data
// attribute on <html> so every view (landing included) picks it up.

const KEY = 'outside-records-theme';

export function initTheme() {
  applyTheme(getTheme());
}

export function getTheme() {
  const saved = localStorage.getItem(KEY);
  return saved === 'dark' ? 'dark' : 'light';
}

export function setTheme(theme) {
  localStorage.setItem(KEY, theme);
  applyTheme(theme);
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
}
