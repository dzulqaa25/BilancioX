"use client";

import type { Transaction } from "@/lib/types";
import { getCategory } from "@/lib/categories";
import { formatNumber, formatShortDate } from "@/lib/format";

export function CategoryBadge({ id, size = 40 }: { id: string; size?: number }) {
  const c = getCategory(id);
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.45,
        background: `color-mix(in srgb, ${c.color} 16%, transparent)`,
        color: c.color,
      }}
      aria-hidden="true"
    >
      {c.emoji}
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
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 py-3 text-left active:opacity-60">
      <CategoryBadge id={tx.category} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{tx.note || c.label}</p>
        <p className="truncate text-xs text-muted">
          {c.label}
          {showDate && ` · ${formatShortDate(tx.date)}`}
          {tx.source === "shortcut" && " · via Shortcut"}
        </p>
      </div>
      <span className={`num shrink-0 font-medium ${income ? "text-oliva" : "text-terracotta"}`}>
        {income ? "+" : "−"}
        {formatNumber(tx.amount)}
      </span>
    </button>
  );
}
