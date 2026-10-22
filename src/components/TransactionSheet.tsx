"use client";

import { useState } from "react";
import type { Transaction, TxType } from "@/lib/types";
import { categoriesFor } from "@/lib/categories";
import { todayISO } from "@/lib/format";
import { useStore } from "@/lib/store";
import { Sheet } from "./Sheet";
import { AmountInput, Button, FieldLabel, Segmented, TextField } from "./ui";
import { IconTrash } from "./Icons";

export interface TxSheetState {
  open: boolean;
  type: TxType;
  editing: Transaction | null;
}

export function TransactionSheet({ state, onClose }: { state: TxSheetState; onClose: () => void }) {
  const title = state.editing ? "Edit Transaction" : "New Transaction";
  return (
    <Sheet open={state.open} onClose={onClose} title={title} subtitle="Catat pemasukan atau pengeluaran">
      {/* key memastikan form direset setiap kali dibuka */}
      <TransactionForm key={state.editing?.id ?? `new-${state.type}`} state={state} onDone={onClose} />
    </Sheet>
  );
}

function TransactionForm({ state, onDone }: { state: TxSheetState; onDone: () => void }) {
  const { addTransaction, updateTransaction, deleteTransaction } = useStore();
  const e = state.editing;
  const [type, setType] = useState<TxType>(e?.type ?? state.type);
  const [amount, setAmount] = useState(e?.amount ?? 0);
  const [category, setCategory] = useState(e?.category ?? categoriesFor(state.type)[0].id);
  const [note, setNote] = useState(e?.note ?? "");
  const [date, setDate] = useState(e?.date ?? todayISO());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cats = categoriesFor(type);

  function switchType(t: TxType) {
    setType(t);
    setCategory(categoriesFor(t)[0].id);
  }

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan.");
    } finally {
      setBusy(false);
    }
  }

  function save(ev: React.FormEvent) {
    ev.preventDefault();
    if (amount <= 0) return setError("Nominal harus lebih dari 0.");
    const payload = { type, amount, category, note: note.trim() || null, date };
    run(() => (e ? updateTransaction(e.id, payload) : addTransaction({ ...payload, source: "app" })));
  }

  return (
    <form onSubmit={save} className="space-y-5 pb-2">
      <Segmented
        value={type}
        onChange={switchType}
        options={[
          { value: "expense", label: "Expense", activeClass: "bg-terracotta text-white" },
          { value: "income", label: "Income", activeClass: "bg-oliva text-white" },
        ]}
      />

      <AmountInput value={amount} onChange={setAmount} autoFocus={!e} large />

      <div>
        <FieldLabel>Category</FieldLabel>
        <div className="grid grid-cols-4 gap-2">
          {cats.map((c) => {
            const active = c.id === category;
            return (
              <button
                type="button"
                key={c.id}
                onClick={() => setCategory(c.id)}
                className={`flex flex-col items-center gap-1 rounded-2xl border px-1 py-2.5 text-center text-xs leading-tight text-ink transition ${
                  active ? "font-semibold" : "border-line bg-card"
                }`}
                style={
                  active
                    ? { background: `color-mix(in srgb, ${c.color} 18%, var(--card))`, borderColor: c.color }
                    : undefined
                }
              >
                <span className="text-lg">{c.emoji}</span>
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      <TextField
        label="Note"
        placeholder="mis. Nasi padang di kantin"
        value={note}
        onChange={(ev) => setNote(ev.target.value)}
        maxLength={120}
      />
      <TextField label="Date" type="date" value={date} onChange={(ev) => setDate(ev.target.value)} required />

      {error && <p className="text-sm text-terracotta">{error}</p>}

      <div className="space-y-2">
        <Button type="submit" disabled={busy}>
          {busy ? "Menyimpan…" : e ? "Simpan perubahan" : "Simpan"}
        </Button>
        {e && (
          <Button
            type="button"
            variant="danger"
            disabled={busy}
            onClick={() => {
              if (confirm("Hapus transaksi ini?")) run(() => deleteTransaction(e.id));
            }}
          >
            <IconTrash width={18} height={18} /> Hapus
          </Button>
        )}
      </div>
    </form>
  );
}
