import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Шрифт Geist из шаблона не поддерживает кириллицу, поэтому берём Inter.
const inter = Inter({ subsets: ["latin", "cyrillic"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "SupportDraft",
  description: "Чернетки відповідей клієнтам на основі вашої документації",
};

// Этот маленький скрипт выполняется до отрисовки страницы и сразу ставит нужную тему:
// сохранённую вручную, а если её нет, то системную.
const themeScript = `(function(){try{var t=localStorage.getItem("theme");var dark=t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",dark);}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning нужен, потому что скрипт меняет класс <html> до загрузки React.
    <html lang="uk" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}