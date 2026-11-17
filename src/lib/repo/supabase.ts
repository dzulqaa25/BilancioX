import { getSupabase } from "../supabase";
import type { Debt, NewTransaction, SavingsEntry, SavingsGoal, Transaction, WalletType } from "../types";
import type { Repo } from "./types";

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

const num = (v: unknown) => (typeof v === "string" ? Number(v) : (v as number));

const CASH_TAG = " [cash]";
const DIGITAL_TAG = " [digital]";

/**
 * Menormalkan baris transaksi dari Supabase.
 * Mendukung kolom `wallet` asli MAUPUN tag cadangan `[cash]` pada `note`
 * sehingga tetap berfungsi 100% meskipun SQL ALTER TABLE belum dijalankan di Supabase.
 */
function normTx(r: Omit<Transaction, "source" | "wallet"> & { source: string; wallet?: string }): Transaction {
  let note = r.note;
  let wallet: WalletType = r.wallet === "cash" ? "cash" : "digital";

  if (typeof note === "string") {
    if (note.endsWith(CASH_TAG)) {
      wallet = "cash";
      note = note.slice(0, -CASH_TAG.length).trim() || null;
    } else if (note.endsWith(DIGITAL_TAG)) {
      wallet = "digital";
      note = note.slice(0, -DIGITAL_TAG.length).trim() || null;
    }
  }

  return {
    ...r,
    note,
    amount: num(r.amount),
    source: r.source === "app" ? "app" : "shortcut",
    wallet,
  };
}

function encodeNoteWithWallet(note: string | null | undefined, wallet: WalletType | undefined): string | null {
  const clean = (note ?? "").replace(/\s*\[(cash|digital)\]$/i, "").trim();
  if (wallet === "cash") return `${clean}${CASH_TAG}`.trim();
  return clean || null;
}

const normDebt = (r: Debt): Debt => ({ ...r, amount: num(r.amount), paid: num(r.paid) });
const normGoal = (r: SavingsGoal): SavingsGoal => ({
  ...r,
  target: num(r.target),
  initial_amount: num(r.initial_amount),
});
const normEntry = (r: SavingsEntry): SavingsEntry => ({ ...r, amount: num(r.amount) });

export const supabaseRepo: Repo = {
  mode: "cloud",

  async loadAll() {
    const sb = getSupabase();
    const [tx, debts, goals, entries] = await Promise.all([
      sb.from("transactions").select("*").order("date", { ascending: false }).order("created_at", { ascending: false }),
      sb.from("debts").select("*").order("created_at", { ascending: false }),
      sb.from("savings_goals").select("*").order("created_at", { ascending: true }),
      sb.from("savings_entries").select("*").order("date", { ascending: false }),
    ]);
    return {
      transactions: check<Transaction[]>(tx).map(normTx),
      debts: check<Debt[]>(debts).map(normDebt),
      goals: check<SavingsGoal[]>(goals).map(normGoal),
      entries: check<SavingsEntry[]>(entries).map(normEntry),
    };
  },

  async addTransaction(t) {
    const sb = getSupabase();
    // Percobaan 1: simpan dengan kolom `wallet` asli
    const first = await sb.from("transactions").insert(t).select().single();
    if (!first.error) return normTx(first.data as Transaction);

    // Percobaan 2: jika kolom `wallet` atau constraint `source` belum di-migrate di Supabase,
    // simpan informasi wallet secara transparan di dalam `note` dan sesuaikan `source`
    const { wallet, ...rest } = t;
    const compatPayload = {
      ...rest,
      note: encodeNoteWithWallet(t.note, wallet),
      source: /source_check|check constraint/i.test(first.error.message) ? "whatsapp" : t.source,
    };
    const second = await sb.from("transactions").insert(compatPayload).select().single();
    if (!second.error) return normTx({ ...(second.data as Transaction), wallet });

    const third = await sb
      .from("transactions")
      .insert({ ...compatPayload, source: "app" })
      .select()
      .single();
    return normTx({ ...check<Transaction>(third), wallet });
  },

  async updateTransaction(id, patch: Partial<NewTransaction>) {
    const sb = getSupabase();
    const first = await sb.from("transactions").update(patch).eq("id", id).select().single();
    if (!first.error) return normTx(first.data as Transaction);

    const { wallet, ...rest } = patch;
    const compatPatch = {
      ...rest,
      ...(wallet !== undefined ? { note: encodeNoteWithWallet(patch.note, wallet) } : {}),
    };
    return normTx(check(await sb.from("transactions").update(compatPatch).eq("id", id).select().single()));
  },

  async deleteTransaction(id) {
    check(await getSupabase().from("transactions").delete().eq("id", id));
  },

  async addDebt(d) {
    return normDebt(check(await getSupabase().from("debts").insert(d).select().single()));
  },
  async updateDebt(id, patch) {
    return normDebt(check(await getSupabase().from("debts").update(patch).eq("id", id).select().single()));
  },
  async deleteDebt(id) {
    check(await getSupabase().from("debts").delete().eq("id", id));
  },

  async addGoal(g) {
    return normGoal(check(await getSupabase().from("savings_goals").insert(g).select().single()));
  },
  async deleteGoal(id) {
    check(await getSupabase().from("savings_goals").delete().eq("id", id));
  },

  async addEntry(e) {
    return normEntry(check(await getSupabase().from("savings_entries").insert(e).select().single()));
  },
};
