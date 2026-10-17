// Клиент Supabase для серверного кода (API-маршруты).
// Он читает сессию пользователя из cookies запроса.
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        // Читаем все cookies текущего запроса.
        getAll() {
          return cookieStore.getAll();
        },
        // Записываем обновлённые cookies (например, продлённую сессию).
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // В некоторых местах запись cookies запрещена: это нормально.
          }
        },
      },
    }
  );
}