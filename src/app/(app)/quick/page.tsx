"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { getCategory } from "@/lib/categories";
import { parseMessageLocal, walletLabel, type ParsedIntent } from "@/lib/parser";
import { formatRp, todayISO } from "@/lib/format";
import type { NewTransaction, WalletType } from "@/lib/types";
import { Button, Eyebrow, PageHeader } from "@/components/ui";
import { CategoryIcon, IconCash, IconCheck, IconChevronLeft, IconDigital, IconShortcut } from "@/components/Icons";

const QUICK_CHIPS = [
  "fried chicken 30rb cash",
  "kopi susu 18rb qris",
  "ojol ke kampus 15k digital",
  "uang jajan 1,5jt digital",
  "hutang ke Budi 50rb",
  "nabung liburan 100rb",
];

/**
 * Halaman khusus pintasan 1-langkah (/quick).
 * Jika pengguna tidak menuliskan "cash" atau "digital", AI akan mengingatkan
 * dan menampilkan 2 tombol shortcut untuk memilih Cash atau Digital.
 */
export default function QuickCapturePage() {
  const { data, addTransaction, addDebt, addEntry } = useStore();
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingTx, setPendingTx] = useState<NewTransaction | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function submit(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setResult(null);
    setPendingTx(null);
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
          setText("");
          return;
        }
        await addTransaction(intent.data);
      } else if (intent.kind === "debt") {
        await addDebt(intent.data);
      } else if (intent.kind === "savings") {
        const hint = intent.goalHint.toLowerCase();
        const goal = data.goals.find((g) => g.name.toLowerCase().includes(hint)) ?? data.goals[0];
        if (!goal) {
          setResult("Buat dulu minimal 1 target tabungan di tab Savings.");
          return;
        }
        await addEntry({ goal_id: goal.id, amount: intent.amount, date: todayISO(), note: "via Shortcut" });
      }
      setText("");
      setResult(intent.reply.replace(/[*_]/g, ""));
    } catch (err) {
      setResult(`Gagal menyimpan: ${err instanceof Error ? err.message : "Terjadi kesalahan"}`);
    } finally {
      setBusy(false);
    }
  }

  async function saveWithWallet(wallet: WalletType) {
    if (!pendingTx || busy) return;
    setBusy(true);
    try {
      const finalTx: NewTransaction = { ...pendingTx, wallet };
      await addTransaction(finalTx);
      const cat = getCategory(finalTx.category);
      setPendingTx(null);
      setResult(
        `Tercatat (${finalTx.type === "income" ? "Pemasukan" : "Pengeluaran"} · ${walletLabel(wallet)})\n${cat.label} · ${formatRp(finalTx.amount)} — ${finalTx.note ?? ""}`,
      );
    } catch (err) {
      setResult(`Gagal menyimpan: ${err instanceof Error ? err.message : "Terjadi kesalahan"}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="animate-rise space-y-5">
      <PageHeader
        eyebrow="Pintasan Cepat"
        title="Quick Input"
        right={
          <Link
            href="/"
            className="flex items-center gap-1 rounded-full border border-line bg-card px-3 py-1.5 text-xs"
          >
            <IconChevronLeft width={16} height={16} /> Home
          </Link>
        }
      />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(text);
        }}
        className="card space-y-4 p-5"
      >
        <div className="flex items-center gap-2 text-ink">
          <IconShortcut width={18} height={18} />
          <Eyebrow>Ketik transaksi lalu tekan Enter</Eyebrow>
        </div>

        <input
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Contoh: fried chicken 30rb cash"
          className="w-full rounded-2xl border border-line bg-bg px-4 py-3.5 text-base outline-none focus:border-oro"
        />

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {QUICK_CHIPS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => submit(c)}
              className="shrink-0 rounded-full border border-line bg-bg px-3 py-1 text-xs text-muted active:scale-95"
            >
              {c}
            </button>
          ))}
        </div>

        <Button type="submit" disabled={busy || !text.trim()}>
          {busy ? "Memproses…" : "Simpan ke Bilancio"}
        </Button>
      </form>

      {/* Pengingat & Shortcut jika user belum menulis "cash"/"digital" */}
      {pendingTx && (
        <div className="card space-y-3 border-oro p-4 text-xs leading-relaxed">
          <p className="font-semibold text-terracotta">
            Kamu belum menuliskan jenis saldo (&ldquo;cash&rdquo; / &ldquo;digital&rdquo;).
          </p>
          <div className="flex items-center gap-2.5 text-ink">
            <CategoryIcon id={pendingTx.category} width={18} height={18} />
            <span>
              AI mengenali transaksi ini sebagai{" "}
              <b>
                {getCategory(pendingTx.category).label} · {formatRp(pendingTx.amount)}
              </b>{" "}
              ({pendingTx.note}). Pilih jenis saldo:
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              disabled={busy}
              onClick={() => saveWithWallet("cash")}
              className="flex items-center justify-center gap-2 rounded-2xl bg-hero px-3 py-3 text-sm font-medium text-hero-ink active:scale-95"
            >
              <IconCash width={17} height={17} /> Cash (Tunai)
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => saveWithWallet("digital")}
              className="flex items-center justify-center gap-2 rounded-2xl border border-line bg-soft px-3 py-3 text-sm font-medium text-ink active:scale-95"
            >
              <IconDigital width={17} height={17} /> Saldo Digital
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="card space-y-3 p-4 text-sm leading-relaxed">
          <div className="flex items-start gap-2.5">
            <IconCheck width={18} height={18} className="mt-0.5 shrink-0 text-oliva" />
            <p className="whitespace-pre-line">{result}</p>
          </div>
          <Button variant="ghost" onClick={() => router.push("/")}>
            Lihat di Home →
          </Button>
        </div>
      )}
    </div>
  );
}
