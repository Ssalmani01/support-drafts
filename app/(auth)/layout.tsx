import { I18nProvider } from "@/lib/i18n/provider";

// Каркас страниц входа: только язык, без бокового меню.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <I18nProvider>{children}</I18nProvider>;
}