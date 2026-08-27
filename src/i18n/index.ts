import { en } from "@/i18n/en";
import { zh, type TranslationKey } from "@/i18n/zh";

export type Language = "zh" | "en";
export const DEFAULT_LANGUAGE: Language = "zh";
export const LANGUAGE_STORAGE_KEY = "colorbox-language";

export function isLanguage(value: unknown): value is Language {
  return value === "zh" || value === "en";
}

export function resolveStoredLanguage(value: unknown): Language {
  return isLanguage(value) ? value : DEFAULT_LANGUAGE;
}

export function translate(
  language: Language,
  key: TranslationKey,
  params: Record<string, string | number> = {},
) {
  let message: string = (language === "zh" ? zh : en)[key];
  for (const [name, value] of Object.entries(params)) {
    message = message.replaceAll(`{${name}}`, String(value));
  }
  return message;
}

export function formatDate(value: string | Date, language: Language) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en-US", {
    year: "numeric",
    month: language === "zh" ? "long" : "short",
    day: "numeric",
  }).format(date);
}

export function formatDateTime(value: string | Date, language: Language) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en-US", {
    year: "numeric",
    month: language === "zh" ? "long" : "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: language === "en",
  }).format(date);
}

export type { TranslationKey };
