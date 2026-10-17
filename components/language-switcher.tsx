"use client";
// Переключатель языка: три кнопки UK / RU / EN.

import { useI18n } from "@/lib/i18n/provider";
import { locales } from "@/lib/i18n/config";

export function LanguageSwitcher() {
  const { locale, setLocale, d } = useI18n();

  return (
    <div
      className="flex rounded-lg border border-gray-200 bg-white p-0.5 text-xs font-semibold"
      role="group"
      aria-label={d.nav.language}
    >
      {locales.map((l) => (
        <button
          key={l}
          onClick={() => setLocale(l)}
          aria-pressed={l === locale}
          className={`rounded-md px-2.5 py-1 uppercase transition ${
            l === locale ? "bg-brand-600 text-on-accent" : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}