// Главная страница сайта. В Next.js файл page.tsx внутри папки app
// автоматически становится страницей по адресу "/".

export default function Home() {
  // Эта функция называется компонентом: она возвращает кусок интерфейса.
  // То, что внутри return, похоже на HTML и называется JSX.
  return (
    // Классы Tailwind (flex, min-h-screen и т.д.) задают стили прямо в разметке.
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-4xl font-bold">Інструмент для підтримки клієнтів</h1>

      <p className="max-w-xl text-lg text-gray-400">
       Завантаж документацію свого сервісу та отримуй чернетки відповідей
       клієнтам із посиланнями на джерела.
      </p>

      <button className="rounded-lg bg-white px-6 py-3 font-medium text-black hover:bg-gray-200">
        Незабаром відкриття!
      </button>
    </main>
  );
}