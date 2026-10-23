"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { parseMessageLocal, type ParsedIntent } from "@/lib/parser";
import { todayISO } from "@/lib/format";
import { Button, Eyebrow, PageHeader } from "@/components/ui";
import { IconChevronLeft, IconShortcut } from "@/components/Icons";

const QUICK_CHIPS = [
  "nasi padang 22rb",
  "kopi susu 18rb",
  "ojol ke kampus 15k",
  "uang jajan 1,5jt",
  "hutang ke Budi 50rb",
  "nabung liburan 100rb",
];

/**
 * Halaman khusus pintasan 1-langkah (/quick).
 * Di aplikasi Shortcuts iPhone cukup pakai 1 aksi: Open URL -> https://.../quick
 */
export default function QuickCapturePage() {
  const { data, addTransaction, addDebt, addEntry } = useStore();
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function submit(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setResult(null);
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
        <div className="flex items-center gap-2 text-terracotta">
          <IconShortcut width={20} height={20} />
          <Eyebrow className="!text-terracotta">Ketik transaksi lalu tekan Enter</Eyebrow>
        </div>

        <input
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Contoh: nasi padang 22rb"
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
          {busy ? "Menyimpan…" : "Simpan ke Bilancio"}
        </Button>
      </form>

      {result && (
        <div className="card space-y-3 border-oliva p-4 text-sm leading-relaxed">
          <p className="whitespace-pre-line">{result}</p>
          <Button variant="ghost" onClick={() => router.push("/")}>
            Lihat di Home →
          </Button>
        </div>
      )}
    </div>
  );
}
