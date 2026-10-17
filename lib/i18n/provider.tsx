"use client";
// Провайдер языка: определяет язык пользователя и раздаёт словарь компонентам.

import { createContext, useContext, useEffect, useState } from "react";
import { defaultLocale, isLocale, type Locale } from "./config";
import { dictionaries } from "./dictionaries";
import type { Dictionary } from "./uk";

type I18nValue = { locale: Locale; setLocale: (l: Locale) => void; d: Dictionary };

const I18nContext = createContext<I18nValue | null>(null);

// Порядок выбора языка: сохранённый выбор, затем язык браузера, затем украинский.
function detectLocale(): Locale {
  try {
    const saved = localStorage.getItem("lang");
    if (isLocale(saved)) return saved;
  } catch {
    // localStorage может быть недоступен (например, в режиме инкогнито)
  }
  const browser = navigator.language.slice(0, 2).toLowerCase();
  return isLocale(browser) ? browser : defaultLocale;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale | null>(null);

  useEffect(() => {
    const l = detectLocale();
    setLocaleState(l);
    document.documentElement.lang = l;
  }, []);

  function setLocale(l: Locale) {
    setLocaleState(l);
    document.documentElement.lang = l;
    try {
      localStorage.setItem("lang", l);
    } catch {
      // не страшно, если выбор не сохранился
    }
  }

  // Пока язык не определён, используем украинский как запасной.
  const current: Locale = locale ?? defaultLocale;

  return (
    <I18nContext.Provider value={{ locale: current, setLocale, d: dictionaries[current] }}>
      {/* Страницы рисуются всегда (этого требует Next.js), но скрыты,
          пока в браузере не определился язык: так не мелькнёт чужой язык. */}
      <div style={{ visibility: locale ? "visible" : "hidden" }}>{children}</div>
    </I18nContext.Provider>
  );
}

// Хук для компонентов: const { d } = useI18n(); затем d.nav.documents и т.д.
export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n нужно вызывать внутри I18nProvider");
  return ctx;
}