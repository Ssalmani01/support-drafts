// API-маршрут: принимает вопрос клиента, находит самые подходящие куски
// документации по смыслу, возвращает черновик ответа и сохраняет его.
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateDraft } from "@/lib/ai";
import { embedTexts } from "@/lib/embeddings";

type Chunk = { title: string; content: string; similarity: number };

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

  // 3. Превращаем вопрос в вектор и просим базу найти 6 ближайших кусков.
  let chunks: Chunk[];
  try {
    const [queryVector] = await embedTexts([question], "RETRIEVAL_QUERY");
    const { data, error } = await supabase.rpc("match_chunks", {
      query_embedding: queryVector,
      match_count: 6,
    });
    if (error) throw error;
    chunks = (data ?? []) as Chunk[];
  } catch (e) {
    console.error("Ошибка поиска:", e);
    return NextResponse.json(
      { error: "Не вдалось знайти потрібні фрагменти. Спробуй ще раз пізніше." },
      { status: 502 }
    );
  }

  if (chunks.length === 0) {
    return NextResponse.json(
      { error: "Спочатку додай документи в особистому кабінеті" },
      { status: 400 }
    );
  }

  // 4. Генерируем ответ только по найденным кускам.
  let answer: string;
  try {
    answer = await generateDraft(
      question,
      chunks.map((c) => ({ title: c.title, content: c.content }))
    );
  } catch (e) {
    console.error("Ошибка генерации:", e);
    return NextResponse.json(
      { error: "Не вдалось отримати відповідь від ШІ. Спробуй ще раз пізніше." },
      { status: 502 }
    );
  }

  // 5. Сохраняем черновик, чтобы его можно было оценить 👍/👎.
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