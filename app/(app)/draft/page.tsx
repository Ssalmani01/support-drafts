"use client";
// Страница черновиков: вопрос клиента → ответ по документации + оценка.

import { useState } from "react";
import { Check, Copy, ThumbsDown, ThumbsUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/provider";
import { cardClass, inputClass, primaryButton } from "@/lib/ui";

export default function DraftPage() {
  const supabase = createClient();
  const { d } = useI18n();
  const t = d.draft;

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [draftId, setDraftId] = useState<string | null>(null);
  const [rating, setRating] = useState<1 | -1 | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    setError("");
    setAnswer("");
    setDraftId(null);
    setRating(null);

    try {
      const res = await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? d.common.somethingWrong);
      } else {
        setAnswer(data.answer);
        setDraftId(data.id);
      }
    } catch {
      setError(d.common.noConnection);
    }

    setLoading(false);
  }

  // Сохраняем оценку. Повторный клик по той же кнопке снимает оценку.
  async function handleRate(value: 1 | -1) {
    if (!draftId) return;

    const newRating = rating === value ? null : value;
    const { error } = await supabase
      .from("drafts")
      .update({ rating: newRating })
      .eq("id", draftId);

    if (error) {
      setError(`${t.rateError}: ${error.message}`);
      return;
    }
    setRating(newRating);
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t.title}</h1>
        <p className="mt-1 text-gray-500">{t.subtitle}</p>
      </div>

      <section className={`${cardClass} space-y-4`}>
        <textarea
          placeholder={t.placeholder}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={5}
          className={inputClass}
        />
        <button
          onClick={handleGenerate}
          disabled={loading || !question.trim()}
          className={primaryButton}
        >
          {loading ? t.thinking : t.generate}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </section>

      {answer && (
        <section className={`${cardClass} space-y-4`}>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            {t.result}
          </h2>
          {/* whitespace-pre-wrap сохраняет переносы строк из ответа */}
          <p className="whitespace-pre-wrap leading-relaxed text-gray-800">{answer}</p>

          <div className="flex flex-wrap items-center gap-4 border-t border-gray-100 pt-4">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? t.copied : t.copy}
            </button>

            {/* Кнопки оценки показываем, только если черновик сохранён */}
            {draftId && (
              <div className="ml-auto flex items-center gap-2">
                <span className="text-sm text-gray-500">{t.useful}</span>
                <button
                  onClick={() => handleRate(1)}
                  aria-label="👍"
                  aria-pressed={rating === 1}
                  className={`rounded-lg border p-2 transition ${
                    rating === 1
                      ? "border-emerald-500 bg-emerald-50 text-emerald-600"
                      : "border-gray-300 text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  <ThumbsUp size={16} />
                </button>
                <button
                  onClick={() => handleRate(-1)}
                  aria-label="👎"
                  aria-pressed={rating === -1}
                  className={`rounded-lg border p-2 transition ${
                    rating === -1
                      ? "border-red-500 bg-red-50 text-red-600"
                      : "border-gray-300 text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  <ThumbsDown size={16} />
                </button>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}