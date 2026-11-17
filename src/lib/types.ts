export type TxType = "income" | "expense";
export type WalletType = "cash" | "digital";

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
  /** Jenis saldo yang dipakai: uang tunai ('cash') atau bank/e-wallet ('digital'). */
  wallet: WalletType;
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

export interface BudgetSettings {
  /** Batas pengeluaran bulanan (0 = tidak aktif). */
  monthlyBudget: number;
  /** Batas pengeluaran mingguan (0 = tidak aktif). */
  weeklyBudget: number;
  /** Batas pengeluaran harian (0 = tidak aktif). */
  dailyBudget: number;
  /** Jika true, mengisi budget bulanan otomatis membagi ke mingguan & harian. */
  autoBreakdown: boolean;
  /** Saldo awal dompet tunai (Cash). */
  cashInitial: number;
  /** Saldo awal dompet digital (Bank / E-Wallet). */
  digitalInitial: number;
  /** Akumulasi pindah saldo bersih dari Digital ke Cash (positif = tarik tunai ke Cash). */
  netTransferToCash: number;
}

export const DEFAULT_SETTINGS: BudgetSettings = {
  monthlyBudget: 0,
  weeklyBudget: 0,
  dailyBudget: 0,
  autoBreakdown: true,
  cashInitial: 0,
  digitalInitial: 0,
  netTransferToCash: 0,
};

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
