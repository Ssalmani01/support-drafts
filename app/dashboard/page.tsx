"use client";
// Личный кабинет: документы пользователя. Добавить можно тремя способами:
// вставить текст, загрузить файл .txt/.md или импортировать по ссылке.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";


type Doc = { id: string; title: string; content: string; created_at: string };

const MAX_FILE_BYTES = 500_000; // файл не больше 500 КБ
const MAX_CHARS = 100_000; // текст документа не больше 100 000 символов

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState<string | null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState(""); // ошибки (красным)
  const [info, setInfo] = useState(""); // подсказки (серым)
  const [saving, setSaving] = useState(false);

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

  // Загрузка файла .txt или .md: читаем его в браузере и кладём в форму.
  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // сбрасываем, чтобы можно было выбрать тот же файл снова
    if (!file) return;

    setMessage("");
    setInfo("");

    const name = file.name.toLowerCase();
    if (!name.endsWith(".txt") && !name.endsWith(".md") && !name.endsWith(".markdown")) {
      setMessage("Поддерживаются файлы .txt и .md");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setMessage("Файл слишком большой (больше 500 КБ)");
      return;
    }

    const text = await file.text(); // читается как UTF-8
    // Символ \uFFFD появляется, когда файл сохранён в другой кодировке.
    if (text.includes("\uFFFD")) {
      setMessage("Не удалось прочитать файл: сохрани его в кодировке UTF-8");
      return;
    }
    if (text.length > MAX_CHARS) {
      setMessage("В файле больше 100 000 символов. Раздели его на части.");
      return;
    }

    // Название берём из имени файла, если пользователь ещё ничего не ввёл.
    setTitle((t) => t || file.name.replace(/\.[^.]+$/, ""));
    setContent(text);
    setInfo("Файл загружен. Проверь текст и нажми «Сохранить».");
  }

  // Импорт по ссылке: просим сервер скачать страницу и достать текст.
  async function handleImport() {
    if (!url.trim()) return;

    setImporting(true);
    setMessage("");
    setInfo("");

    try {
      const res = await fetch("/api/import-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error ?? "Не удалось импортировать страницу");
      } else {
        setTitle(data.title);
        setContent(data.content);
        setInfo(
          data.truncated
            ? "Страница длинная: взята первая часть текста. Проверь его и нажми «Сохранить»."
            : "Текст получен. Проверь его и нажми «Сохранить»."
        );
      }
    } catch {
      setMessage("Нет связи с сервером");
    }

    setImporting(false);
  }

    // Сохранение документа: отправляем на сервер, он сам нарежет текст
  // на куски и проиндексирует его для поиска.
  async function handleAdd() {
    if (!title.trim() || !content.trim()) {
      setMessage("Заполни название и текст документа.");
      return;
    }
    if (content.length > MAX_CHARS) {
      setMessage("Текст слишком длинный (больше 100 000 символов).");
      return;
    }
    setMessage("");
    setInfo("");
    setSaving(true);

    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error ?? "Не удалось сохранить документ");
        setSaving(false);
        return;
      }
    } catch {
      setMessage("Нет связи с сервером");
      setSaving(false);
      return;
    }

    setSaving(false);
    setTitle("");
    setContent("");
    setUrl("");
    loadDocs();
  }

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
        <div className="flex items-center gap-3">
          <Link href="/draft" className="rounded-lg bg-white px-4 py-2 font-medium text-black hover:bg-gray-200">
            Черновики
          </Link>
          <button
            onClick={handleSignOut}
            className="rounded-lg border border-gray-600 px-4 py-2 hover:bg-gray-800"
          >
            Выйти
          </button>
        </div>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Добавить документ</h2>

        {/* Способ 1: файл */}
        <div>
          <label className="mb-1 block text-sm text-gray-400">Загрузить файл (.txt, .md)</label>
          <input
            type="file"
            accept=".txt,.md,.markdown,text/plain,text/markdown"
            onChange={handleFile}
            className="text-sm text-gray-400 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-800 file:px-4 file:py-2 file:text-white hover:file:bg-gray-700"
          />
        </div>

        {/* Способ 2: ссылка */}
        <div>
          <label className="mb-1 block text-sm text-gray-400">Или импортировать по ссылке</label>
          <div className="flex gap-2">
            <input
              placeholder="https://example.com/help/spf"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1 rounded-lg border border-gray-600 bg-transparent p-3"
            />
            <button
              onClick={handleImport}
              disabled={importing || !url.trim()}
              className="rounded-lg border border-gray-600 px-4 hover:bg-gray-800 disabled:opacity-50"
            >
              {importing ? "Загружаю..." : "Импортировать"}
            </button>
          </div>
        </div>

        {/* Способ 3: вручную. Сюда же попадает текст из файла и ссылки. */}
        <input
          placeholder="Название (например, «Как сбросить пароль»)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border border-gray-600 bg-transparent p-3"
        />
        <textarea
          placeholder="Текст документации (можно вставить вручную)"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={8}
          className="w-full rounded-lg border border-gray-600 bg-transparent p-3"
        />
        <button
          onClick={handleAdd}
          disabled={saving}
          className="rounded-lg bg-white px-6 py-3 font-medium text-black hover:bg-gray-200 disabled:opacity-50"
        >
          {saving ? "Индексирую..." : "Сохранить"}
        </button>

        {info && <p className="text-sm text-gray-300">{info}</p>}
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