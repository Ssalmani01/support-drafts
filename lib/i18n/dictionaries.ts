import { uk } from "./uk";
import { ru } from "./ru";
import { en } from "./en";
import type { Dictionary } from "./uk";
import type { Locale } from "./config";

// Все словари в одном месте: по коду языка получаем нужный.
export const dictionaries: Record<Locale, Dictionary> = { uk, ru, en };