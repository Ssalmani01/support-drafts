"use client";
// Обзор: статистика и чек-лист «С чего начать».

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, FileText, MessageSquareText, ThumbsUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/provider";
import { cardClass, primaryButton } from "@/lib/ui";

type Stats = { documents: number; drafts: number; rated: number };

export default function OverviewPage() {
  const supabase = createClient();
  const { d } = useI18n();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    async function load() {
      // head: true означает «вернуть только количество, без самих строк».
      const [docs, drafts, rated] = await Promise.all([
        supabase.from("documents").select("id", { count: "exact", head: true }),
        supabase.from("drafts").select("id", { count: "exact", head: true }),
        supabase
          .from("drafts")
          .select("id", { count: "exact", head: true })
          .not("rating", "is", null),
      ]);
      setStats({
        documents: docs.count ?? 0,
        drafts: drafts.count ?? 0,
        rated: rated.count ?? 0,
      });
    }
    load();
  }, []);

  if (!stats) {
    return <p className="text-gray-500">{d.common.loading}</p>;
  }

  const cards = [
    { label: d.overview.statDocuments, value: stats.documents, icon: FileText },
    { label: d.overview.statDrafts, value: stats.drafts, icon: MessageSquareText },
    { label: d.overview.statRated, value: stats.rated, icon: ThumbsUp },
  ];

  // Каждый шаг отмечается выполненным, когда в базе появляются нужные данные.
  const steps = [
    {
      done: stats.documents > 0,
      title: d.overview.step1,
      text: d.overview.step1Text,
      href: "/documents",
      button: d.overview.step1Button,
    },
    {
      done: stats.drafts > 0,
      title: d.overview.step2,
      text: d.overview.step2Text,
      href: "/draft",
      button: d.overview.step2Button,
    },
    {
      done: stats.rated > 0,
      title: d.overview.step3,
      text: d.overview.step3Text,
      href: null,
      button: null,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">{d.overview.title}</h1>
        <p className="mt-1 text-gray-500">{d.overview.subtitle}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map(({ label, value, icon: Icon }) => (
          <div key={label} className={`${cardClass} flex items-center gap-4`}>
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-ink">
              <Icon size={20} />
            </span>
            <div>
              <div className="text-2xl font-bold">{value}</div>
              <div className="text-sm text-gray-500">{label}</div>
            </div>
          </div>
        ))}
      </div>

      <section className={cardClass}>
        <h2 className="mb-5 text-sm font-semibold uppercase tracking-wide text-gray-500">
          {d.overview.startTitle}
        </h2>
        <ul className="divide-y divide-gray-100">
          {steps.map((step) => (
            <li key={step.title} className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
              <span
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                  step.done ? "bg-emerald-500 text-on-accent" : "border-2 border-gray-300"
                }`}
              >
                {step.done && <Check size={14} strokeWidth={3} />}
              </span>
              <div className="flex-1">
                <div className={`font-semibold ${step.done ? "text-gray-400 line-through" : ""}`}>
                  {step.title}
                </div>
                <p className="mt-0.5 text-sm text-gray-500">{step.text}</p>
                {!step.done && step.href && (
                  <Link href={step.href} className={`${primaryButton} mt-3`}>
                    {step.button}
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}