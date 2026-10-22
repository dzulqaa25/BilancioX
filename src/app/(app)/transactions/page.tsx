"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { useShell } from "@/components/AppShell";
import { ALL_CATEGORIES, getCategory } from "@/lib/categories";
import { formatDayLabel, formatRp } from "@/lib/format";
import { sumBy } from "@/lib/finance";
import { Chip, EmptyState, Eyebrow, PageHeader } from "@/components/ui";
import { TransactionRow } from "@/components/TransactionRow";
import { IconSearch } from "@/components/Icons";

type Filter = "all" | "expense" | "income";

export default function TransactionsPage() {
  const { data } = useStore();
  const { openEdit } = useShell();
  const [filter, setFilter] = useState<Filter>("all");
  const [cat, setCat] = useState<string>("all");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return data.transactions.filter((t) => {
      if (filter !== "all" && t.type !== filter) return false;
      if (cat !== "all" && t.category !== cat) return false;
      if (query) {
        const c = getCategory(t.category).label.toLowerCase();
        const note = (t.note ?? "").toLowerCase();
        if (!c.includes(query) && !note.includes(query)) return false;
      }
      return true;
    });
  }, [data.transactions, filter, cat, q]);

  const groups = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const t of filtered) {
      const arr = map.get(t.date) ?? [];
      arr.push(t);
      map.set(t.date, arr);
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [filtered]);

  const totalIn = sumBy(filtered, "income");
  const totalOut = sumBy(filtered, "expense");

  return (
    <div className="animate-rise space-y-4">
      <PageHeader eyebrow={`${filtered.length} catatan`} title="Transactions" />

      {/* Pencarian */}
      <label className="card flex items-center gap-2.5 px-3.5 py-2.5">
        <IconSearch width={18} height={18} className="text-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari catatan atau kategori…"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
        />
        {q && (
          <button onClick={() => setQ("")} className="text-xs text-muted">
            Hapus
          </button>
        )}
      </label>

      {/* Filter tipe & kategori */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <Chip active={filter === "all"} onClick={() => setFilter("all")}>
          All
        </Chip>
        <Chip active={filter === "expense"} onClick={() => setFilter("expense")}>
          Expenses
        </Chip>
        <Chip active={filter === "income"} onClick={() => setFilter("income")}>
          Income
        </Chip>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <Chip active={cat === "all"} onClick={() => setCat("all")}>
          Semua kategori
        </Chip>
        {ALL_CATEGORIES.map((c) => (
          <Chip key={c.id} active={cat === c.id} onClick={() => setCat(c.id)}>
            {c.emoji} {c.label}
          </Chip>
        ))}
      </div>

      {/* Ringkasan hasil filter */}
      <div className="card flex justify-between px-4 py-3 text-xs">
        <span>
          Masuk: <b className="num text-oliva">{formatRp(totalIn)}</b>
        </span>
        <span>
          Keluar: <b className="num text-terracotta">{formatRp(totalOut)}</b>
        </span>
      </div>

      {/* Daftar per tanggal */}
      {groups.length === 0 ? (
        <EmptyState title="Tidak ada transaksi" hint="Coba ubah kata kunci pencarian atau filter kategori." />
      ) : (
        <div className="space-y-4">
          {groups.map(([date, items]) => {
            const net = sumBy(items, "income") - sumBy(items, "expense");
            return (
              <section key={date}>
                <div className="mb-1.5 flex items-baseline justify-between px-1">
                  <Eyebrow>{formatDayLabel(date)}</Eyebrow>
                  <span className="num text-xs text-muted">{formatRp(net)}</span>
                </div>
                <div className="card divide-y divide-line px-4">
                  {items.map((tx) => (
                    <TransactionRow key={tx.id} tx={tx} onClick={() => openEdit(tx)} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
