import Link from "next/link";
import { APP_NAME } from "@/lib/i18n/config";
import { primaryButton } from "@/lib/ui";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-4xl font-bold">{APP_NAME}</h1>
      <p className="max-w-xl text-lg text-gray-600">
        Завантажте документацію свого сервісу та отримуйте чернетки відповідей клієнтам
        із посиланнями на джерела.
      </p>
      <Link href="/login" className={primaryButton}>
        Увійти
      </Link>
    </main>
  );
}