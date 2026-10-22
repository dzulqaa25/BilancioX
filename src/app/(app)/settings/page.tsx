"use client";

import { useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import type { ParsedIntent } from "@/lib/parser";
import { todayISO } from "@/lib/format";
import { Button, Eyebrow, PageHeader } from "@/components/ui";
import { IconChevronLeft, IconShortcut } from "@/components/Icons";

const EXAMPLES = [
  "nasi padang 22rb",
  "uang jajan 1,5jt",
  "ojol ke kampus 15k",
  "hutang ke Budi 50rb beli buku",
  "nabung liburan 100rb",
];

export default function SettingsPage() {
  const { mode, session, data, signOut, resetDemo, addTransaction, addDebt, addEntry } = useStore();
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [lastReply, setLastReply] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "https://bilancio-kamu.vercel.app";
  const shortcutBaseUrl = `${origin}/?quick=`;

  async function runQuickInput(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setMsg("");
    setSending(true);
    try {
      const res = await fetch("/api/ai/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
      const intent = (await res.json()) as ParsedIntent;

      if (intent.kind === "transaction") {
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
    } catch {
      setLastReply("Gagal memproses input.");
    } finally {
      setSending(false);
    }
  }

  function copyShortcutUrl() {
    navigator.clipboard.writeText(shortcutBaseUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
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
        eyebrow="Pintasan iPhone & pengaturan"
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

      {/* Quick Input (AI) */}
      <section className="card p-4">
        <div className="flex items-center gap-2">
          <IconShortcut className="text-terracotta" />
          <div>
            <Eyebrow>Quick Input (AI)</Eyebrow>
            <p className="text-xs text-muted">Ketik kalimat bebas — otomatis dikategorikan &amp; dicatat</p>
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
            placeholder="Contoh: nasi padang 22rb"
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

        {lastReply && (
          <div className="mt-3 rounded-2xl bg-soft p-3 text-xs leading-relaxed whitespace-pre-line">
            {lastReply}
          </div>
        )}
      </section>

      {/* Panduan 1-Cara iOS Shortcut */}
      <section className="card space-y-3 p-4 text-xs leading-relaxed">
        <Eyebrow>iOS Shortcut Setup (3 Langkah)</Eyebrow>
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
            {copied ? "Tersalin ✓" : "Salin Link"}
          </button>
        </div>

        <ol className="list-decimal space-y-1.5 pl-4 text-muted">
          <li>
            Tambah aksi <b className="text-ink">Ask for Input</b> → isi Prompt: <i>Catat ke Bilancio</i>.
          </li>
          <li>
            Tambah aksi <b className="text-ink">URL Encode</b> (otomatis meneruskan teks dari langkah 1).
          </li>
          <li>
            Tambah aksi <b className="text-ink">Open URLs</b> → tempel link di atas, lalu di belakang tanda{" "}
            <code>=</code> pilih variabel <b className="text-ink">URL Encoded Text</b>.
          </li>
        </ol>

        <p className="text-muted">
          💡 <b>Tips Back Tap:</b> buka <i>Settings iPhone → Accessibility → Touch → Back Tap → Double Tap</i> lalu pilih pintasan ini agar bisa mencatat hanya dengan ketuk 2× belakang iPhone.
        </p>
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
              Saat ini berjalan dalam <b>Demo Mode</b> (data disimpan di browser perangkat ini). Isi variabel Supabase di{" "}
              <code className="rounded bg-soft px-1.5 py-0.5 text-xs">.env.local</code> untuk menyinkronkan ke cloud.
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
