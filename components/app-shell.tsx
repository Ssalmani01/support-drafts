"use client";
// Каркас кабинета: боковое меню, верхняя панель и проверка, что пользователь вошёл.

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FileText, History, LayoutDashboard, LogOut, MessageSquareText } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/provider";
import { APP_NAME } from "@/lib/i18n/config";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeToggle } from "./theme-toggle";

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const { d } = useI18n();
  const [email, setEmail] = useState<string | null>(null);

  // Один раз при открытии: если пользователь не вошёл, отправляем на страницу входа.
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace("/login");
      } else {
        setEmail(data.user.email ?? "");
      }
    });
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  const items = [
    { href: "/dashboard", label: d.nav.overview, icon: LayoutDashboard },
    { href: "/documents", label: d.nav.documents, icon: FileText },
    { href: "/draft", label: d.nav.drafts, icon: MessageSquareText },
    { href: "/history", label: d.nav.history, icon: History },
  ];

  return (
    <>
      {/* Пока идёт проверка входа, закрываем страницу заставкой.
          Сами страницы при этом уже отрисованы под ней, как того требует Next.js. */}
      {email === null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center text-gray-500"
          style={{ background: "var(--app-bg)" }}
        >
          {d.common.loading}
        </div>
      )}

      <div className="min-h-screen md:flex">
        {/* Боковое меню (на телефоне скрыто, там меню сверху) */}
        <aside className="hidden w-64 shrink-0 flex-col border-r border-gray-200 bg-white md:flex">
          <div className="flex h-16 items-center gap-2.5 px-6 text-lg font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm text-on-accent">
              S
            </span>
            {APP_NAME}
          </div>
          <nav className="flex-1 space-y-1 px-3 py-4">
            {items.map(({ href, label, icon: Icon }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    active
                      ? "bg-brand-50 text-brand-ink"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <Icon size={18} />
                  {label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Верхняя панель */}
          <header className="flex h-16 items-center justify-between gap-4 border-b border-gray-200 bg-white px-4 md:px-8">
            <span className="font-bold md:hidden">{APP_NAME}</span>
            <div className="ml-auto flex items-center gap-3">
              <LanguageSwitcher />
              <ThemeToggle />
              <span className="hidden text-sm text-gray-500 sm:block">{email}</span>
              <button
                onClick={handleSignOut}
                title={d.nav.signOut}
                aria-label={d.nav.signOut}
                className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
              >
                <LogOut size={18} />
              </button>
            </div>
          </header>

          {/* Меню для телефона */}
          <nav className="flex gap-1 overflow-x-auto border-b border-gray-200 bg-white px-2 py-2 md:hidden">
            {items.map(({ href, label, icon: Icon }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                    active ? "bg-brand-50 text-brand-ink" : "text-gray-600"
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </Link>
              );
            })}
          </nav>

          <main className="mx-auto w-full max-w-5xl flex-1 p-4 md:p-8">{children}</main>
        </div>
      </div>
    </>
  );
}