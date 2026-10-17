// Превращает тексты в векторы через Google Gemini.
// Используется тот же ключ GEMINI_API_KEY, что и для ответов.

// Размер вектора. Должен совпадать с vector(768) в базе данных.
// Если поменяешь модель или размер, все документы придётся проиндексировать заново.
const DIMENSIONS = 768;

// RETRIEVAL_DOCUMENT для кусков документов, RETRIEVAL_QUERY для вопросов:
// так модель лучше подбирает пары «вопрос и подходящий ответ».
type TaskType = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

export async function embedTexts(texts: string[], taskType: TaskType): Promise<number[][]> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY не задан в .env.local");
  const model = process.env.GEMINI_EMBEDDING_MODEL ?? "gemini-embedding-001";

  const result: number[][] = [];

  // Отправляем по 100 текстов за запрос (лимит сервиса).
  for (let i = 0; i < texts.length; i += 100) {
    const batch = texts.slice(i, i + 100);

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:batchEmbedContents`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          requests: batch.map((text) => ({
            model: `models/${model}`,
            content: { parts: [{ text }] },
            taskType,
            outputDimensionality: DIMENSIONS,
          })),
        }),
      }
    );

    if (!res.ok) throw new Error(`Embeddings ${res.status}: ${await res.text()}`);

    const data = await res.json();
    const vectors: number[][] | undefined = data.embeddings?.map(
      (e: { values: number[] }) => e.values
    );

    if (!vectors || vectors.length !== batch.length) {
      throw new Error("Неожиданный ответ сервиса эмбеддингов");
    }
    for (const v of vectors) {
      if (v.length !== DIMENSIONS) {
        throw new Error(`Размер вектора ${v.length}, ожидалось ${DIMENSIONS}`);
      }
    }
    result.push(...vectors);
  }

  return result;
}