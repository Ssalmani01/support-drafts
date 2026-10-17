"use client";
// Страница: вставляешь вопрос клиента, получаешь черновик ответа.

import { useState } from "react";

export default function DraftPage() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    setError("");
    setAnswer("");

    try {
      // Отправляем вопрос на наш серверный маршрут.
      const res = await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Что-то пошло не так");
      } else {
        setAnswer(data.answer);
      }
    } catch {
      setError("Нет связи с сервером");
    }

    setLoading(false);
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-8">
      <h1 className="text-2xl font-bold">Черновик ответа клиенту</h1>

      <textarea
        placeholder="Вставь вопрос клиента"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        rows={5}
        className="w-full rounded-lg border border-gray-600 bg-transparent p-3"
      />

      <button
        onClick={handleGenerate}
        disabled={loading || !question.trim()}
        className="rounded-lg bg-white px-6 py-3 font-medium text-black hover:bg-gray-200 disabled:opacity-50"
      >
        {loading ? "Думаю..." : "Получить черновик"}
      </button>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {answer && (
        <section className="space-y-3 rounded-lg border border-gray-700 p-4">
          <h2 className="font-semibold">Черновик</h2>
          {/* whitespace-pre-wrap сохраняет переносы строк из ответа */}
          <p className="whitespace-pre-wrap text-gray-200">{answer}</p>
          <button
            onClick={() => navigator.clipboard.writeText(answer)}
            className="text-sm text-gray-400 hover:text-white"
          >
            Скопировать
          </button>
        </section>
      )}
    </main>
  );
}