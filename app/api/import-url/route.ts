// API-маршрут: скачивает страницу по ссылке и возвращает её текст.
// Сервер ходит по адресу, который ввёл пользователь, поэтому нужна защита
// от SSRF: попыток достучаться через наш сервер до внутренних адресов
// (localhost, внутренняя сеть, служебные адреса облака).
import { NextResponse } from "next/server";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import * as cheerio from "cheerio";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs"; // модуль dns работает только в Node.js

const MAX_BYTES = 1_000_000; // не скачиваем больше 1 МБ
const MAX_CHARS = 100_000; // не сохраняем больше 100 000 символов текста
const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 10_000;
const BLOCKED = "Этот адрес недоступен для импорта";

// Свой класс ошибки: его сообщение можно безопасно показать пользователю.
class ImportError extends Error {}

// --- Проверка адресов -------------------------------------------------------

function isPrivateIPv4(ip: string): boolean {
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || // общая сеть операторов
    (a === 169 && b === 254) || // служебный адрес облака (169.254.169.254)
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224 // мультикаст и зарезервированные
  );
}

function isPrivateIPv6(ip: string): boolean {
  const v = ip.toLowerCase();
  if (v === "::" || v === "::1") return true;

  // IPv4, спрятанный внутри IPv6: ::ffff:127.0.0.1 или ::ffff:7f00:1
  if (v.startsWith("::ffff:")) {
    const rest = v.slice(7);
    if (rest.includes(".")) return isPrivateIPv4(rest);
    const parts = rest.split(":");
    if (parts.length === 2) {
      const hi = parseInt(parts[0], 16);
      const lo = parseInt(parts[1], 16);
      return isPrivateIPv4(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`);
    }
    return true;
  }

  return (
    v.startsWith("fc") || // внутренние адреса (ULA)
    v.startsWith("fd") ||
    /^fe[89ab]/.test(v) || // локальные адреса канала
    v.startsWith("ff") // мультикаст
  );
}

function isPrivateIp(ip: string): boolean {
  return isIP(ip) === 4 ? isPrivateIPv4(ip) : isPrivateIPv6(ip);
}

// Проверяем ссылку: только http/https, без логина, стандартные порты,
// и адрес сайта должен вести в публичный интернет.
async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new ImportError("Некорректная ссылка");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new ImportError("Поддерживаются только ссылки http и https");
  }
  if (url.username || url.password) {
    throw new ImportError("Ссылки с логином и паролем не поддерживаются");
  }
  if (url.port && url.port !== "80" && url.port !== "443") {
    throw new ImportError("Нестандартные порты не поддерживаются");
  }

  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();

  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    throw new ImportError(BLOCKED);
  }

  // Если в ссылке сразу IP-адрес, проверяем его.
  if (isIP(host)) {
    if (isPrivateIp(host)) throw new ImportError(BLOCKED);
    return url;
  }

  // Иначе узнаём, на какие IP указывает имя сайта, и проверяем все.
  let addresses: { address: string }[];
  try {
    addresses = await lookup(host, { all: true });
  } catch {
    throw new ImportError("Не удалось найти сайт по этому адресу");
  }
  if (addresses.some((a) => isPrivateIp(a.address))) {
    throw new ImportError(BLOCKED);
  }
  return url;
}

// --- Скачивание -------------------------------------------------------------

// Редиректы обрабатываем сами и проверяем каждый адрес заново: иначе
// безобидный сайт мог бы перенаправить нас на внутренний адрес.
async function fetchPage(startUrl: string): Promise<Response> {
  let current = startUrl;

  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const url = await assertPublicUrl(current);
    const res = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        "User-Agent": "SupportDraftBot/1.0",
        Accept: "text/html,text/plain;q=0.9",
      },
    });

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      await res.body?.cancel();
      if (!location) throw new ImportError("Сайт вернул перенаправление без адреса");
      current = new URL(location, url).toString();
      continue;
    }
    return res;
  }
  throw new ImportError("Слишком много перенаправлений");
}

// Читаем ответ по кусочкам и останавливаемся, если он больше лимита.
async function readLimited(res: Response): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) throw new ImportError("Сайт вернул пустой ответ");

  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > MAX_BYTES) {
      await reader.cancel();
      throw new ImportError("Страница слишком большая (больше 1 МБ)");
    }
    chunks.push(value);
  }
  return new TextDecoder("utf-8").decode(Buffer.concat(chunks));
}

// --- Извлечение текста ------------------------------------------------------

function extractText(html: string, fallbackTitle: string) {
  const $ = cheerio.load(html);

  // Заголовок берём до чистки: h1 может лежать внутри удаляемого header.
  const title = (
    $("title").first().text() ||
    $("h1").first().text() ||
    fallbackTitle
  ).trim();

  // Убираем всё, что не является содержимым статьи.
  $("script, style, noscript, nav, header, footer, aside, form, iframe, svg").remove();

  // Основной текст ищем в main или article, иначе берём всю страницу.
  const root = $("main").length ? $("main") : $("article").length ? $("article") : $("body");

  // Добавляем переносы строк, чтобы абзацы не слиплись в один.
  root.find("br").replaceWith("\n");
  root.find("p, div, li, h1, h2, h3, h4, h5, h6, tr, pre").append("\n");

  const text = root
    .text()
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n\n")
    .trim();

  return { title, text };
}

// --- Обработчик запроса -----------------------------------------------------

export async function POST(request: Request) {
  // Только для вошедших пользователей.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Нужно войти в аккаунт" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const rawUrl = typeof body?.url === "string" ? body.url.trim() : "";
  if (!rawUrl || rawUrl.length > 2048) {
    return NextResponse.json({ error: "Введи ссылку на страницу" }, { status: 400 });
  }

  try {
    const res = await fetchPage(rawUrl);
    if (!res.ok) {
      throw new ImportError(`Сайт ответил с кодом ${res.status}`);
    }

    const type = (res.headers.get("content-type") ?? "").toLowerCase();
    const host = new URL(rawUrl).hostname;
    let title: string;
    let text: string;

    if (type.includes("text/plain")) {
      // Например, сырой Markdown-файл: берём как есть.
      title = host;
      text = (await readLimited(res)).trim();
    } else if (type.includes("html")) {
      ({ title, text } = extractText(await readLimited(res), host));
    } else {
      await res.body?.cancel();
      throw new ImportError("Поддерживаются только HTML-страницы и текстовые файлы");
    }

    // Страницы на JavaScript без готового текста отдают почти пустой HTML.
    if (text.length < 200) {
      throw new ImportError(
        "Не удалось получить текст. Возможно, страница строится скриптами. Вставь текст вручную."
      );
    }

    return NextResponse.json({
      title: title.slice(0, 200),
      content: text.slice(0, MAX_CHARS),
      truncated: text.length > MAX_CHARS,
    });
  } catch (e) {
    if (e instanceof ImportError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("Ошибка импорта:", e);
    return NextResponse.json({ error: "Не удалось загрузить страницу" }, { status: 502 });
  }
}