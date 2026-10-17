// API-маршрут: принимает вопрос клиента, возвращает черновик ответа
// и сохраняет его в таблицу drafts, чтобы потом можно было поставить оценку.
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
    return NextResponse.json({ error: "Впиши питання клієнта" }, { status: 400 });
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
  let answer: string;
  try {
    answer = await generateDraft(question, docs);
  } catch (e) {
    console.error("Ошибка генерации:", e);
    return NextResponse.json(
      { error: "Не вдалось отримати відповідь від ШІ. Спробуй ще раз пізніше." },
      { status: 502 }
    );
  }

  // 5. Сохраняем черновик. user_id база подставит сама.
  // Если сохранить не вышло, ответ всё равно отдаём (id будет null),
  // просто оценить его будет нельзя.
  const { data: saved, error: saveError } = await supabase
    .from("drafts")
    .insert({ question, answer })
    .select("id")
    .single();

  if (saveError) {
    console.error("Ошибка сохранения черновика:", saveError);
  }

  return NextResponse.json({ id: saved?.id ?? null, answer });
}