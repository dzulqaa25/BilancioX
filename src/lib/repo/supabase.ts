import { getSupabase } from "../supabase";
import type { Debt, SavingsEntry, SavingsGoal, Transaction } from "../types";
import type { Repo } from "./types";

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

/** Supabase mengembalikan kolom numeric sebagai string; ubah ke number & normalisasi source lama. */
const num = (v: unknown) => (typeof v === "string" ? Number(v) : (v as number));

const normTx = (r: Omit<Transaction, "source"> & { source: string }): Transaction => ({
  ...r,
  amount: num(r.amount),
  source: r.source === "app" ? "app" : "shortcut",
});
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
    const first = await sb.from("transactions").insert(t).select().single();
    if (first.error && t.source === "shortcut" && /source_check|check constraint/i.test(first.error.message)) {
      // Kompatibilitas otomatis jika tabel di Supabase dibuat dengan skema lama ('app' | 'whatsapp')
      const fallback = await sb
        .from("transactions")
        .insert({ ...t, source: "whatsapp" })
        .select()
        .single();
      if (!fallback.error) return normTx(fallback.data as Transaction);
      const fallbackApp = await sb
        .from("transactions")
        .insert({ ...t, source: "app" })
        .select()
        .single();
      return normTx(check(fallbackApp));
    }
    return normTx(check(first));
  },
  async updateTransaction(id, patch) {
    return normTx(check(await getSupabase().from("transactions").update(patch).eq("id", id).select().single()));
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
