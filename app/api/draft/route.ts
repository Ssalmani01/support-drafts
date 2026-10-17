// API-маршрут: принимает вопрос клиента, возвращает черновик ответа.
// Выполняется на сервере, поэтому ключ ИИ в браузер не попадает.
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateDraft } from "@/lib/ai";

export async function POST(request: Request) {
  // 1. Проверяем, что пользователь вошёл.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Треба увійти в аккаунт" }, { status: 401 });
  }

  // 2. Читаем и проверяем вопрос.
  const body = await request.json().catch(() => null);
  const question = typeof body?.question === "string" ? body.question.trim() : "";

  if (!question) {
    return NextResponse.json({ error: "Впиши аккаунт клієнта" }, { status: 400 });
  }
  if (question.length > 2000) {
    return NextResponse.json({ error: "Питання занадто довге" }, { status: 400 });
  }

  // 3. Берём документы пользователя. Благодаря RLS база отдаст только его.
  const { data: docs, error } = await supabase
    .from("documents")
    .select("title, content")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Не вдалось завантажити документи" }, { status: 500 });
  }
  if (!docs || docs.length === 0) {
    return NextResponse.json(
      { error: "Спочатку додай документи в особистому кабінеті" },
      { status: 400 }
    );
  }

  // 4. Генерируем ответ. Подробности ошибки пишем в лог сервера,
  // а пользователю показываем короткое сообщение.
  try {
    const answer = await generateDraft(question, docs);
    return NextResponse.json({ answer });
  } catch (e) {
    console.error("Ошибка генерации:", e);
    return NextResponse.json(
      { error: "Не вдалось отримати відповідь від ШІ. Спробуй ще раз пізніше." },
      { status: 502 }
    );
  }
}