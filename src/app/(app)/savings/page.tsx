"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import type { Debt, DebtDirection, SavingsGoal } from "@/lib/types";
import { debtRemaining, goalSaved, totalDebt, totalSavings } from "@/lib/finance";
import { formatRp, formatShortDate, todayISO } from "@/lib/format";
import { Sheet } from "@/components/Sheet";
import {
  AmountInput,
  Button,
  Chip,
  EmptyState,
  Eyebrow,
  FieldLabel,
  PageHeader,
  ProgressBar,
  Segmented,
  TextField,
} from "@/components/ui";
import { IconTrash } from "@/components/Icons";

const GOAL_EMOJIS = ["🏝️", "💻", "🛡️", "🎓", "🛵", "📱", "🎸", "✈️"];

export default function SavingsPage() {
  const { data, addGoal, deleteGoal, addEntry, addDebt, updateDebt, deleteDebt } = useStore();
  const [debtFilter, setDebtFilter] = useState<DebtDirection>("owe");

  const [goalModal, setGoalModal] = useState(false);
  const [activeGoal, setActiveGoal] = useState<SavingsGoal | null>(null);
  const [debtModal, setDebtModal] = useState(false);
  const [payingDebt, setPayingDebt] = useState<Debt | null>(null);

  const savedTotal = totalSavings(data);
  const debts = data.debts.filter((d) => d.direction === debtFilter);

  return (
    <div className="animate-rise space-y-6">
      <PageHeader eyebrow="Tabungan & catatan pinjaman" title="Savings & Debts" />

      {/* ---------------- SAVINGS GOALS ---------------- */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <div>
            <Eyebrow>Savings Goals</Eyebrow>
            <p className="num font-serif text-2xl text-limone">{formatRp(savedTotal)}</p>
          </div>
          <button onClick={() => setGoalModal(true)} className="text-xs font-medium text-terracotta">
            + New Goal
          </button>
        </div>

        {data.goals.length === 0 ? (
          <EmptyState title="Belum ada target tabungan" hint="Buat target baru untuk mulai menabung." />
        ) : (
          data.goals.map((g) => {
            const current = goalSaved(g, data);
            const ratio = g.target ? current / g.target : 0;
            return (
              <div key={g.id} className="card p-4">
                <div className="flex items-start justify-between gap-2">
                  <button onClick={() => setActiveGoal(g)} className="flex items-center gap-2.5 text-left">
                    <span className="text-2xl">{g.emoji}</span>
                    <div>
                      <p className="font-medium">{g.name}</p>
                      <p className="num text-xs text-muted">
                        {formatRp(current)} dari {formatRp(g.target)}
                      </p>
                    </div>
                  </button>
                  <span className="num font-serif text-lg">{Math.round(ratio * 100)}%</span>
                </div>
                <div className="my-3">
                  <ProgressBar value={ratio} color="var(--limone-fill)" />
                </div>
                <div className="flex justify-between text-xs">
                  <button onClick={() => setActiveGoal(g)} className="font-medium text-oliva">
                    + Setor / Tarik
                  </button>
                  <button
                    onClick={() => confirm(`Hapus target "${g.name}"?`) && deleteGoal(g.id)}
                    className="text-muted"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            );
          })
        )}
      </section>

      <div className="rule-oro" />

      {/* ---------------- DEBTS ---------------- */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <div>
            <Eyebrow>Debts</Eyebrow>
            <p className="num font-serif text-2xl text-amalfi">{formatRp(totalDebt(data, debtFilter))}</p>
          </div>
          <button onClick={() => setDebtModal(true)} className="text-xs font-medium text-terracotta">
            + New Debt
          </button>
        </div>

        <div className="flex gap-2">
          <Chip active={debtFilter === "owe"} onClick={() => setDebtFilter("owe")}>
            I Owe (Saya berhutang)
          </Chip>
          <Chip active={debtFilter === "owed"} onClick={() => setDebtFilter("owed")}>
            Owed to Me (Piutang)
          </Chip>
        </div>

        {debts.length === 0 ? (
          <EmptyState
            title={debtFilter === "owe" ? "Bebas hutang 🎉" : "Tidak ada piutang"}
            hint="Catat pinjaman teman di sini supaya tidak lupa."
          />
        ) : (
          <div className="card divide-y divide-line px-4">
            {debts.map((d) => {
              const rem = debtRemaining(d);
              const done = rem === 0;
              return (
                <div key={d.id} className="py-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className={`font-medium ${done ? "line-through opacity-50" : ""}`}>{d.person}</p>
                      <p className="text-xs text-muted">
                        {d.note || "Tanpa catatan"}
                        {d.due_date && ` · Tempo ${formatShortDate(d.due_date)}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="num font-medium text-amalfi">{done ? "Lunas" : formatRp(rem)}</p>
                      {d.paid > 0 && !done && (
                        <p className="num text-xs text-muted">dari {formatRp(d.amount)}</p>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 flex gap-4 text-xs">
                    {!done && (
                      <>
                        <button onClick={() => setPayingDebt(d)} className="font-medium text-oliva">
                          Cicil / Bayar
                        </button>
                        <button
                          onClick={() => updateDebt(d.id, { paid: d.amount })}
                          className="font-medium text-amalfi"
                        >
                          Tandai lunas
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => confirm("Hapus catatan hutang ini?") && deleteDebt(d.id)}
                      className="ml-auto text-muted"
                      aria-label="Hapus"
                    >
                      <IconTrash width={15} height={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Modal: Target tabungan baru */}
      <Sheet open={goalModal} onClose={() => setGoalModal(false)} title="New Savings Goal">
        <NewGoalForm
          onSave={async (g) => {
            await addGoal(g);
            setGoalModal(false);
          }}
        />
      </Sheet>

      {/* Modal: Setor / tarik tabungan */}
      <Sheet
        open={Boolean(activeGoal)}
        onClose={() => setActiveGoal(null)}
        title={activeGoal ? `${activeGoal.emoji} ${activeGoal.name}` : ""}
        subtitle="Setoran diambil dari saldo bersihmu"
      >
        {activeGoal && (
          <EntryForm
            onSave={async (amount, note) => {
              await addEntry({ goal_id: activeGoal.id, amount, note, date: todayISO() });
              setActiveGoal(null);
            }}
          />
        )}
      </Sheet>

      {/* Modal: Hutang baru */}
      <Sheet open={debtModal} onClose={() => setDebtModal(false)} title="New Debt">
        <NewDebtForm
          defaultDir={debtFilter}
          onSave={async (d) => {
            await addDebt(d);
            setDebtModal(false);
          }}
        />
      </Sheet>

      {/* Modal: Cicil hutang */}
      <Sheet
        open={Boolean(payingDebt)}
        onClose={() => setPayingDebt(null)}
        title={payingDebt ? `Bayar · ${payingDebt.person}` : ""}
        subtitle={payingDebt ? `Sisa ${formatRp(debtRemaining(payingDebt))}` : ""}
      >
        {payingDebt && (
          <PayDebtForm
            max={debtRemaining(payingDebt)}
            onSave={async (add) => {
              await updateDebt(payingDebt.id, { paid: Math.min(payingDebt.amount, payingDebt.paid + add) });
              setPayingDebt(null);
            }}
          />
        )}
      </Sheet>
    </div>
  );
}

function NewGoalForm({
  onSave,
}: {
  onSave: (g: { name: string; emoji: string; target: number; initial_amount: number; deadline: string | null }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState(GOAL_EMOJIS[0]);
  const [target, setTarget] = useState(0);
  const [initial, setInitial] = useState(0);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim() || target <= 0) return;
        onSave({ name: name.trim(), emoji, target, initial_amount: initial, deadline: null });
      }}
      className="space-y-4 pb-2"
    >
      <div>
        <FieldLabel>Icon</FieldLabel>
        <div className="flex gap-2">
          {GOAL_EMOJIS.map((em) => (
            <button
              key={em}
              type="button"
              onClick={() => setEmoji(em)}
              className={`flex h-10 w-10 items-center justify-center rounded-xl border text-xl ${
                emoji === em ? "border-oro bg-soft" : "border-line bg-card"
              }`}
            >
              {em}
            </button>
          ))}
        </div>
      </div>
      <TextField label="Goal Name" placeholder="mis. Laptop baru" value={name} onChange={(e) => setName(e.target.value)} required />
      <AmountInput label="Target" value={target} onChange={setTarget} />
      <AmountInput label="Saldo awal yang sudah terkumpul" value={initial} onChange={setInitial} />
      <Button type="submit">Simpan target</Button>
    </form>
  );
}

function EntryForm({ onSave }: { onSave: (amount: number, note: string | null) => Promise<void> }) {
  const [mode, setMode] = useState<"deposit" | "withdraw">("deposit");
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (amount <= 0) return;
        onSave(mode === "deposit" ? amount : -amount, note.trim() || null);
      }}
      className="space-y-4 pb-2"
    >
      <Segmented
        value={mode}
        onChange={setMode}
        options={[
          { value: "deposit", label: "Deposit (Setor)", activeClass: "bg-oliva text-white" },
          { value: "withdraw", label: "Withdraw (Tarik)", activeClass: "bg-terracotta text-white" },
        ]}
      />
      <AmountInput value={amount} onChange={setAmount} autoFocus large />
      <TextField label="Note" placeholder="Opsional" value={note} onChange={(e) => setNote(e.target.value)} />
      <Button type="submit">Simpan</Button>
    </form>
  );
}

function NewDebtForm({
  defaultDir,
  onSave,
}: {
  defaultDir: DebtDirection;
  onSave: (d: {
    direction: DebtDirection;
    person: string;
    amount: number;
    paid: number;
    due_date: string | null;
    note: string | null;
  }) => Promise<void>;
}) {
  const [direction, setDirection] = useState<DebtDirection>(defaultDir);
  const [person, setPerson] = useState("");
  const [amount, setAmount] = useState(0);
  const [due, setDue] = useState("");
  const [note, setNote] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!person.trim() || amount <= 0) return;
        onSave({ direction, person: person.trim(), amount, paid: 0, due_date: due || null, note: note.trim() || null });
      }}
      className="space-y-4 pb-2"
    >
      <Segmented
        value={direction}
        onChange={setDirection}
        options={[
          { value: "owe", label: "I Owe (Saya berhutang)" },
          { value: "owed", label: "Owed to Me (Piutang)" },
        ]}
      />
      <TextField label="Person" placeholder="Nama teman / pihak" value={person} onChange={(e) => setPerson(e.target.value)} required />
      <AmountInput value={amount} onChange={setAmount} />
      <TextField label="Note" placeholder="mis. Pinjam buat beli buku" value={note} onChange={(e) => setNote(e.target.value)} />
      <TextField label="Due Date (opsional)" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
      <Button type="submit">Simpan</Button>
    </form>
  );
}

function PayDebtForm({ max, onSave }: { max: number; onSave: (amount: number) => Promise<void> }) {
  const [amount, setAmount] = useState(max);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (amount <= 0) return;
        onSave(amount);
      }}
      className="space-y-4 pb-2"
    >
      <AmountInput label="Nominal pembayaran" value={amount} onChange={setAmount} autoFocus large />
      <Button type="submit">Catat pembayaran</Button>
    </form>
  );
}
