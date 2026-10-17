// Клиент Supabase для кода, который выполняется в браузере.
// Через него мы регистрируем пользователей, входим и читаем данные.
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    // Восклицательный знак говорит TypeScript: "значение точно есть".
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}