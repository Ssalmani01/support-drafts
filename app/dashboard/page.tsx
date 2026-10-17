"use client";
// Личный кабинет: список документов пользователя, добавление и удаление.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Описание формы данных одного документа (так TypeScript помогает не ошибаться).
type Doc = { id: string; title: string; content: string; created_at: string };

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState<string | null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [message, setMessage] = useState("");

  // Загружаем документы. Благодаря RLS база сама вернёт только твои.
  async function loadDocs() {
    const { data, error } = await supabase
      .from("documents")
      .select("id, title, content, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(`Ошибка загрузки: ${error.message}`);
      return;
    }
    setDocs(data ?? []);
  }

  // При открытии страницы: проверяем вход и загружаем данные.
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push("/login");
      } else {
        setEmail(data.user.email ?? "");
        loadDocs();
      }
    });
  }, []);

  // Добавление документа. user_id база подставит сама.
  async function handleAdd() {
    if (!title.trim() || !content.trim()) {
      setMessage("Заполни название и текст документа.");
      return;
    }
    setMessage("");
    const { error } = await supabase.from("documents").insert({ title, content });

    if (error) {
      setMessage(`Ошибка сохранения: ${error.message}`);
      return;
    }
    setTitle("");
    setContent("");
    loadDocs(); // обновляем список
  }

  // Удаление документа по id.
  async function handleDelete(id: string) {
    const { error } = await supabase.from("documents").delete().eq("id", id);
    if (error) {
      setMessage(`Ошибка удаления: ${error.message}`);
      return;
    }
    loadDocs();
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (email === null) {
    return <main className="p-8">Загрузка...</main>;
  }

  return (
    <main className="mx-auto max-w-2xl space-y-8 p-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Личный кабинет</h1>
          <p className="text-sm text-gray-400">Вы вошли как: {email}</p>
        </div>
        <button
          onClick={handleSignOut}
          className="rounded-lg border border-gray-600 px-4 py-2 hover:bg-gray-800"
        >
          Выйти
        </button>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Добавить документ</h2>
        <input
          placeholder="Название (например, «Как сбросить пароль»)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border border-gray-600 bg-transparent p-3"
        />
        <textarea
          placeholder="Вставь текст документации"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={8}
          className="w-full rounded-lg border border-gray-600 bg-transparent p-3"
        />
        <button
          onClick={handleAdd}
          className="rounded-lg bg-white px-6 py-3 font-medium text-black hover:bg-gray-200"
        >
          Сохранить
        </button>
        {message && <p className="text-sm text-red-400">{message}</p>}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Мои документы ({docs.length})</h2>
        {docs.length === 0 && (
          <p className="text-gray-400">Пока пусто. Добавь первый документ.</p>
        )}
        {docs.map((doc) => (
          <article key={doc.id} className="rounded-lg border border-gray-700 p-4">
            <div className="flex items-start justify-between gap-4">
              <h3 className="font-medium">{doc.title}</h3>
              <button
                onClick={() => handleDelete(doc.id)}
                className="text-sm text-gray-400 hover:text-red-400"
              >
                Удалить
              </button>
            </div>
            <p className="mt-2 line-clamp-3 text-sm text-gray-400">{doc.content}</p>
          </article>
        ))}
      </section>
    </main>
  );
}