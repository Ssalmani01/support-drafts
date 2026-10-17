import { I18nProvider } from "@/lib/i18n/provider";
import { AppShell } from "@/components/app-shell";

// Каркас кабинета: язык + боковое меню + проверка входа.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <AppShell>{children}</AppShell>
    </I18nProvider>
  );
}