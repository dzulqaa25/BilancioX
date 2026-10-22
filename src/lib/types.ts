export type TxType = "income" | "expense";

export interface Transaction {
  id: string;
  type: TxType;
  /** Nominal dalam Rupiah (bilangan bulat). */
  amount: number;
  /** ID kategori, lihat `categories.ts`. */
  category: string;
  note: string | null;
  /** Format YYYY-MM-DD */
  date: string;
  source: "app" | "shortcut";
  created_at: string;
}

export type DebtDirection = "owe" | "owed";

export interface Debt {
  id: string;
  /** "owe" = saya berhutang, "owed" = orang lain berhutang ke saya */
  direction: DebtDirection;
  person: string;
  amount: number;
  paid: number;
  due_date: string | null;
  note: string | null;
  created_at: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  emoji: string;
  target: number;
  /** Saldo awal saat target dibuat (tidak mengurangi saldo bersih). */
  initial_amount: number;
  deadline: string | null;
  created_at: string;
}

export interface SavingsEntry {
  id: string;
  goal_id: string;
  /** Positif = setor, negatif = tarik. */
  amount: number;
  date: string;
  note: string | null;
  created_at: string;
}

export interface AppData {
  transactions: Transaction[];
  debts: Debt[];
  goals: SavingsGoal[];
  entries: SavingsEntry[];
}

export type NewTransaction = Omit<Transaction, "id" | "created_at">;
export type NewDebt = Omit<Debt, "id" | "created_at">;
export type NewGoal = Omit<SavingsGoal, "id" | "created_at">;
export type NewEntry = Omit<SavingsEntry, "id" | "created_at">;
