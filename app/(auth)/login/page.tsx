"use client";
// Страница входа и регистрации.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/provider";
import { APP_NAME } from "@/lib/i18n/config";
import { LanguageSwitcher } from "@/components/language-switcher";
import { inputClass, primaryButton, secondaryButton } from "@/lib/ui";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const { d } = useI18n();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    setLoading(true);
    setMessage("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      setMessage(`${d.auth.signInError}: ${error.message}`);
      return;
    }
    router.push("/dashboard");
  }

  async function handleSignUp() {
    if (!email || !password) return;
    setLoading(true);
    setMessage("");
    const { data, error } = await supabase.auth.signUp({ email, password });
    setLoading(false);

    if (error) {
      setMessage(`${d.auth.signUpError}: ${error.message}`);
      return;
    }
    // Если включено подтверждение почты, сессии пока нет.
    if (!data.session) {
      setMessage(d.auth.checkEmail);
      return;
    }
    router.push("/dashboard");
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center p-6">
       <div className="absolute right-4 top-4 flex items-center gap-2">
        <ThemeToggle />
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-2.5 text-lg font-bold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm text-on-accent">
            S
          </span>
          {APP_NAME}
        </div>

        <h1 className="text-2xl font-bold">{d.auth.title}</h1>
        <p className="mt-1 text-sm text-gray-500">{d.auth.subtitle}</p>

        {/* form позволяет входить по клавише Enter */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSignIn();
          }}
          className="mt-6 space-y-4"
        >
          <input
            type="email"
            required
            autoComplete="email"
            placeholder={d.auth.email}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
          <input
            type="password"
            required
            minLength={6}
            autoComplete="current-password"
            placeholder={d.auth.password}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />

          <button type="submit" disabled={loading} className={`${primaryButton} w-full`}>
            {d.auth.signIn}
          </button>
          <button
            type="button"
            onClick={handleSignUp}
            disabled={loading}
            className={`${secondaryButton} w-full`}
          >
            {d.auth.signUp}
          </button>
        </form>

        {message && <p className="mt-4 text-sm text-gray-600">{message}</p>}
      </div>
    </main>
  );
}