import type { TxType } from "./types";

export interface Category {
  id: string;
  label: string;
  emoji: string;
  /** Warna untuk grafik (CSS color / var). */
  color: string;
  type: TxType;
}

export const EXPENSE_CATEGORIES: Category[] = [
  { id: "makan", label: "Makan & Minum", emoji: "🍜", color: "var(--terracotta)", type: "expense" },
  { id: "transportasi", label: "Transportasi", emoji: "🛵", color: "var(--amalfi)", type: "expense" },
  { id: "belanja", label: "Belanja", emoji: "🛍️", color: "var(--limone-fill)", type: "expense" },
  { id: "tagihan", label: "Tagihan & Utilitas", emoji: "💡", color: "var(--oliva)", type: "expense" },
  { id: "hiburan", label: "Hiburan", emoji: "🎬", color: "var(--prugna)", type: "expense" },
  { id: "kesehatan", label: "Kesehatan", emoji: "💊", color: "var(--salvia)", type: "expense" },
  { id: "pendidikan", label: "Pendidikan", emoji: "📚", color: "var(--oro)", type: "expense" },
  { id: "lainnya", label: "Lainnya", emoji: "✦", color: "var(--grigio)", type: "expense" },
];

export const INCOME_CATEGORIES: Category[] = [
  { id: "uang_jajan", label: "Uang Jajan", emoji: "💸", color: "var(--oliva)", type: "income" },
  { id: "lainnya_masuk", label: "Lainnya", emoji: "✦", color: "var(--oro)", type: "income" },
];

export const ALL_CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

const FALLBACK: Category = {
  id: "lainnya",
  label: "Lainnya",
  emoji: "✦",
  color: "var(--grigio)",
  type: "expense",
};

export function getCategory(id: string): Category {
  return ALL_CATEGORIES.find((c) => c.id === id) ?? FALLBACK;
}

export function categoriesFor(type: TxType): Category[] {
  return type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
}
