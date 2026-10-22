import type { AppData } from "../types";
import { toISODate, uid } from "../format";
import type { Repo } from "./types";

const KEY = "bilancio:v1";

function now() {
  return new Date().toISOString();
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toISODate(d);
}

/** Data contoh agar tampilan tidak kosong saat pertama kali dibuka. */
export function demoData(): AppData {
  const tx = (
    type: "income" | "expense",
    amount: number,
    category: string,
    note: string,
    ago: number,
  ) => ({
    id: uid(),
    type,
    amount,
    category,
    note,
    date: daysAgo(ago),
    source: "app" as const,
    created_at: now(),
  });

  const goalTrip = uid();
  const goalLaptop = uid();

  return {
    transactions: [
      tx("income", 1_500_000, "uang_jajan", "Uang jajan bulan ini", 20),
      tx("income", 250_000, "lainnya_masuk", "Jual buku bekas", 9),
      tx("expense", 18_000, "makan", "Kopi susu", 0),
      tx("expense", 22_000, "makan", "Nasi padang", 0),
      tx("expense", 15_000, "transportasi", "Ojol ke kampus", 1),
      tx("expense", 35_000, "makan", "Makan malam bareng teman", 1),
      tx("expense", 120_000, "belanja", "Kaos", 3),
      tx("expense", 50_000, "tagihan", "Paket data", 4),
      tx("expense", 45_000, "hiburan", "Nonton bioskop", 5),
      tx("expense", 75_000, "pendidikan", "Fotokopi & print tugas", 6),
      tx("expense", 28_000, "makan", "Seblak + es teh", 7),
      tx("expense", 20_000, "transportasi", "Bensin", 8),
      tx("expense", 32_000, "makan", "Ayam geprek", 10),
      tx("expense", 25_000, "kesehatan", "Obat flu", 12),
      tx("expense", 40_000, "makan", "Martabak", 14),
      tx("expense", 60_000, "belanja", "Alat tulis", 16),
      tx("expense", 30_000, "makan", "Bakso", 36),
      tx("expense", 90_000, "belanja", "Sandal", 40),
      tx("income", 1_500_000, "uang_jajan", "Uang jajan bulan lalu", 50),
    ],
    debts: [
      {
        id: uid(),
        direction: "owe",
        person: "Budi",
        amount: 100_000,
        paid: 40_000,
        due_date: daysAgo(-8),
        note: "Pinjam buat beli buku",
        created_at: now(),
      },
      {
        id: uid(),
        direction: "owed",
        person: "Sinta",
        amount: 50_000,
        paid: 0,
        due_date: null,
        note: "Talangin makan",
        created_at: now(),
      },
    ],
    goals: [
      {
        id: goalTrip,
        name: "Liburan ke Bali",
        emoji: "🏝️",
        target: 3_000_000,
        initial_amount: 500_000,
        deadline: null,
        created_at: now(),
      },
      {
        id: goalLaptop,
        name: "Dana darurat",
        emoji: "🛡️",
        target: 2_000_000,
        initial_amount: 300_000,
        deadline: null,
        created_at: now(),
      },
    ],
    entries: [
      { id: uid(), goal_id: goalTrip, amount: 200_000, date: daysAgo(15), note: null, created_at: now() },
      { id: uid(), goal_id: goalLaptop, amount: 100_000, date: daysAgo(11), note: null, created_at: now() },
    ],
  };
}

function read(): AppData {
  if (typeof window === "undefined") return { transactions: [], debts: [], goals: [], entries: [] };
  const raw = window.localStorage.getItem(KEY);
  if (raw) {
    try {
      return JSON.parse(raw) as AppData;
    } catch {
      /* data rusak, buat ulang */
    }
  }
  const seeded = demoData();
  write(seeded);
  return seeded;
}

function write(data: AppData) {
  window.localStorage.setItem(KEY, JSON.stringify(data));
}

function mutate<T>(fn: (d: AppData) => T): T {
  const data = read();
  const result = fn(data);
  write(data);
  return result;
}

export function resetLocalData(empty: boolean) {
  write(empty ? { transactions: [], debts: [], goals: [], entries: [] } : demoData());
}

export const localRepo: Repo = {
  mode: "demo",
  async loadAll() {
    return read();
  },

  async addTransaction(t) {
    return mutate((d) => {
      const row = { ...t, id: uid(), created_at: now() };
      d.transactions.unshift(row);
      return row;
    });
  },
  async updateTransaction(id, patch) {
    return mutate((d) => {
      const i = d.transactions.findIndex((x) => x.id === id);
      d.transactions[i] = { ...d.transactions[i], ...patch };
      return d.transactions[i];
    });
  },
  async deleteTransaction(id) {
    mutate((d) => {
      d.transactions = d.transactions.filter((x) => x.id !== id);
    });
  },

  async addDebt(debt) {
    return mutate((d) => {
      const row = { ...debt, id: uid(), created_at: now() };
      d.debts.unshift(row);
      return row;
    });
  },
  async updateDebt(id, patch) {
    return mutate((d) => {
      const i = d.debts.findIndex((x) => x.id === id);
      d.debts[i] = { ...d.debts[i], ...patch };
      return d.debts[i];
    });
  },
  async deleteDebt(id) {
    mutate((d) => {
      d.debts = d.debts.filter((x) => x.id !== id);
    });
  },

  async addGoal(g) {
    return mutate((d) => {
      const row = { ...g, id: uid(), created_at: now() };
      d.goals.push(row);
      return row;
    });
  },
  async deleteGoal(id) {
    mutate((d) => {
      d.goals = d.goals.filter((x) => x.id !== id);
      d.entries = d.entries.filter((x) => x.goal_id !== id);
    });
  },

  async addEntry(e) {
    return mutate((d) => {
      const row = { ...e, id: uid(), created_at: now() };
      d.entries.unshift(row);
      return row;
    });
  },
};
