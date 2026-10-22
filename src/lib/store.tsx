"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import type {
  AppData,
  NewDebt,
  NewEntry,
  NewGoal,
  NewTransaction,
} from "./types";
import { isSupabaseConfigured, getSupabase } from "./supabase";
import { localRepo, resetLocalData } from "./repo/local";
import { supabaseRepo } from "./repo/supabase";
import type { Repo } from "./repo/types";

type AuthStatus = "checking" | "signedIn" | "signedOut";
type LoadStatus = "idle" | "loading" | "ready" | "error";

const EMPTY: AppData = { transactions: [], debts: [], goals: [], entries: [] };

interface StoreValue {
  mode: Repo["mode"];
  authStatus: AuthStatus;
  session: Session | null;
  status: LoadStatus;
  error: string | null;
  data: AppData;
  reload: () => Promise<void>;
  signOut: () => Promise<void>;
  resetDemo: (empty: boolean) => Promise<void>;

  addTransaction: (t: NewTransaction) => Promise<void>;
  updateTransaction: (id: string, patch: Partial<NewTransaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addDebt: (d: NewDebt) => Promise<void>;
  updateDebt: (id: string, patch: Partial<NewDebt>) => Promise<void>;
  deleteDebt: (id: string) => Promise<void>;
  addGoal: (g: NewGoal) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  addEntry: (e: NewEntry) => Promise<void>;
}

const StoreContext = createContext<StoreValue | null>(null);

const repo: Repo = isSupabaseConfigured ? supabaseRepo : localRepo;

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [authStatus, setAuthStatus] = useState<AuthStatus>(isSupabaseConfigured ? "checking" : "signedIn");
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<LoadStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AppData>(EMPTY);

  // ---- Autentikasi (hanya mode cloud) ----
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const sb = getSupabase();
    sb.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthStatus(data.session ? "signedIn" : "signedOut");
    });
    const { data: sub } = sb.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setAuthStatus(s ? "signedIn" : "signedOut");
      if (!s) setData(EMPTY);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const reload = useCallback(async () => {
    setStatus((s) => (s === "ready" ? s : "loading"));
    try {
      const fresh = await repo.loadAll();
      setData(fresh);
      setError(null);
      setStatus("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("error");
    }
  }, []);

  // ---- Muat data setelah login ----
  useEffect(() => {
    if (authStatus !== "signedIn") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- memulai pemuatan data awal dari storage/Supabase
    reload();
  }, [authStatus, reload]);

  // ---- Segarkan saat aplikasi dibuka kembali (mis. setelah input dari iOS Shortcut) ----
  useEffect(() => {
    if (authStatus !== "signedIn" || repo.mode !== "cloud") return;
    const onVisible = () => {
      if (document.visibilityState === "visible") reload();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [authStatus, reload]);

  const value = useMemo<StoreValue>(
    () => ({
      mode: repo.mode,
      authStatus,
      session,
      status,
      error,
      data,
      reload,
      async signOut() {
        if (isSupabaseConfigured) await getSupabase().auth.signOut();
      },
      async resetDemo(empty) {
        resetLocalData(empty);
        await reload();
      },

      async addTransaction(t) {
        const row = await repo.addTransaction(t);
        setData((d) => ({ ...d, transactions: [row, ...d.transactions] }));
      },
      async updateTransaction(id, patch) {
        const row = await repo.updateTransaction(id, patch);
        setData((d) => ({ ...d, transactions: d.transactions.map((x) => (x.id === id ? row : x)) }));
      },
      async deleteTransaction(id) {
        await repo.deleteTransaction(id);
        setData((d) => ({ ...d, transactions: d.transactions.filter((x) => x.id !== id) }));
      },

      async addDebt(debt) {
        const row = await repo.addDebt(debt);
        setData((d) => ({ ...d, debts: [row, ...d.debts] }));
      },
      async updateDebt(id, patch) {
        const row = await repo.updateDebt(id, patch);
        setData((d) => ({ ...d, debts: d.debts.map((x) => (x.id === id ? row : x)) }));
      },
      async deleteDebt(id) {
        await repo.deleteDebt(id);
        setData((d) => ({ ...d, debts: d.debts.filter((x) => x.id !== id) }));
      },

      async addGoal(g) {
        const row = await repo.addGoal(g);
        setData((d) => ({ ...d, goals: [...d.goals, row] }));
      },
      async deleteGoal(id) {
        await repo.deleteGoal(id);
        setData((d) => ({
          ...d,
          goals: d.goals.filter((x) => x.id !== id),
          entries: d.entries.filter((x) => x.goal_id !== id),
        }));
      },

      async addEntry(e) {
        const row = await repo.addEntry(e);
        setData((d) => ({ ...d, entries: [row, ...d.entries] }));
      },
    }),
    [authStatus, session, status, error, data, reload],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore harus dipakai di dalam <StoreProvider>");
  return ctx;
}
