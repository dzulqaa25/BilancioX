"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import {
  analyze,
  analysisPayload,
  localSummary,
  PERIOD_LABEL,
  type CategoryStat,
  type Period,
} from "@/lib/finance";
import { formatCompact, formatRp, formatShortDate } from "@/lib/format";
import { getCategory } from "@/lib/categories";
import { Button, Chip, EmptyState, Eyebrow, PageHeader, ProgressBar } from "@/components/ui";
import { CategoryBadge } from "@/components/TransactionRow";
import { IconSparkle } from "@/components/Icons";

export default function InsightsPage() {
  const { data } = useStore();
  const [period, setPeriod] = useState<Period>("month");
  const [aiText, setAiText] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const a = useMemo(() => analyze(data, period), [data, period]);
  const tips = useMemo(() => localSummary(a), [a]);

  async function askGemini() {
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai/insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(analysisPayload(a)),
      });
      const json = (await res.json()) as { text?: string; error?: string };
      setAiText(json.text ?? json.error ?? "Tidak ada respons.");
    } catch {
      setAiText("Tidak dapat menghubungi server.");
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div className="animate-rise space-y-5">
      <PageHeader eyebrow="Ringkasan & pola pengeluaran" title="Insights" />

      <div className="flex gap-2">
        {(["month", "3months", "year"] as Period[]).map((p) => (
          <Chip
            key={p}
            active={period === p}
            onClick={() => {
              setPeriod(p);
              setAiText(null);
            }}
          >
            {PERIOD_LABEL[p]}
          </Chip>
        ))}
      </div>

      {a.expense === 0 ? (
        <EmptyState title="Belum ada pengeluaran" hint="Setelah kamu mencatat pengeluaran, grafik dan analisis akan muncul di sini." />
      ) : (
        <>
          {/* Diagram donat + total */}
          <section className="card flex flex-col items-center p-6">
            <Donut stats={a.categories} total={a.expense} />
            <div className="mt-5 grid w-full grid-cols-3 divide-x divide-line text-center text-xs">
              <div>
                <p className="text-muted">Income</p>
                <p className="num mt-0.5 font-semibold text-oliva">{formatCompact(a.income)}</p>
              </div>
              <div>
                <p className="text-muted">Daily Avg</p>
                <p className="num mt-0.5 font-semibold">{formatCompact(a.dailyAverage)}</p>
              </div>
              <div>
                <p className="text-muted">vs Prev.</p>
                <p className="num mt-0.5 font-semibold">
                  {a.expenseChange === null
                    ? "—"
                    : `${a.expenseChange >= 0 ? "+" : ""}${Math.round(a.expenseChange * 100)}%`}
                </p>
              </div>
            </div>
          </section>

          {/* Rincian per kategori */}
          <section>
            <Eyebrow className="mb-2">Top Categories</Eyebrow>
            <div className="card divide-y divide-line px-4">
              {a.categories.map((c) => (
                <div key={c.id} className="py-3.5">
                  <div className="mb-2 flex items-center gap-3">
                    <CategoryBadge id={c.id} size={36} />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{c.label}</p>
                      <p className="text-xs text-muted">{c.count} transaksi</p>
                    </div>
                    <div className="text-right">
                      <p className="num font-medium">{formatRp(c.total)}</p>
                      <p className="num text-xs text-muted">{Math.round(c.share * 100)}%</p>
                    </div>
                  </div>
                  <ProgressBar value={c.share} color={c.color} />
                </div>
              ))}
            </div>
          </section>

          {/* Pengeluaran terbesar */}
          {a.biggest && (
            <section className="card flex items-center justify-between p-4">
              <div>
                <Eyebrow>Biggest Expense</Eyebrow>
                <p className="mt-1 font-medium">
                  {a.biggest.note || getCategory(a.biggest.category).label}
                </p>
                <p className="text-xs text-muted">{formatShortDate(a.biggest.date)}</p>
              </div>
              <p className="num font-serif text-2xl text-terracotta">{formatRp(a.biggest.amount)}</p>
            </section>
          )}
        </>
      )}

      <div className="double-rule" />

      {/* Ringkasan AI */}
      <section className="card border-oro p-5">
        <p className="flex items-center gap-1.5 font-serif text-lg italic text-terracotta">
          <IconSparkle width={18} height={18} /> AI Summary
        </p>

        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed">
          {tips.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>

        {aiText && (
          <div className="mt-4 rounded-2xl bg-soft p-3.5 text-sm leading-relaxed whitespace-pre-line">
            {aiText}
          </div>
        )}

        <Button
          variant="ghost"
          className="mt-4"
          disabled={aiLoading || a.expense === 0}
          onClick={askGemini}
        >
          <IconSparkle width={18} height={18} />
          {aiLoading ? "Gemini sedang menganalisis…" : "Minta saran mendalam dari Gemini"}
        </Button>
      </section>
    </div>
  );
}

/** Diagram donat SVG murni tanpa library tambahan. */
function Donut({ stats, total }: { stats: CategoryStat[]; total: number }) {
  const size = 188;
  const stroke = 22;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const segments = stats.map((s, idx) => {
    const prevShare = stats.slice(0, idx).reduce((acc, item) => acc + item.share, 0);
    return { ...s, len: s.share * c, dashOffset: -(prevShare * c) };
  });

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--soft)" strokeWidth={stroke} />
        {segments.map((s) => (
          <circle
            key={s.id}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={s.color}
            strokeWidth={stroke}
            strokeDasharray={`${Math.max(0, s.len - 2)} ${c}`}
            strokeDashoffset={s.dashOffset}
          />
        ))}
      </svg>
      <div className="absolute text-center">
        <Eyebrow>Total Out</Eyebrow>
        <p className="num mt-0.5 font-serif text-2xl">{formatCompact(total)}</p>
      </div>
    </div>
  );
}
