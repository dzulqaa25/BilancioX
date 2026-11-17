import {
  DEFAULT_SETTINGS,
  type AppData,
  type BudgetSettings,
  type Debt,
  type SavingsGoal,
  type Transaction,
} from "./types";
import { getCategory } from "./categories";
import { formatCompact, formatRp, parseISODate, toISODate } from "./format";

// ---------------------------------------------------------------------
// Ringkasan dasar & Pembagian Saldo Cash vs Digital
// ---------------------------------------------------------------------

export function sumBy(txs: Transaction[], type: Transaction["type"]): number {
  return txs.reduce((acc, t) => (t.type === type ? acc + t.amount : acc), 0);
}

/** Total setoran bersih ke tabungan lewat aplikasi (tidak termasuk saldo awal). */
export function totalDeposits(data: AppData): number {
  return data.entries.reduce((a, e) => a + e.amount, 0);
}

export interface WalletBalances {
  cash: number;
  digital: number;
  total: number;
}

/**
 * Menghitung saldo Cash (tunai) dan Digital (Bank / E-Wallet) secara terpisah,
 * termasuk saldo awal dan perpindahan saldo (Tarik Tunai / Top-Up).
 */
export function walletBalances(data: AppData, settings: BudgetSettings = DEFAULT_SETTINGS): WalletBalances {
  let cashIn = 0;
  let cashOut = 0;
  let digitalIn = 0;
  let digitalOut = 0;

  for (const t of data.transactions) {
    if (t.wallet === "cash") {
      if (t.type === "income") cashIn += t.amount;
      else cashOut += t.amount;
    } else {
      if (t.type === "income") digitalIn += t.amount;
      else digitalOut += t.amount;
    }
  }

  const cash = settings.cashInitial + settings.netTransferToCash + cashIn - cashOut;
  const digital = settings.digitalInitial - settings.netTransferToCash + digitalIn - digitalOut - totalDeposits(data);
  return { cash, digital, total: cash + digital };
}

/** Saldo bersih yang bisa dipakai = Cash + Digital. */
export function netBalance(data: AppData, settings: BudgetSettings = DEFAULT_SETTINGS): number {
  return walletBalances(data, settings).total;
}

export function goalSaved(goal: SavingsGoal, data: AppData): number {
  return goal.initial_amount + data.entries.filter((e) => e.goal_id === goal.id).reduce((a, e) => a + e.amount, 0);
}

export function totalSavings(data: AppData): number {
  return data.goals.reduce((a, g) => a + goalSaved(g, data), 0);
}

export function debtRemaining(d: Debt): number {
  return Math.max(0, d.amount - d.paid);
}

export function totalDebt(data: AppData, direction: Debt["direction"]): number {
  return data.debts.filter((d) => d.direction === direction).reduce((a, d) => a + debtRemaining(d), 0);
}

// ---------------------------------------------------------------------
// Kontrol Batas Budget (Harian, Mingguan, Bulanan)
// ---------------------------------------------------------------------

export interface BudgetBar {
  label: string;
  spent: number;
  limit: number;
  remaining: number;
  ratio: number; // 0..∞
}

export interface BudgetOverview {
  hasAnyBudget: boolean;
  daily: BudgetBar;
  weekly: BudgetBar;
  monthly: BudgetBar;
  /** Jatah aman per hari untuk sisa hari di bulan ini (null jika budget bulanan belum diatur). */
  safeDailyAllowance: number | null;
  remainingDaysInMonth: number;
}

export function budgetOverview(data: AppData, settings: BudgetSettings, ref = new Date()): BudgetOverview {
  const todayStr = toISODate(ref);

  // Rentang minggu ini (Senin s/d Minggu)
  const dayOfWeek = (ref.getDay() + 6) % 7; // 0 = Senin, 6 = Minggu
  const mon = new Date(ref);
  mon.setDate(ref.getDate() - dayOfWeek);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const weekStart = toISODate(mon);
  const weekEnd = toISODate(sun);

  // Rentang bulan ini
  const y = ref.getFullYear();
  const m = ref.getMonth();
  const monthStart = toISODate(new Date(y, m, 1));
  const lastDayDate = new Date(y, m + 1, 0);
  const monthEnd = toISODate(lastDayDate);
  const daysInMonth = lastDayDate.getDate();
  const remainingDaysInMonth = Math.max(1, daysInMonth - ref.getDate() + 1);

  let todaySpent = 0;
  let weekSpent = 0;
  let monthSpent = 0;

  for (const t of data.transactions) {
    if (t.type !== "expense") continue;
    if (t.date === todayStr) todaySpent += t.amount;
    if (t.date >= weekStart && t.date <= weekEnd) weekSpent += t.amount;
    if (t.date >= monthStart && t.date <= monthEnd) monthSpent += t.amount;
  }

  const monthlyLimit = settings.monthlyBudget > 0 ? settings.monthlyBudget : 0;
  const weeklyLimit =
    settings.weeklyBudget > 0
      ? settings.weeklyBudget
      : settings.autoBreakdown && monthlyLimit > 0
        ? Math.round(monthlyLimit / 4)
        : 0;
  const dailyLimit =
    settings.dailyBudget > 0
      ? settings.dailyBudget
      : settings.autoBreakdown && monthlyLimit > 0
        ? Math.round(monthlyLimit / daysInMonth)
        : 0;

  const mkBar = (label: string, spent: number, limit: number): BudgetBar => ({
    label,
    spent,
    limit,
    remaining: limit - spent,
    ratio: limit > 0 ? spent / limit : 0,
  });

  // Pengeluaran bulan ini SEBELUM hari ini, untuk menghitung sisa jatah aman mulai hari ini
  const spentBeforeToday = Math.max(0, monthSpent - todaySpent);
  const safeDailyAllowance =
    monthlyLimit > 0 ? Math.max(0, Math.round((monthlyLimit - spentBeforeToday) / remainingDaysInMonth)) : null;

  return {
    hasAnyBudget: dailyLimit > 0 || weeklyLimit > 0 || monthlyLimit > 0,
    daily: mkBar("Daily", todaySpent, dailyLimit),
    weekly: mkBar("Weekly", weekSpent, weeklyLimit),
    monthly: mkBar("Monthly", monthSpent, monthlyLimit),
    safeDailyAllowance,
    remainingDaysInMonth,
  };
}

// ---------------------------------------------------------------------
// Periode
// ---------------------------------------------------------------------

export type Period = "month" | "3months" | "year";

export const PERIOD_LABEL: Record<Period, string> = {
  month: "This Month",
  "3months": "3 Months",
  year: "This Year",
};

export interface Range {
  start: string;
  end: string;
}

export function periodRange(period: Period, ref = new Date()): Range {
  const y = ref.getFullYear();
  const m = ref.getMonth();
  if (period === "month") return { start: toISODate(new Date(y, m, 1)), end: toISODate(new Date(y, m + 1, 0)) };
  if (period === "3months") return { start: toISODate(new Date(y, m - 2, 1)), end: toISODate(new Date(y, m + 1, 0)) };
  return { start: toISODate(new Date(y, 0, 1)), end: toISODate(new Date(y, 11, 31)) };
}

export function previousRange(period: Period, ref = new Date()): Range {
  const y = ref.getFullYear();
  const m = ref.getMonth();
  if (period === "month") return periodRange("month", new Date(y, m - 1, 1));
  if (period === "3months") return periodRange("3months", new Date(y, m - 3, 1));
  return periodRange("year", new Date(y - 1, 0, 1));
}

export function inRange(txs: Transaction[], r: Range): Transaction[] {
  return txs.filter((t) => t.date >= r.start && t.date <= r.end);
}

// ---------------------------------------------------------------------
// Analisis pengeluaran
// ---------------------------------------------------------------------

export interface CategoryStat {
  id: string;
  label: string;
  emoji: string;
  color: string;
  total: number;
  count: number;
  share: number;
}

export function byCategory(txs: Transaction[]): CategoryStat[] {
  const expenses = txs.filter((t) => t.type === "expense");
  const total = sumBy(expenses, "expense");
  const map = new Map<string, { total: number; count: number }>();
  for (const t of expenses) {
    const cur = map.get(t.category) ?? { total: 0, count: 0 };
    cur.total += t.amount;
    cur.count += 1;
    map.set(t.category, cur);
  }
  return [...map.entries()]
    .map(([id, v]) => {
      const c = getCategory(id);
      return { id, label: c.label, emoji: c.emoji, color: c.color, ...v, share: total ? v.total / total : 0 };
    })
    .sort((a, b) => b.total - a.total);
}

export interface Analysis {
  period: Period;
  range: Range;
  income: number;
  expense: number;
  cashExpense: number;
  digitalExpense: number;
  prevExpense: number;
  expenseChange: number | null;
  categories: CategoryStat[];
  dailyAverage: number;
  biggest: Transaction | null;
  weekendShare: number;
  txCount: number;
}

export function analyze(data: AppData, period: Period, ref = new Date()): Analysis {
  const range = periodRange(period, ref);
  const txs = inRange(data.transactions, range);
  const prev = inRange(data.transactions, previousRange(period, ref));
  const expense = sumBy(txs, "expense");
  const prevExpense = sumBy(prev, "expense");

  const start = parseISODate(range.start);
  const endDate = parseISODate(range.end) < ref ? parseISODate(range.end) : ref;
  const days = Math.max(1, Math.round((endDate.getTime() - start.getTime()) / 86_400_000) + 1);

  const expenses = txs.filter((t) => t.type === "expense");
  const cashExpense = expenses.filter((t) => t.wallet === "cash").reduce((a, t) => a + t.amount, 0);
  const digitalExpense = expense - cashExpense;
  const weekend = expenses
    .filter((t) => [0, 6].includes(parseISODate(t.date).getDay()))
    .reduce((a, t) => a + t.amount, 0);

  return {
    period,
    range,
    income: sumBy(txs, "income"),
    expense,
    cashExpense,
    digitalExpense,
    prevExpense,
    expenseChange: prevExpense > 0 ? (expense - prevExpense) / prevExpense : null,
    categories: byCategory(txs),
    dailyAverage: expense / days,
    biggest: expenses.reduce<Transaction | null>((b, t) => (!b || t.amount > b.amount ? t : b), null),
    weekendShare: expense ? weekend / expense : 0,
    txCount: txs.length,
  };
}

const pct = (n: number) => `${Math.round(n * 100)}%`;

export function localSummary(a: Analysis): string[] {
  const out: string[] = [];
  if (a.expense === 0) {
    out.push("Belum ada pengeluaran di periode ini. Catat transaksi pertamamu lewat tombol + atau iOS Shortcut.");
    return out;
  }
  const top = a.categories[0];
  if (top) {
    out.push(`Pengeluaran terbesarmu ada di ${top.label} (${pct(top.share)}), total ${formatRp(top.total)} dari ${top.count} transaksi.`);
  }
  if (a.expense > 0) {
    out.push(`Komposisi bayar: ${pct(a.digitalExpense / a.expense)} Digital (${formatCompact(a.digitalExpense)}) & ${pct(a.cashExpense / a.expense)} Cash (${formatCompact(a.cashExpense)}).`);
  }
  if (a.expenseChange !== null) {
    const ch = a.expenseChange;
    if (Math.abs(ch) < 0.05) out.push("Pengeluaranmu relatif stabil dibanding periode sebelumnya.");
    else if (ch > 0) out.push(`Pengeluaran naik ${pct(ch)} dibanding periode sebelumnya. Coba cek lagi pos yang membengkak.`);
    else out.push(`Mantap! Pengeluaran turun ${pct(-ch)} dibanding periode sebelumnya.`);
  }
  if (a.income > 0) {
    const ratio = a.expense / a.income;
    if (ratio > 1) out.push(`Pengeluaran sudah melebihi pemasukan (${pct(ratio)} dari uang jajan). Saatnya rem sedikit.`);
    else out.push(`Kamu sudah memakai ${pct(ratio)} dari pemasukan; sisa ${formatRp(a.income - a.expense)}.`);
  }
  if (a.weekendShare > 0.45) {
    out.push(`${pct(a.weekendShare)} pengeluaran terjadi di akhir pekan.`);
  }
  out.push(`Rata-rata ${formatCompact(a.dailyAverage)}/hari.`);
  return out;
}

export function analysisPayload(a: Analysis) {
  return {
    periode: PERIOD_LABEL[a.period],
    rentang: a.range,
    pemasukan: a.income,
    pengeluaran: a.expense,
    pengeluaran_cash: a.cashExpense,
    pengeluaran_digital: a.digitalExpense,
    pengeluaran_periode_sebelumnya: a.prevExpense,
    rata_rata_harian: Math.round(a.dailyAverage),
    porsi_akhir_pekan: Number(a.weekendShare.toFixed(2)),
    jumlah_transaksi: a.txCount,
    kategori: a.categories.map((c) => ({
      nama: c.label,
      total: c.total,
      porsi: Number(a.expense ? (c.total / a.expense).toFixed(2) : 0),
      jumlah_transaksi: c.count,
    })),
    transaksi_terbesar: a.biggest
      ? { kategori: getCategory(a.biggest.category).label, jumlah: a.biggest.amount, tanggal: a.biggest.date }
      : null,
  };
}
