import { translations } from "../content/siteContent.js";

const DEFAULT_LOCALE = "en";
const SUPPORTED_LOCALES = ["en", "tr"];

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function mergeContent(base, override) {
  if (!isObject(base) || !isObject(override)) {
    return override ?? base;
  }

  const merged = { ...base };

  Object.keys(override).forEach((key) => {
    merged[key] = key in base ? mergeContent(base[key], override[key]) : override[key];
  });

  return merged;
}

export function getSupportedLocales() {
  return [...SUPPORTED_LOCALES];
}

export function getDefaultLocale() {
  return DEFAULT_LOCALE;
}

export function getLocaleContent(locale = DEFAULT_LOCALE) {
  const safeLocale = SUPPORTED_LOCALES.includes(locale) ? locale : DEFAULT_LOCALE;
  const baseContent = translations[DEFAULT_LOCALE];
  const localeContent = translations[safeLocale] || {};

  return mergeContent(baseContent, localeContent);
}
