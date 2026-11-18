"use client";

import { useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { getCategory } from "@/lib/categories";
import { parseMessageLocal, walletLabel, type ParsedIntent } from "@/lib/parser";
import { walletBalances } from "@/lib/finance";
import { formatRp, todayISO } from "@/lib/format";
import type { NewTransaction, WalletType } from "@/lib/types";
import { AmountInput, Button, Eyebrow, PageHeader, Segmented } from "@/components/ui";
import {
  CategoryIcon,
  IconCash,
  IconCheck,
  IconChevron,
  IconChevronLeft,
  IconDigital,
  IconShortcut,
} from "@/components/Icons";

export default function SettingsPage() {
  const {
    mode,
    session,
    data,
    settings,
    updateSettings,
    transferWallet,
    signOut,
    resetDemo,
    addTransaction,
    addDebt,
    addEntry,
  } = useStore();

  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [pendingTx, setPendingTx] = useState<NewTransaction | null>(null);
  const [lastReply, setLastReply] = useState<string | null>(null);

  // State form Advanced Options (Budget & Saldo)
  const [monthly, setMonthly] = useState(settings.monthlyBudget);
  const [weekly, setWeekly] = useState(settings.weeklyBudget);
  const [daily, setDaily] = useState(settings.dailyBudget);
  const [autoBreak, setAutoBreak] = useState(settings.autoBreakdown);
  const [cashInit, setCashInit] = useState(settings.cashInitial);
  const [digitalInit, setDigitalInit] = useState(settings.digitalInitial);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  // State Pindah Saldo (Cash <-> Digital)
  const [transferDir, setTransferDir] = useState<WalletType>("digital");
  const [transferAmt, setTransferAmt] = useState(0);

  const wallets = walletBalances(data, settings);

  async function runQuickInput(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setMsg("");
    setSending(true);
    setPendingTx(null);
    setLastReply(null);
    try {
      let intent: ParsedIntent;
      try {
        const res = await fetch("/api/ai/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: trimmed }),
        });
        intent = res.ok ? ((await res.json()) as ParsedIntent) : parseMessageLocal(trimmed, "shortcut");
      } catch {
        intent = parseMessageLocal(trimmed, "shortcut");
      }

      if (intent.kind === "transaction") {
        if (!intent.walletSpecified) {
          setPendingTx(intent.data);
          return;
        }
        await addTransaction(intent.data);
      } else if (intent.kind === "debt") {
        await addDebt(intent.data);
      } else if (intent.kind === "savings") {
        const hint = intent.goalHint.toLowerCase();
        const goal = data.goals.find((g) => g.name.toLowerCase().includes(hint)) ?? data.goals[0];
        if (goal) {
          await addEntry({ goal_id: goal.id, amount: intent.amount, date: todayISO(), note: "via Shortcut" });
        } else {
          setLastReply("Buat dulu minimal 1 target tabungan di tab Savings.");
          return;
        }
      }
      setLastReply(intent.reply.replace(/[*_]/g, ""));
    } catch (err) {
      setLastReply(`Gagal menyimpan: ${err instanceof Error ? err.message : "Terjadi kesalahan"}`);
    } finally {
      setSending(false);
    }
  }

  async function confirmPendingWallet(wallet: WalletType) {
    if (!pendingTx || sending) return;
    setSending(true);
    try {
      const finalTx: NewTransaction = { ...pendingTx, wallet };
      await addTransaction(finalTx);
      const cat = getCategory(finalTx.category);
      setPendingTx(null);
      setLastReply(
        `Tercatat (${finalTx.type === "income" ? "Pemasukan" : "Pengeluaran"} · ${walletLabel(wallet)})\n${cat.label} · ${formatRp(finalTx.amount)} — ${finalTx.note ?? ""}`,
      );
    } catch (err) {
      setLastReply(`Gagal menyimpan: ${err instanceof Error ? err.message : "Terjadi kesalahan"}`);
    } finally {
      setSending(false);
    }
  }

  function handleMonthlyChange(val: number) {
    setMonthly(val);
    if (autoBreak && val > 0) {
      setWeekly(Math.round(val / 4));
      setDaily(Math.round(val / 30));
    }
  }

  async function saveAdvanced(e: React.FormEvent) {
    e.preventDefault();
    await updateSettings({
      monthlyBudget: monthly,
      weeklyBudget: weekly,
      dailyBudget: daily,
      autoBreakdown: autoBreak,
      cashInitial: cashInit,
      digitalInitial: digitalInit,
    });
    setSavedNotice("Tersimpan");
    setTimeout(() => setSavedNotice(null), 2000);
  }

  async function submitTransfer(e: React.FormEvent) {
    e.preventDefault();
    if (transferAmt <= 0) return;
    await transferWallet(transferDir, transferAmt);
    setTransferAmt(0);
    setSavedNotice(
      transferDir === "digital"
        ? `Pindah ${formatRp(transferAmt)} Digital → Cash`
        : `Pindah ${formatRp(transferAmt)} Cash → Digital`,
    );
    setTimeout(() => setSavedNotice(null), 2000);
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify({ ...data, settings }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bilancio-backup-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="animate-rise space-y-5">
      <PageHeader
        eyebrow="Preferensi"
        title="Settings"
        right={
          <Link
            href="/"
            className="flex items-center gap-1 rounded-full border border-line bg-card px-3 py-1.5 text-xs"
          >
            <IconChevronLeft width={16} height={16} /> Home
          </Link>
        }
      />

      {/* Quick Input (AI) — Bersih tanpa subjudul panjang & tanpa chip contoh */}
      <section className="card p-4">
        <div className="flex items-center gap-2">
          <IconShortcut className="text-ink" width={17} height={17} />
          <Eyebrow>Quick Input (AI)</Eyebrow>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            runQuickInput(msg);
          }}
          className="mt-2.5 flex gap-2"
        >
          <input
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            placeholder="Ketik transaksi…"
            className="flex-1 rounded-2xl border border-line bg-bg px-3.5 py-2.5 text-sm outline-none focus:border-oro"
          />
          <button
            type="submit"
            disabled={sending || !msg.trim()}
            className="rounded-2xl bg-hero px-4 py-2.5 text-sm font-medium text-hero-ink disabled:opacity-40"
          >
            {sending ? "…" : "Catat"}
          </button>
        </form>

        {/* Pengingat & Shortcut jika user tidak menulis "cash"/"digital" */}
        {pendingTx && (
          <div className="mt-3 space-y-2.5 rounded-2xl border border-oro bg-soft p-3.5 text-xs leading-relaxed">
            <div className="flex items-center gap-2 text-ink">
              <CategoryIcon id={pendingTx.category} width={17} height={17} />
              <span>
                <b>
                  {getCategory(pendingTx.category).label} · {formatRp(pendingTx.amount)}
                </b>{" "}
                ({pendingTx.note}) — pilih saldo:
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={sending}
                onClick={() => confirmPendingWallet("cash")}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-hero px-3 py-2.5 font-medium text-hero-ink active:scale-95"
              >
                <IconCash width={16} height={16} /> Cash
              </button>
              <button
                type="button"
                disabled={sending}
                onClick={() => confirmPendingWallet("digital")}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-line bg-card px-3 py-2.5 font-medium text-ink active:scale-95"
              >
                <IconDigital width={16} height={16} /> Digital
              </button>
            </div>
          </div>
        )}

        {lastReply && (
          <div className="mt-3 flex items-start gap-2 rounded-2xl bg-soft p-3 text-xs leading-relaxed whitespace-pre-line">
            <IconCheck width={16} height={16} className="mt-0.5 shrink-0 text-oliva" />
            <span>{lastReply}</span>
          </div>
        )}
      </section>

      {/* ================= ADVANCED OPTIONS (Rapi dengan Dropdown) ================= */}
      <section id="advanced" className="card divide-y divide-line px-4">
        <div className="py-3.5 flex items-center justify-between">
          <div>
            <Eyebrow>Advanced Options</Eyebrow>
            <p className="mt-0.5 font-serif text-xl">Budget &amp; Wallets</p>
          </div>
          {savedNotice && <span className="text-xs font-medium text-oliva">{savedNotice}</span>}
        </div>

        {/* Dropdown 1: Batas Budget */}
        <details className="group py-3.5">
          <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium">
            <span>Batas Budget</span>
            <span className="flex items-center gap-2 text-xs font-normal text-muted">
              {monthly > 0 ? formatRp(monthly) : "Belum diatur"}
              <IconChevron width={16} height={16} className="transition group-open:rotate-90" />
            </span>
          </summary>
          <form onSubmit={saveAdvanced} className="mt-3.5 space-y-3">
            <label className="flex items-center gap-2 text-xs text-muted">
              <input
                type="checkbox"
                checked={autoBreak}
                onChange={(e) => setAutoBreak(e.target.checked)}
                className="accent-ink"
              />
              Bagi otomatis ke Mingguan &amp; Harian
            </label>
            <AmountInput
              key={`m-${settings.monthlyBudget}`}
              label="Monthly"
              value={monthly}
              onChange={handleMonthlyChange}
            />
            <div className="grid grid-cols-2 gap-2.5">
              <AmountInput
                key={`w-${autoBreak ? weekly : settings.weeklyBudget}`}
                label="Weekly"
                value={weekly}
                onChange={(v) => {
                  setAutoBreak(false);
                  setWeekly(v);
                }}
              />
              <AmountInput
                key={`d-${autoBreak ? daily : settings.dailyBudget}`}
                label="Daily"
                value={daily}
                onChange={(v) => {
                  setAutoBreak(false);
                  setDaily(v);
                }}
              />
            </div>
            <Button type="submit">Simpan Budget</Button>
          </form>
        </details>

        {/* Dropdown 2: Pindah Saldo */}
        <details className="group py-3.5">
          <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium">
            <span>Pindah Saldo (Digital ↔ Cash)</span>
            <IconChevron width={16} height={16} className="text-muted transition group-open:rotate-90" />
          </summary>
          <form onSubmit={submitTransfer} className="mt-3.5 space-y-3">
            <Segmented
              value={transferDir}
              onChange={setTransferDir}
              options={[
                { value: "digital", label: "Digital → Cash", activeClass: "bg-hero text-hero-ink" },
                { value: "cash", label: "Cash → Digital", activeClass: "bg-hero text-hero-ink" },
              ]}
            />
            <AmountInput label="Nominal" value={transferAmt} onChange={setTransferAmt} />
            <Button type="submit">Pindahkan</Button>
          </form>
        </details>

        {/* Dropdown 3: Saldo Awal */}
        <details className="group py-3.5">
          <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium">
            <span>Saldo Awal Dompet</span>
            <span className="flex items-center gap-2 text-xs font-normal text-muted">
              <span className="num">{formatRp(wallets.total)}</span>
              <IconChevron width={16} height={16} className="transition group-open:rotate-90" />
            </span>
          </summary>
          <form onSubmit={saveAdvanced} className="mt-3.5 space-y-3">
            <div className="grid grid-cols-2 gap-2.5">
              <AmountInput
                key={`di-${settings.digitalInitial}`}
                label="Awal Digital"
                value={digitalInit}
                onChange={setDigitalInit}
              />
              <AmountInput
                key={`ci-${settings.cashInitial}`}
                label="Awal Cash"
                value={cashInit}
                onChange={setCashInit}
              />
            </div>
            <Button type="submit">Simpan Saldo Awal</Button>
          </form>
        </details>
      </section>

      {/* Akun & Cadangan Data (Digabung lebih ringkas) */}
      <section className="card space-y-3 p-4 text-xs">
        <div className="flex items-center justify-between">
          <Eyebrow>Account &amp; Backup</Eyebrow>
          <span className="text-muted">{mode === "cloud" ? session?.user?.email : "Demo Mode"}</span>
        </div>

        <div className="flex gap-2">
          <Button variant="ghost" onClick={exportJson}>
            Backup JSON
          </Button>
          {mode === "cloud" ? (
            <Button variant="ghost" onClick={signOut}>
              Sign Out
            </Button>
          ) : (
            <Button variant="danger" onClick={() => confirm("Kosongkan data demo?") && resetDemo(true)}>
              Reset
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}
