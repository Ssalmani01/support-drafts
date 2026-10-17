"use client";
// Кнопка смены темы: светлая или тёмная. Выбор запоминается в браузере.

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";

export function ThemeToggle() {
  const { d } = useI18n();
  const [dark, setDark] = useState(false);

  // Узнаём, какая тема уже включена (её поставил скрипт из layout.tsx).
  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      // не страшно, если выбор не сохранился
    }
  }

  const label = dark ? d.nav.themeLight : d.nav.themeDark;

  return (
    <button
      onClick={toggle}
      title={label}
      aria-label={label}
      className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}