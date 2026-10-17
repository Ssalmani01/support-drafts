"use client";
// Документы: добавить (текст, файл .txt/.md, ссылка), посмотреть и удалить.

import { useEffect, useState } from "react";
import { FileText, Link2, Trash2, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/provider";
import { cardClass, inputClass, primaryButton, secondaryButton } from "@/lib/ui";

type Doc = { id: string; title: string; content: string; created_at: string };

const MAX_FILE_BYTES = 500_000; // файл не больше 500 КБ
const MAX_CHARS = 100_000; // текст документа не больше 100 000 символов

export default function DocumentsPage() {
  const supabase = createClient();
  const { d, locale } = useI18n();
  const t = d.documents; // короткое имя для текстов этой страницы

  const [docs, setDocs] = useState<Doc[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(""); // ошибки (красным)
  const [info, setInfo] = useState(""); // подсказки (серым)

  async function loadDocs() {
    const { data, error } = await supabase
      .from("documents")
      .select("id, title, content, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(`${t.loadError}: ${error.message}`);
      return;
    }
    setDocs(data ?? []);
  }

  useEffect(() => {
    loadDocs();
  }, []);

  // Загрузка файла: читаем его в браузере и кладём текст в форму.
  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // сбрасываем, чтобы можно было выбрать тот же файл снова
    if (!file) return;

    setMessage("");
    setInfo("");

    const name = file.name.toLowerCase();
    if (!name.endsWith(".txt") && !name.endsWith(".md") && !name.endsWith(".markdown")) {
      setMessage(t.fileUnsupported);
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setMessage(t.fileTooBig);
      return;
    }

    const text = await file.text(); // читается как UTF-8
    // Символ \uFFFD появляется, когда файл сохранён в другой кодировке.
    if (text.includes("\uFFFD")) {
      setMessage(t.fileEncoding);
      return;
    }
    if (text.length > MAX_CHARS) {
      setMessage(t.fileTooLong);
      return;
    }

    setTitle((prev) => prev || file.name.replace(/\.[^.]+$/, ""));
    setContent(text);
    setInfo(t.fileLoaded);
  }

  // Импорт по ссылке: сервер скачивает страницу и достаёт текст.
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
        setMessage(data.error ?? t.importError);
      } else {
        setTitle(data.title);
        setContent(data.content);
        setInfo(data.truncated ? t.importedTruncated : t.importedOk);
      }
    } catch {
      setMessage(d.common.noConnection);
    }

    setImporting(false);
  }

  // Сохранение: сервер режет текст на куски и индексирует его для поиска.
  async function handleAdd() {
    if (!title.trim() || !content.trim()) {
      setMessage(t.fillBoth);
      return;
    }
    if (content.length > MAX_CHARS) {
      setMessage(t.tooLong);
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
        setMessage(data.error ?? t.saveError);
        setSaving(false);
        return;
      }
    } catch {
      setMessage(d.common.noConnection);
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
      setMessage(`${t.deleteError}: ${error.message}`);
      return;
    }
    loadDocs();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">{t.title}</h1>
        <p className="mt-1 text-gray-500">{t.subtitle}</p>
      </div>

      <section className={`${cardClass} space-y-4`}>
        <h2 className="text-lg font-semibold">{t.addTitle}</h2>

        <div className="flex flex-col gap-3 sm:flex-row">
          {/* Скрытое поле выбора файла: нажимается через кнопку-подпись */}
          <label className={`${secondaryButton} cursor-pointer`}>
            <Upload size={16} />
            {t.uploadLabel}
            <input
              type="file"
              accept=".txt,.md,.markdown,text/plain,text/markdown"
              onChange={handleFile}
              className="hidden"
            />
          </label>

          <div className="flex flex-1 gap-2">
            <div className="relative flex-1">
              <Link2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                aria-label={t.urlLabel}
                placeholder={t.urlPlaceholder}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className={`${inputClass} pl-9`}
              />
            </div>
            <button
              onClick={handleImport}
              disabled={importing || !url.trim()}
              className={secondaryButton}
            >
              {importing ? t.importing : t.import}
            </button>
          </div>
        </div>

        <input
          placeholder={t.titlePlaceholder}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputClass}
        />
        <textarea
          placeholder={t.textPlaceholder}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={8}
          className={inputClass}
        />

        <button onClick={handleAdd} disabled={saving} className={primaryButton}>
          {saving ? t.saving : t.save}
        </button>

        {info && <p className="text-sm text-gray-600">{info}</p>}
        {message && <p className="text-sm text-red-600">{message}</p>}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          {t.listTitle} ({docs.length})
        </h2>
        {docs.length === 0 && <p className="text-gray-500">{t.empty}</p>}

        {docs.map((doc) => (
          <article key={doc.id} className={`${cardClass} flex items-start gap-4 p-4`}>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-ink">
              <FileText size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-semibold">{doc.title}</h3>
              <p className="text-xs text-gray-400">
                {new Date(doc.created_at).toLocaleDateString(locale)} · {doc.content.length}{" "}
                {t.chars}
              </p>
              <p className="mt-1 line-clamp-2 text-sm text-gray-500">{doc.content}</p>
            </div>
            <button
              onClick={() => handleDelete(doc.id)}
              title={t.delete}
              aria-label={t.delete}
              className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 size={18} />
            </button>
          </article>
        ))}
      </section>
    </div>
  );
}