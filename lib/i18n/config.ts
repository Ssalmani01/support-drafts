// Настройки языков.
export const locales = ["uk", "ru", "en"] as const;
export type Locale = (typeof locales)[number];

// Язык по умолчанию: рынок на старте украинский.
export const defaultLocale: Locale = "uk";

export const APP_NAME = "SupportDraft"; // рабочее название, поменяй на своё

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}