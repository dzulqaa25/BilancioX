"use client";

import type { Transaction } from "@/lib/types";
import { getCategory } from "@/lib/categories";
import { formatNumber, formatShortDate } from "@/lib/format";
import { CategoryIcon } from "./Icons";

/**
 * Medali ikon kategori minimalis: satu warna hangat (Espresso di atas kertas lembut)
 * dengan gambar vektor buatan sendiri, tanpa emoji dan tanpa warna-warni mencolok.
 */
export function CategoryBadge({ id, size = 38 }: { id: string; size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full border border-line bg-soft text-ink"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <CategoryIcon id={id} width={Math.round(size * 0.5)} height={Math.round(size * 0.5)} />
    </span>
  );
}

export function TransactionRow({
  tx,
  onClick,
  showDate,
}: {
  tx: Transaction;
  onClick?: () => void;
  showDate?: boolean;
}) {
  const c = getCategory(tx.category);
  const income = tx.type === "income";
  const isCash = tx.wallet === "cash";
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 py-3 text-left active:opacity-60">
      <CategoryBadge id={tx.category} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{tx.note || c.label}</p>
        <p className="truncate text-xs text-muted">
          {c.label} · {isCash ? "Cash" : "Digital"}
          {showDate && ` · ${formatShortDate(tx.date)}`}
          {tx.source === "shortcut" && " · Shortcut"}
        </p>
      </div>
      <span className={`num shrink-0 text-sm font-medium ${income ? "text-oliva" : "text-ink"}`}>
        {income ? "+" : "−"}
        {formatNumber(tx.amount)}
      </span>
    </button>
  );
}
