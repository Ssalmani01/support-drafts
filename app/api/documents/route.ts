// API-маршрут: сохраняет документ, режет его на куски и сохраняет их векторы.
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { chunkText } from "@/lib/chunk";
import { embedTexts } from "@/lib/embeddings";

export const maxDuration = 60; // индексация большого документа может занять время

const MAX_CHARS = 100_000;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Треба увійти в аккаунт" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const content = typeof body?.content === "string" ? body.content.trim() : "";

  if (!title || !content) {
    return NextResponse.json({ error: "Заповни назву і текст документа" }, { status: 400 });
  }
  if (title.length > 200 || content.length > MAX_CHARS) {
    return NextResponse.json({ error: "Документ занадто довгий" }, { status: 400 });
  }

  // 1. Сохраняем сам документ. user_id база подставит сама.
  const { data: doc, error: docError } = await supabase
    .from("documents")
    .insert({ title, content })
    .select("id")
    .single();

  if (docError || !doc) {
    console.error("Ошибка сохранения документа:", docError);
    return NextResponse.json({ error: "Не вдалось зберегти документ" }, { status: 500 });
  }

  // 2. Режем на куски, получаем векторы и сохраняем их.
  try {
    const chunks = chunkText(content);
    const vectors = await embedTexts(chunks, "RETRIEVAL_DOCUMENT");

    const rows = chunks.map((text, i) => ({
      document_id: doc.id,
      chunk_index: i,
      content: text,
      embedding: vectors[i],
    }));

    // Вставляем пачками, чтобы запросы не получались слишком большими.
    for (let i = 0; i < rows.length; i += 50) {
      const { error } = await supabase.from("document_chunks").insert(rows.slice(i, i + 50));
      if (error) throw error;
    }
  } catch (e) {
    console.error("Ошибка индексации:", e);
    // Документ без кусков бесполезен для поиска, поэтому откатываем сохранение.
    await supabase.from("documents").delete().eq("id", doc.id);
    return NextResponse.json(
      { error: "Не вдалось проіндексувати документ. Спробуй ще раз пізніше." },
      { status: 502 }
    );
  }

  return NextResponse.json({ id: doc.id });
}