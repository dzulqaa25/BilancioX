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
  IconChevronLeft,
  IconDigital,
  IconShortcut,
  IconTransfer,
} from "@/components/Icons";

const EXAMPLES = [
  "fried chicken 30rb",
  "fried chicken 30rb cash",
  "ojol ke kampus 15k qris",
  "uang jajan 1,5jt digital",
  "hutang ke Budi 50rb beli buku",
  "nabung liburan 100rb",
];

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
  const [copied, setCopied] = useState(false);

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

  const origin = typeof window !== "undefined" ? window.location.origin : "https://bilancio-kamu.vercel.app";
  const shortcutBaseUrl = `${origin}/quick`;
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
          setLastReply("Buat dulu minimal 1 target tabungan di tab Savings sebelum menabung lewat pintasan.");
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
    setSavedNotice("Pengaturan Advanced berhasil disimpan");
    setTimeout(() => setSavedNotice(null), 2500);
  }

  async function submitTransfer(e: React.FormEvent) {
    e.preventDefault();
    if (transferAmt <= 0) return;
    await transferWallet(transferDir, transferAmt);
    setTransferAmt(0);
    setSavedNotice(
      transferDir === "digital"
        ? `Berhasil pindah ${formatRp(transferAmt)} dari Digital ke Cash`
        : `Berhasil pindah ${formatRp(transferAmt)} dari Cash ke Digital`,
    );
    setTimeout(() => setSavedNotice(null), 2500);
  }

  function copyShortcutUrl() {
    navigator.clipboard.writeText(shortcutBaseUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
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
    <div className="animate-rise space-y-6">
      <PageHeader
        eyebrow="Pintasan, budget & dompet"
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

      {/* Quick Input (AI) dengan Pengingat & Shortcut Cash/Digital */}
      <section className="card p-4">
        <div className="flex items-center gap-2">
          <IconShortcut className="text-ink" />
          <div>
            <Eyebrow>Quick Input (AI)</Eyebrow>
            <p className="text-xs text-muted">
              Ketik kalimat bebas — otomatis mengenali makanan bahasa Inggris &amp; pilihan Cash/Digital
            </p>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            runQuickInput(msg);
          }}
          className="mt-3 flex gap-2"
        >
          <input
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            placeholder="Contoh: fried chicken 30rb"
            className="flex-1 rounded-2xl border border-line bg-bg px-3.5 py-2.5 text-sm outline-none focus:border-oro"
          />
          <button
            type="submit"
            disabled={sending}
            className="rounded-2xl bg-hero px-4 py-2.5 text-sm font-medium text-hero-ink disabled:opacity-40"
          >
            {sending ? "…" : "Catat"}
          </button>
        </form>

        <div className="mt-2.5 flex gap-1.5 overflow-x-auto pb-1">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => runQuickInput(ex)}
              className="shrink-0 rounded-full border border-line bg-bg px-2.5 py-1 text-xs text-muted active:scale-95"
            >
              {ex}
            </button>
          ))}
        </div>

        {/* Pengingat & Shortcut jika user tidak menulis "cash"/"digital" */}
        {pendingTx && (
          <div className="mt-3 space-y-2.5 rounded-2xl border border-oro bg-soft p-3.5 text-xs leading-relaxed">
            <p className="font-semibold text-terracotta">
              Kamu belum menuliskan &ldquo;cash&rdquo; atau &ldquo;digital&rdquo;.
            </p>
            <div className="flex items-center gap-2 text-ink">
              <CategoryIcon id={pendingTx.category} width={17} height={17} />
              <span>
                AI mengkategorikan ini sebagai{" "}
                <b>
                  {getCategory(pendingTx.category).label} · {formatRp(pendingTx.amount)}
                </b>{" "}
                ({pendingTx.note}). Pilih jenis saldo:
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={sending}
                onClick={() => confirmPendingWallet("cash")}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-hero px-3 py-2.5 font-medium text-hero-ink active:scale-95"
              >
                <IconCash width={16} height={16} /> Cash (Tunai)
              </button>
              <button
                type="button"
                disabled={sending}
                onClick={() => confirmPendingWallet("digital")}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-line bg-card px-3 py-2.5 font-medium text-ink active:scale-95"
              >
                <IconDigital width={16} height={16} /> Saldo Digital
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

      {/* ================= ADVANCED OPTIONS: BUDGET & WALLETS ================= */}
      <section id="advanced" className="card space-y-5 p-4">
        <div>
          <Eyebrow>Advanced Options</Eyebrow>
          <h2 className="mt-0.5 font-serif text-2xl">Budget &amp; Wallets</h2>
          <p className="text-xs text-muted">
            Tersimpan khusus untuk akun ini tanpa menghapus data transaksi yang sudah ada.
          </p>
        </div>

        {/* Ringkasan Saldo Saat Ini */}
        <div className="grid grid-cols-2 gap-2.5 rounded-2xl bg-soft p-3 text-xs">
          <div className="flex items-center gap-2.5">
            <IconDigital width={17} height={17} className="shrink-0 text-muted" />
            <div>
              <p className="text-muted">Saldo Digital</p>
              <p className="num mt-0.5 text-sm font-semibold text-ink">{formatRp(wallets.digital)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <IconCash width={17} height={17} className="shrink-0 text-muted" />
            <div>
              <p className="text-muted">Saldo Cash</p>
              <p className="num mt-0.5 text-sm font-semibold text-ink">{formatRp(wallets.cash)}</p>
            </div>
          </div>
        </div>

        <form onSubmit={saveAdvanced} className="space-y-4">
          <div className="flex items-center justify-between">
            <Eyebrow>1 · Batas Budget Pengeluaran</Eyebrow>
            <label className="flex items-center gap-1.5 text-xs text-muted">
              <input
                type="checkbox"
                checked={autoBreak}
                onChange={(e) => setAutoBreak(e.target.checked)}
                className="accent-ink"
              />
              Otomatis bagi ke Mingguan &amp; Harian
            </label>
          </div>

          <AmountInput
            key={`m-${settings.monthlyBudget}`}
            label="Monthly Budget (Bulanan)"
            value={monthly}
            onChange={handleMonthlyChange}
          />
          <div className="grid grid-cols-2 gap-3">
            <AmountInput
              key={`w-${autoBreak ? weekly : settings.weeklyBudget}`}
              label="Weekly Budget (Mingguan)"
              value={weekly}
              onChange={(v) => {
                setAutoBreak(false);
                setWeekly(v);
              }}
            />
            <AmountInput
              key={`d-${autoBreak ? daily : settings.dailyBudget}`}
              label="Daily Budget (Harian)"
              value={daily}
              onChange={(v) => {
                setAutoBreak(false);
                setDaily(v);
              }}
            />
          </div>

          <div className="rule-oro" />

          <Eyebrow>2 · Penyesuaian Saldo Awal (Opsional)</Eyebrow>
          <p className="text-xs text-muted">
            Gunakan jika kamu ingin menyamakan saldo awal Digital dan Cash dengan isi dompetmu saat ini.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <AmountInput
              key={`di-${settings.digitalInitial}`}
              label="Saldo Awal Digital"
              value={digitalInit}
              onChange={setDigitalInit}
            />
            <AmountInput
              key={`ci-${settings.cashInitial}`}
              label="Saldo Awal Cash"
              value={cashInit}
              onChange={setCashInit}
            />
          </div>

          <Button type="submit">Simpan Pengaturan Advanced</Button>
        </form>

        <div className="rule-oro" />

        {/* Form Pindah Saldo (Tarik Tunai / Top-Up) */}
        <form onSubmit={submitTransfer} className="space-y-3">
          <div className="flex items-center gap-1.5">
            <IconTransfer width={15} height={15} className="text-muted" />
            <Eyebrow>3 · Pindah Saldo (Tarik Tunai ATM / Top-Up)</Eyebrow>
          </div>
          <Segmented
            value={transferDir}
            onChange={setTransferDir}
            options={[
              { value: "digital", label: "Digital ke Cash", activeClass: "bg-hero text-hero-ink" },
              { value: "cash", label: "Cash ke Digital", activeClass: "bg-hero text-hero-ink" },
            ]}
          />
          <AmountInput label="Nominal perpindahan" value={transferAmt} onChange={setTransferAmt} />
          <Button type="submit" variant="ghost">
            Pindahkan Saldo Sekarang
          </Button>
        </form>

        {savedNotice && (
          <p className="rounded-xl bg-soft px-3 py-2 text-center text-xs font-medium text-oliva">{savedNotice}</p>
        )}
      </section>

      {/* Panduan 1-Cara iOS Shortcut */}
      <section className="card space-y-3 p-4 text-xs leading-relaxed">
        <Eyebrow>iOS Shortcut Setup (Hanya 1 Aksi)</Eyebrow>
        <p className="text-muted">
          Salin link di bawah, lalu buka aplikasi <b>Shortcuts (Pintasan)</b> di iPhone → ketuk <b>+</b>:
        </p>

        <div className="flex items-center gap-2 rounded-2xl bg-soft p-2.5">
          <code className="flex-1 truncate font-mono text-ink">{shortcutBaseUrl}</code>
          <button
            type="button"
            onClick={copyShortcutUrl}
            className="shrink-0 rounded-xl bg-hero px-3 py-1.5 font-medium text-hero-ink"
          >
            {copied ? "Tersalin" : "Salin Link"}
          </button>
        </div>

        <ol className="list-decimal space-y-1.5 pl-4 text-muted">
          <li>
            Di aplikasi <b>Shortcuts</b>, tambah <b className="text-ink">1 aksi saja: Open URLs</b> (<i>Buka URL</i>), lalu tempel link di atas.
          </li>
          <li>
            <b>Penting untuk pengguna iPhone:</b> saat pertama kali Shortcut membuka Safari, <b>login 1× di Safari</b> (karena sesi login Safari dan aplikasi Home Screen terpisah di iOS).
          </li>
        </ol>
      </section>

      {/* Status penyimpanan */}
      <section className="card space-y-3 p-4 text-sm">
        <Eyebrow>Storage Mode</Eyebrow>
        {mode === "cloud" ? (
          <>
            <p>
              Terhubung ke <b>Supabase Cloud</b> sebagai <b>{session?.user?.email}</b>.
            </p>
            <Button variant="ghost" onClick={signOut}>
              Keluar (Sign Out)
            </Button>
          </>
        ) : (
          <>
            <p className="leading-relaxed text-muted">
              Saat ini berjalan dalam <b>Demo Mode</b> (data disimpan di browser perangkat ini).
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button
                variant="ghost"
                onClick={() => confirm("Kembalikan ke data contoh awal?") && resetDemo(false)}
              >
                Reset data contoh
              </Button>
              <Button
                variant="danger"
                onClick={() => confirm("Kosongkan semua data di perangkat ini?") && resetDemo(true)}
              >
                Kosongkan data
              </Button>
            </div>
          </>
        )}
      </section>

      {/* Cadangan data */}
      <section className="card space-y-3 p-4">
        <Eyebrow>Data Backup</Eyebrow>
        <Button variant="ghost" onClick={exportJson}>
          Unduh cadangan JSON
        </Button>
      </section>
    </div>
  );
}
