"use client";
// "use client" означает: этот компонент работает в браузере.
// Он нужен, потому что мы используем состояние (useState) и обработку кликов.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter(); // позволяет переходить на другие страницы из кода
  const supabase = createClient();

  // useState хранит значения, которые меняются: то, что ввёл пользователь.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Вход для существующего пользователя.
  async function handleSignIn() {
    setLoading(true);
    setMessage("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      setMessage(`Ошибка входа: ${error.message}`);
      return;
    }
    router.push("/dashboard"); // успех: переходим в личный кабинет
  }

  // Регистрация нового пользователя.
  async function handleSignUp() {
    setLoading(true);
    setMessage("");
    const { data, error } = await supabase.auth.signUp({ email, password });
    setLoading(false);

    if (error) {
      setMessage(`Ошибка регистрации: ${error.message}`);
      return;
    }
    // Если в Supabase включено подтверждение почты, сессии пока нет.
    if (!data.session) {
      setMessage("Проверь почту: мы отправили письмо для подтверждения.");
      return;
    }
    router.push("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold">Вход</h1>

        <input
          type="email"
          placeholder="Почта"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-gray-600 bg-transparent p-3"
        />
        <input
          type="password"
          placeholder="Пароль (минимум 6 символов)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-gray-600 bg-transparent p-3"
        />

        <div className="flex gap-3">
          <button
            onClick={handleSignIn}
            disabled={loading}
            className="flex-1 rounded-lg bg-white p-3 font-medium text-black hover:bg-gray-200 disabled:opacity-50"
          >
            Войти
          </button>
          <button
            onClick={handleSignUp}
            disabled={loading}
            className="flex-1 rounded-lg border border-gray-600 p-3 hover:bg-gray-800 disabled:opacity-50"
          >
            Регистрация
          </button>
        </div>

        {message && <p className="text-sm text-gray-300">{message}</p>}
      </div>
    </main>
  );
}