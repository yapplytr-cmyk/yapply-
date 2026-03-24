const THEME_STORAGE_KEY = "yapply-theme";
const LOCALE_STORAGE_KEY = "yapply-locale";
let authSession = {
authenticated: false,
user: null,
};
function getStorage() {
try {
return window.localStorage;
} catch (error) {
return null;
}
}
export function getTheme() {
const storedTheme = getStorage()?.getItem(THEME_STORAGE_KEY);
return storedTheme === "light" ? "light" : "dark";
}
export function applyTheme(theme) {
document.documentElement.dataset.theme = theme;
getStorage()?.setItem(THEME_STORAGE_KEY, theme);
const bgColor = theme === "light" ? "#f3efe6" : "#060709";
document.documentElement.style.backgroundColor = bgColor;
document.body.style.backgroundColor = bgColor;
try {
const meta = document.querySelector('meta[name="theme-color"]');
if (meta) meta.content = bgColor;
} catch (_) {}
}
export function toggleTheme() {
const nextTheme = getTheme() === "dark" ? "light" : "dark";
applyTheme(nextTheme);
return nextTheme;
}
export function getLocale(fallbackLocale) {
const storedLocale = getStorage()?.getItem(LOCALE_STORAGE_KEY);
return storedLocale || fallbackLocale;
}
export function setLocale(locale) {
getStorage()?.setItem(LOCALE_STORAGE_KEY, locale);
}
export function getAuthSession() {
return { ...authSession };
}
export function setAuthSession(session) {
authSession = {
authenticated: Boolean(session?.authenticated && session?.user),
user: session?.user || null,
};
}
export function clearAuthSession() {
authSession = {
authenticated: false,
user: null,
};
}