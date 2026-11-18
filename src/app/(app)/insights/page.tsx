"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { useShell } from "@/components/AppShell";
import {
  analyze,
  analysisPayload,
  localSummary,
  PERIOD_LABEL,
  type CategoryStat,
  type Period,
} from "@/lib/finance";
import { formatCompact, formatRp, formatShortDate, todayISO, toISODate } from "@/lib/format";
import { getCategory } from "@/lib/categories";
import { Button, Chip, EmptyState, Eyebrow, PageHeader, ProgressBar, TextField } from "@/components/ui";
import { CategoryBadge, TransactionRow } from "@/components/TransactionRow";
import { IconCash, IconChevron, IconDigital, IconSparkle } from "@/components/Icons";

const PERIODS: Period[] = ["7days", "month", "3months", "6months", "year", "all", "custom"];

function defaultMonthStart(): string {
  const d = new Date();
  return toISODate(new Date(d.getFullYear(), d.getMonth(), 1));
}

export default function InsightsPage() {
  const { data } = useStore();
  const { openEdit } = useShell();
  const [period, setPeriod] = useState<Period>("month");
  const [customStart, setCustomStart] = useState<string>(defaultMonthStart);
  const [customEnd, setCustomEnd] = useState<string>(todayISO);
  const [aiText, setAiText] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const a = useMemo(
    () => analyze(data, period, new Date(), { start: customStart, end: customEnd }),
    [data, period, customStart, customEnd],
  );
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
      <PageHeader eyebrow="Analisis & riwayat periode" title="Insights" />

      {/* Pemilih Periode Fleksibel */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {PERIODS.map((p) => (
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

      {/* Rentang Tanggal Kustom */}
      {period === "custom" && (
        <div className="card grid grid-cols-2 gap-3 p-4">
          <TextField
            label="From"
            type="date"
            value={customStart}
            onChange={(e) => {
              setCustomStart(e.target.value);
              setAiText(null);
            }}
          />
          <TextField
            label="To"
            type="date"
            value={customEnd}
            onChange={(e) => {
              setCustomEnd(e.target.value);
              setAiText(null);
            }}
          />
        </div>
      )}

      {a.transactions.length === 0 ? (
        <EmptyState title="Belum ada transaksi" hint="Tidak ada transaksi pada rentang waktu yang dipilih." />
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
            <div className="mt-4 flex w-full justify-between rounded-2xl bg-soft px-4 py-2.5 text-xs">
              <span className="inline-flex items-center gap-1.5">
                <IconDigital width={15} height={15} className="text-muted" /> Digital:{" "}
                <b className="num text-ink">{formatRp(a.digitalExpense)}</b>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <IconCash width={15} height={15} className="text-muted" /> Cash:{" "}
                <b className="num text-ink">{formatRp(a.cashExpense)}</b>
              </span>
            </div>
          </section>

          {/* Rincian per kategori */}
          {a.categories.length > 0 && (
            <section>
              <Eyebrow className="mb-2">Top Categories</Eyebrow>
              <div className="card divide-y divide-line px-4">
                {a.categories.map((c) => (
                  <div key={c.id} className="py-3.5">
                    <div className="mb-2 flex items-center gap-3">
                      <CategoryBadge id={c.id} size={36} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{c.label}</p>
                        <p className="text-xs text-muted">{c.count} transaksi</p>
                      </div>
                      <div className="text-right">
                        <p className="num text-sm font-medium">{formatRp(c.total)}</p>
                        <p className="num text-xs text-muted">{Math.round(c.share * 100)}%</p>
                      </div>
                    </div>
                    <ProgressBar value={c.share} color="var(--ink)" />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Pengeluaran terbesar */}
          {a.biggest && (
            <section className="card flex items-center justify-between p-4">
              <div>
                <Eyebrow>Biggest Expense</Eyebrow>
                <p className="mt-1 text-sm font-medium">
                  {a.biggest.note || getCategory(a.biggest.category).label}
                </p>
                <p className="text-xs text-muted">{formatShortDate(a.biggest.date)}</p>
              </div>
              <p className="num font-serif text-2xl text-ink">{formatRp(a.biggest.amount)}</p>
            </section>
          )}

          {/* Sejarah Transaksi pada Periode Ini */}
          <details className="card group px-4 py-3.5">
            <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium">
              <div>
                <Eyebrow>Period History</Eyebrow>
                <p className="mt-0.5 text-sm">
                  Sejarah Transaksi ({a.transactions.length} catatan)
                </p>
              </div>
              <IconChevron width={17} height={17} className="text-muted transition group-open:rotate-90" />
            </summary>
            <div className="mt-3 divide-y divide-line border-t border-line pt-1">
              {a.transactions.map((tx) => (
                <TransactionRow key={tx.id} tx={tx} onClick={() => openEdit(tx)} showDate />
              ))}
            </div>
          </details>
        </>
      )}

      <div className="double-rule" />

      {/* Ringkasan AI */}
      <section className="card p-5">
        <p className="flex items-center gap-1.5 font-serif text-lg italic text-ink">
          <IconSparkle width={17} height={17} className="text-oro" /> AI Summary
        </p>

        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted">
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
          <IconSparkle width={17} height={17} />
          {aiLoading ? "Menganalisis…" : "Minta saran mendalam"}
        </Button>
      </section>
    </div>
  );
}

/** Diagram donat SVG murni dengan palet monokrom-hangat Italia. */
function Donut({ stats, total }: { stats: CategoryStat[]; total: number }) {
  const size = 184;
  const stroke = 20;
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
