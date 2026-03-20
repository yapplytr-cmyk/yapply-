const THEME_STORAGE_KEY = "yapply-theme";
const LOCALE_STORAGE_KEY = "yapply-locale";

export function getTheme() {
  const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  return storedTheme === "light" ? "light" : "dark";
}

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}

export function toggleTheme() {
  const nextTheme = getTheme() === "dark" ? "light" : "dark";
  applyTheme(nextTheme);
  return nextTheme;
}

export function getLocale(fallbackLocale) {
  const storedLocale = localStorage.getItem(LOCALE_STORAGE_KEY);
  return storedLocale || fallbackLocale;
}

export function setLocale(locale) {
  localStorage.setItem(LOCALE_STORAGE_KEY, locale);
}
