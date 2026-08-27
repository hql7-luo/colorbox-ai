"use client";

import { createContext, useContext, useEffect, useMemo, useReducer } from "react";
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  formatDate,
  formatDateTime,
  isLanguage,
  resolveStoredLanguage,
  translate,
  type Language,
  type TranslationKey,
} from "@/i18n";

type LanguageState = { language: Language };
type LanguageAction = { type: "set"; language: Language };

export function languageReducer(_state: LanguageState, action: LanguageAction): LanguageState {
  return { language: action.language };
}

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  formatDate: (value: string | Date) => string;
  formatDateTime: (value: string | Date) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [{ language }, dispatch] = useReducer(languageReducer, { language: DEFAULT_LANGUAGE });

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("lang");
    if (isLanguage(requested)) {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, requested);
      dispatch({ type: "set", language: requested });
      return;
    }
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (isLanguage(stored)) {
      dispatch({ type: "set", language: resolveStoredLanguage(stored) });
      return;
    }
    const controller = new AbortController();
    void fetch("/api/settings", { signal: controller.signal })
      .then((response) => response.json())
      .then((data) => {
        dispatch({
          type: "set",
          language: data.setting?.defaultLanguage === "English" ? "en" : DEFAULT_LANGUAGE,
        });
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  }, [language]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage(nextLanguage) {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
        dispatch({ type: "set", language: nextLanguage });
      },
      t: (key, params) => translate(language, key, params),
      formatDate: (date) => formatDate(date, language),
      formatDateTime: (date) => formatDateTime(date, language),
    }),
    [language],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used inside LanguageProvider");
  return context;
}
