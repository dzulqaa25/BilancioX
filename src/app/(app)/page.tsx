"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { useShell } from "@/components/AppShell";
import { analyze, localSummary, netBalance, totalDebt, totalSavings } from "@/lib/finance";
import { formatCompact, formatMonthTitle, formatRp, greeting, todayISO } from "@/lib/format";
import { parseMessageLocal, type ParsedIntent } from "@/lib/parser";
import { EmptyState, Eyebrow, PageHeader } from "@/components/ui";
import { TransactionRow } from "@/components/TransactionRow";
import { IconChevron, IconShare, IconSparkle } from "@/components/Icons";

export default function HomePage() {
  const { data, mode, session, addTransaction, addDebt, addEntry } = useStore();
  const { openNew, openEdit } = useShell();
  const [quickNotice, setQuickNotice] = useState<string | null>(null);
  const handledQuick = useRef(false);

  // Mendukung input cepat dari iOS Shortcut via URL: /?quick=nasi+padang+22rb
  useEffect(() => {
    if (handledQuick.current) return;
    const params = new URLSearchParams(window.location.search);
    const q = params.get("quick")?.trim();
    if (!q) return;
    handledQuick.current = true;
    window.history.replaceState({}, "", "/");

    fetch("/api/ai/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: q }),
    })
      .then((r) => (r.ok ? (r.json() as Promise<ParsedIntent>) : parseMessageLocal(q, "shortcut")))
      .catch(() => parseMessageLocal(q, "shortcut"))
      .then(async (intent) => {
        if (intent.kind === "transaction") await addTransaction(intent.data);
        else if (intent.kind === "debt") await addDebt(intent.data);
        else if (intent.kind === "savings" && data.goals[0]) {
          const hint = intent.goalHint.toLowerCase();
          const goal = data.goals.find((g) => g.name.toLowerCase().includes(hint)) ?? data.goals[0];
          await addEntry({ goal_id: goal.id, amount: intent.amount, date: todayISO(), note: "via Shortcut" });
        }
        setQuickNotice(intent.reply.replace(/[*_]/g, ""));
      })
      .catch((err) => setQuickNotice(`Gagal menyimpan: ${err instanceof Error ? err.message : "Terjadi kesalahan"}`));
  }, [addTransaction, addDebt, addEntry, data.goals]);

  const balance = netBalance(data);
  const month = analyze(data, "month");
  const debtOwe = totalDebt(data, "owe");
  const debtOwed = totalDebt(data, "owed");
  const saved = totalSavings(data);
  const tip = localSummary(month)[0];
  const recent = data.transactions.slice(0, 5);
  const initial = (session?.user?.email?.[0] ?? "B").toUpperCase();

  return (
    <div className="animate-rise space-y-4">
      <PageHeader
        eyebrow={formatMonthTitle()}
        title={greeting()}
        right={
          <Link
            href="/settings"
            aria-label="Settings"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-oro font-serif text-sm"
          >
            {initial}
          </Link>
        }
      />

      {quickNotice && (
        <div className="card flex items-start justify-between gap-3 border-oliva p-3.5 text-xs leading-relaxed">
          <span className="whitespace-pre-line">{quickNotice}</span>
          <button onClick={() => setQuickNotice(null)} className="text-muted">
            ✕
          </button>
        </div>
      )}

      {mode === "demo" && (
        <Link href="/settings" className="card flex items-center justify-between px-4 py-2.5 text-xs">
          <span>
            <b className="text-terracotta">Demo Mode</b> · data tersimpan di perangkat ini
          </span>
          <span className="text-muted">Atur →</span>
        </Link>
      )}

      {/* Kartu lengkung utama */}
      <section className="arch bg-hero px-6 pt-9 pb-6 text-center text-hero-ink shadow-[0_20px_40px_-20px_rgba(43,33,28,0.55)]">
        <p className="text-xs uppercase tracking-[0.26em] opacity-70">Net Balance</p>
        <p className="num mt-1.5 font-serif text-4xl">{formatRp(balance)}</p>
        <div className="rule-oro my-4 opacity-60" />
        <div className="flex justify-around text-xs">
          <button onClick={() => openNew("income")} className="active:opacity-70">
            <span className="text-[#a7b56e]">▲</span> Income{" "}
            <b className="num">{formatCompact(month.income)}</b>
          </button>
          <span className="opacity-30">|</span>
          <button onClick={() => openNew("expense")} className="active:opacity-70">
            <span className="text-[#e58b6b]">▼</span> Expense{" "}
            <b className="num">{formatCompact(month.expense)}</b>
          </button>
        </div>
      </section>

      {/* Kartu ringkas Hutang & Tabungan */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/savings?tab=debts" className="card p-4 active:scale-[0.99]">
          <Eyebrow>Debts</Eyebrow>
          <p className="num mt-1 text-lg font-semibold text-amalfi">{formatRp(debtOwe)}</p>
          <p className="mt-0.5 text-xs text-muted">
            {debtOwed > 0 ? `Piutang ${formatCompact(debtOwed)}` : "Hutang berjalan"}
          </p>
        </Link>
        <Link href="/savings" className="card p-4 active:scale-[0.99]">
          <Eyebrow>Savings</Eyebrow>
          <p className="num mt-1 text-lg font-semibold text-limone">{formatRp(saved)}</p>
          <p className="mt-0.5 text-xs text-muted">{data.goals.length} target aktif</p>
        </Link>
      </div>

      {/* Kartu AI Insight */}
      <Link href="/insights" className="card block border-oro p-4 active:scale-[0.99]">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 font-serif text-base italic text-terracotta">
            <IconSparkle width={16} height={16} /> AI Insight
          </p>
          <IconChevron width={18} height={18} className="text-muted" />
        </div>
        <p className="mt-1 text-sm leading-relaxed">{tip}</p>
      </Link>

      {/* Transaksi terbaru */}
      <section className="pt-2">
        <div className="mb-2 flex items-center justify-between">
          <Eyebrow>Recent Activity</Eyebrow>
          <Link href="/transactions" className="text-xs font-medium text-terracotta">
            See all →
          </Link>
        </div>
        {recent.length === 0 ? (
          <EmptyState title="Belum ada transaksi" hint="Ketuk tombol + di bawah untuk mencatat pemasukan atau pengeluaran." />
        ) : (
          <div className="card divide-y divide-line px-4">
            {recent.map((tx) => (
              <TransactionRow key={tx.id} tx={tx} onClick={() => openEdit(tx)} showDate />
            ))}
          </div>
        )}
      </section>

      <InstallPrompt />
    </div>
  );
}

/** Petunjuk memasang PWA ke layar utama iPhone (hanya muncul di iOS jika belum terpasang). */
function InstallPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    const dismissed = window.localStorage.getItem("bilancio:install-dismissed") === "1";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- membaca kemampuan browser saat mount
    if (isIOS && !standalone && !dismissed) setShow(true);
  }, []);

  if (!show) return null;

  return (
    <div className="card flex items-start gap-3 p-4 text-xs">
      <IconShare className="mt-0.5 shrink-0 text-terracotta" />
      <div className="flex-1 leading-relaxed">
        <p className="font-semibold text-ink">Install on iPhone</p>
        <p className="text-muted">
          Ketuk tombol <b>Share</b> di Safari lalu pilih <b>Add to Home Screen</b> agar Bilancio tampil layar penuh seperti aplikasi.
        </p>
      </div>
      <button
        onClick={() => {
          window.localStorage.setItem("bilancio:install-dismissed", "1");
          setShow(false);
        }}
        className="text-muted"
      >
        ✕
      </button>
    </div>
  );
}
