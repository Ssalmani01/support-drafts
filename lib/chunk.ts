// Нарезка текста на куски для поиска по смыслу.
// Режем по абзацам, чтобы куски не обрывались посреди мысли.

const CHUNK_SIZE = 1200; // примерный размер куска в символах
const OVERLAP = 200; // сколько символов повторяем из предыдущего куска

export function chunkText(text: string): string[] {
  const clean = text.replace(/\r\n/g, "\n").trim();
  if (!clean) return [];

  // Абзацы разделены пустой строкой.
  const paragraphs = clean
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = "";

  const flush = () => {
    if (current.trim()) chunks.push(current.trim());
  };

  for (const para of paragraphs) {
    // Очень длинный абзац без пустых строк режем на части по размеру.
    if (para.length > CHUNK_SIZE) {
      flush();
      current = "";
      for (let i = 0; i < para.length; i += CHUNK_SIZE - OVERLAP) {
        chunks.push(para.slice(i, i + CHUNK_SIZE));
        if (i + CHUNK_SIZE >= para.length) break;
      }
      continue;
    }

    if (current && current.length + para.length + 2 > CHUNK_SIZE) {
      // Текущий кусок заполнен: сохраняем и начинаем новый с «хвоста» старого,
      // чтобы смысл на стыке не терялся.
      flush();
      current = current.slice(-OVERLAP) + "\n\n" + para;
    } else {
      current = current ? current + "\n\n" + para : para;
    }
  }
  flush();

  return chunks;
}