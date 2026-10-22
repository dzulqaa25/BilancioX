import type {
  AppData,
  Debt,
  NewDebt,
  NewEntry,
  NewGoal,
  NewTransaction,
  SavingsEntry,
  SavingsGoal,
  Transaction,
} from "../types";

/**
 * Lapisan penyimpanan data. Ada dua implementasi:
 * - `localRepo`   : menyimpan di localStorage (mode demo, tanpa Supabase)
 * - `supabaseRepo`: menyimpan di database Supabase (mode cloud)
 */
export interface Repo {
  mode: "demo" | "cloud";
  loadAll(): Promise<AppData>;

  addTransaction(t: NewTransaction): Promise<Transaction>;
  updateTransaction(id: string, patch: Partial<NewTransaction>): Promise<Transaction>;
  deleteTransaction(id: string): Promise<void>;

  addDebt(d: NewDebt): Promise<Debt>;
  updateDebt(id: string, patch: Partial<NewDebt>): Promise<Debt>;
  deleteDebt(id: string): Promise<void>;

  addGoal(g: NewGoal): Promise<SavingsGoal>;
  deleteGoal(id: string): Promise<void>;

  addEntry(e: NewEntry): Promise<SavingsEntry>;
}
