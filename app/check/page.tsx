 // Временная страница: проверяем, что ключи есть И что Supabase отвечает.
// async означает, что компонент может ждать ответа от сервера (await).
export default async function Check() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  let status = "Ключи не найдены ❌";

  if (url && key) {
    try {
      // Запрашиваем у Supabase служебный адрес проверки работоспособности.
      const res = await fetch(`${url}/auth/v1/health`, {
        headers: { apikey: key },
        cache: "no-store", // всегда свежий ответ, без кэша
      });
      status = res.ok
        ? "Supabase отвечает ✅"
        : `Supabase ответил с кодом ${res.status} ⚠️`;
    } catch {
      // Сюда попадаем, если адрес неверный или нет интернета.
      status = "Нет связи с Supabase ❌ (проверь URL в .env.local)";
    }
  }

  return <main className="p-8 text-xl">{status}</main>;
}