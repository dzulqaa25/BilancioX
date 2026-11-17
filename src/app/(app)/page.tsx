"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { useShell } from "@/components/AppShell";
import {
  analyze,
  budgetOverview,
  localSummary,
  totalDebt,
  totalSavings,
  walletBalances,
  type BudgetBar,
} from "@/lib/finance";
import { formatCompact, formatMonthTitle, formatRp, greeting, todayISO } from "@/lib/format";
import { getCategory } from "@/lib/categories";
import { parseMessageLocal, walletLabel, type ParsedIntent } from "@/lib/parser";
import type { NewTransaction, WalletType } from "@/lib/types";
import { Sheet } from "@/components/Sheet";
import { AmountInput, Button, EmptyState, Eyebrow, PageHeader, ProgressBar, Segmented } from "@/components/ui";
import { TransactionRow } from "@/components/TransactionRow";
import { IconChevron, IconShare, IconSparkle } from "@/components/Icons";

export default function HomePage() {
  const { data, settings, mode, session, addTransaction, addDebt, addEntry, transferWallet } = useStore();
  const { openNew, openEdit } = useShell();
  const [quickNotice, setQuickNotice] = useState<string | null>(null);
  const [pendingTx, setPendingTx] = useState<NewTransaction | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const handledQuick = useRef(false);

  // Mendukung input cepat dari iOS Shortcut via URL: /?quick=nasi+padang+22rb
  useEffect(() => {
    if (handledQuick.current) return;
    const params = new URLSearchParams(window.location.search);
    const q = (params.get("quick") || params.get("q") || params.get("text"))?.trim();
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
        if (intent.kind === "transaction") {
          if (!intent.walletSpecified) {
            setPendingTx(intent.data);
            return;
          }
          await addTransaction(intent.data);
        } else if (intent.kind === "debt") {
          await addDebt(intent.data);
        } else if (intent.kind === "savings" && data.goals[0]) {
          const hint = intent.goalHint.toLowerCase();
          const goal = data.goals.find((g) => g.name.toLowerCase().includes(hint)) ?? data.goals[0];
          await addEntry({ goal_id: goal.id, amount: intent.amount, date: todayISO(), note: "via Shortcut" });
        }
        setQuickNotice(intent.reply.replace(/[*_]/g, ""));
      })
      .catch((err) => setQuickNotice(`Gagal menyimpan: ${err instanceof Error ? err.message : "Terjadi kesalahan"}`));
  }, [addTransaction, addDebt, addEntry, data.goals]);

  async function confirmPendingWallet(wallet: WalletType) {
    if (!pendingTx) return;
    const tx: NewTransaction = { ...pendingTx, wallet };
    setPendingTx(null);
    try {
      await addTransaction(tx);
      const cat = getCategory(tx.category);
      setQuickNotice(
        `✅ Tercatat (${tx.type === "income" ? "Pemasukan" : "Pengeluaran"} · ${walletLabel(wallet)})\n${cat.emoji} ${cat.label} · ${formatRp(tx.amount)} (${tx.note})`,
      );
    } catch (err) {
      setQuickNotice(`Gagal menyimpan: ${err instanceof Error ? err.message : "Terjadi kesalahan"}`);
    }
  }

  const wallets = walletBalances(data, settings);
  const budgets = budgetOverview(data, settings);
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

      {/* Pengingat jika Quick Input belum menyertakan cash / digital */}
      {pendingTx && (
        <div className="card space-y-3 border-oro p-4 text-xs">
          <p className="font-medium text-terracotta">
            💡 Kamu belum menuliskan jenis saldo (&ldquo;cash&rdquo; / &ldquo;digital&rdquo;).
          </p>
          <p className="text-ink">
            Pilih shortcut jenis saldo untuk menyimpan{" "}
            <b>
              {getCategory(pendingTx.category).emoji} {getCategory(pendingTx.category).label} ·{" "}
              {formatRp(pendingTx.amount)}
            </b>{" "}
            ({pendingTx.note}):
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => confirmPendingWallet("cash")}
              className="rounded-2xl bg-hero px-3 py-2.5 font-medium text-hero-ink active:scale-95"
            >
              💵 Cash (Tunai)
            </button>
            <button
              type="button"
              onClick={() => confirmPendingWallet("digital")}
              className="rounded-2xl bg-amalfi px-3 py-2.5 font-medium text-white active:scale-95"
            >
              💳 Saldo Digital
            </button>
          </div>
        </div>
      )}

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

      {/* Kartu lengkung utama + pembagian Saldo Cash & Digital */}
      <section className="arch bg-hero px-6 pt-9 pb-5 text-center text-hero-ink shadow-[0_20px_40px_-20px_rgba(43,33,28,0.55)]">
        <p className="text-xs uppercase tracking-[0.26em] opacity-70">Net Balance</p>
        <p className="num mt-1.5 font-serif text-4xl">{formatRp(wallets.total)}</p>

        {/* Rincian Saldo Digital vs Cash */}
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl bg-white/8 px-3 py-2.5 text-left text-xs">
          <div>
            <p className="opacity-70">💳 Digital</p>
            <p className="num mt-0.5 font-semibold">{formatRp(wallets.digital)}</p>
          </div>
          <div className="border-l border-white/15 pl-3">
            <p className="opacity-70">💵 Cash</p>
            <p className="num mt-0.5 font-semibold">{formatRp(wallets.cash)}</p>
          </div>
        </div>

        <div className="rule-oro my-3.5 opacity-60" />
        <div className="flex items-center justify-around text-xs">
          <button onClick={() => openNew("income")} className="active:opacity-70">
            <span className="text-[#a7b56e]">▲</span> Income <b className="num">{formatCompact(month.income)}</b>
          </button>
          <span className="opacity-30">|</span>
          <button onClick={() => openNew("expense")} className="active:opacity-70">
            <span className="text-[#e58b6b]">▼</span> Expense <b className="num">{formatCompact(month.expense)}</b>
          </button>
          <span className="opacity-30">|</span>
          <button onClick={() => setTransferOpen(true)} className="opacity-85 active:opacity-60">
            ⇄ Pindah
          </button>
        </div>
      </section>

      {/* Kartu Kontrol Budget (Harian, Mingguan, Bulanan) */}
      {budgets.hasAnyBudget ? (
        <section className="card space-y-3 p-4">
          <div className="flex items-center justify-between">
            <Eyebrow>Budget Control</Eyebrow>
            <Link href="/settings#advanced" className="text-xs font-medium text-terracotta">
              Edit Budget →
            </Link>
          </div>

          <div className="space-y-2.5">
            {budgets.daily.limit > 0 && <BudgetRow bar={budgets.daily} />}
            {budgets.weekly.limit > 0 && <BudgetRow bar={budgets.weekly} />}
            {budgets.monthly.limit > 0 && <BudgetRow bar={budgets.monthly} />}
          </div>

          {budgets.safeDailyAllowance !== null && (
            <p className="rounded-xl bg-soft px-3 py-2 text-xs text-muted">
              💡 Jatah aman untuk {budgets.remainingDaysInMonth} hari sisa bulan ini:{" "}
              <b className="num text-ink">{formatRp(budgets.safeDailyAllowance)}/hari</b>
            </p>
          )}
        </section>
      ) : (
        <Link href="/settings#advanced" className="card flex items-center justify-between px-4 py-3 text-xs">
          <span>🎯 Atur batas budget Harian, Mingguan, &amp; Bulanan</span>
          <span className="font-medium text-terracotta">Advanced →</span>
        </Link>
      )}

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

      {/* Sheet Pindah Saldo Cash <-> Digital */}
      <Sheet
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        title="Pindah Saldo Dompet"
        subtitle="Tarik tunai ATM atau setor/top-up tanpa dihitung pengeluaran"
      >
        <TransferForm
          onSave={async (from, amt) => {
            await transferWallet(from, amt);
            setTransferOpen(false);
          }}
        />
      </Sheet>
    </div>
  );
}

function BudgetRow({ bar }: { bar: BudgetBar }) {
  const over = bar.spent > bar.limit;
  const warn = bar.ratio >= 0.75 && !over;
  const color = over ? "var(--terracotta)" : warn ? "var(--limone-fill)" : "var(--oliva)";
  return (
    <div className="space-y-1 text-xs">
      <div className="flex justify-between">
        <span className="font-medium">
          {bar.label}{" "}
          <span className="text-muted font-normal">
            ({Math.round(bar.ratio * 100)}%)
          </span>
        </span>
        <span className="num">
          <b className={over ? "text-terracotta" : ""}>{formatCompact(bar.spent)}</b>{" "}
          <span className="text-muted">/ {formatCompact(bar.limit)}</span>
        </span>
      </div>
      <ProgressBar value={bar.ratio} color={color} />
    </div>
  );
}

function TransferForm({ onSave }: { onSave: (from: WalletType, amount: number) => Promise<void> }) {
  const [from, setFrom] = useState<WalletType>("digital");
  const [amount, setAmount] = useState(0);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (amount <= 0) return;
        onSave(from, amount);
      }}
      className="space-y-4 pb-2"
    >
      <Segmented
        value={from}
        onChange={setFrom}
        options={[
          { value: "digital", label: "💳 Digital → 💵 Cash (Tarik ATM)", activeClass: "bg-hero text-hero-ink" },
          { value: "cash", label: "💵 Cash → 💳 Digital (Top-Up)", activeClass: "bg-amalfi text-white" },
        ]}
      />
      <AmountInput label="Nominal yang dipindahkan" value={amount} onChange={setAmount} autoFocus large />
      <Button type="submit">Simpan perpindahan saldo</Button>
    </form>
  );
}

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
