"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Transaction, TxType } from "@/lib/types";
import { useStore } from "@/lib/store";
import { TransactionSheet, type TxSheetState } from "./TransactionSheet";
import { IconArch, IconChart, IconHome, IconList, IconPlus } from "./Icons";

interface ShellUI {
  openNew: (type?: TxType) => void;
  openEdit: (tx: Transaction) => void;
}

const ShellContext = createContext<ShellUI | null>(null);

export function useShell(): ShellUI {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useShell harus dipakai di dalam <AppShell>");
  return ctx;
}

const TABS = [
  { href: "/", label: "Home", Icon: IconHome },
  { href: "/transactions", label: "Transactions", Icon: IconList },
  { href: "/insights", label: "Insights", Icon: IconChart },
  { href: "/savings", label: "Savings", Icon: IconArch },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { authStatus, status, error, reload } = useStore();
  const router = useRouter();
  const [sheet, setSheet] = useState<TxSheetState>({ open: false, type: "expense", editing: null });

  useEffect(() => {
    if (authStatus === "signedOut") router.replace("/login");
  }, [authStatus, router]);

  const openNew = useCallback((type: TxType = "expense") => setSheet({ open: true, type, editing: null }), []);
  const openEdit = useCallback((tx: Transaction) => setSheet({ open: true, type: tx.type, editing: tx }), []);
  const close = useCallback(() => setSheet((s) => ({ ...s, open: false })), []);

  if (authStatus !== "signedIn" || status === "idle" || status === "loading") {
    return <Splash />;
  }

  return (
    <ShellContext.Provider value={{ openNew, openEdit }}>
      <div className="pt-safe mx-auto min-h-dvh max-w-md px-5 pb-32">
        {status === "error" && (
          <div className="card mb-4 border-terracotta/40 p-4 text-sm">
            <p className="font-medium text-terracotta">Gagal memuat data</p>
            <p className="mt-1 text-muted">{error}</p>
            <button onClick={reload} className="mt-2 font-medium underline">
              Coba lagi
            </button>
          </div>
        )}
        {children}
      </div>
      <TabBar onAdd={() => openNew()} />
      <TransactionSheet state={sheet} onClose={close} />
    </ShellContext.Provider>
  );
}

function TabBar({ onAdd }: { onAdd: () => void }) {
  const pathname = usePathname();
  const left = TABS.slice(0, 2);
  const right = TABS.slice(2);

  const renderTab = ({ href, label, Icon }: (typeof TABS)[number]) => {
    const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
    return (
      <Link
        key={href}
        href={href}
        className={`flex flex-1 flex-col items-center gap-0.5 pt-2 text-[12px] transition ${active ? "text-terracotta" : "text-muted"}`}
        aria-current={active ? "page" : undefined}
      >
        <Icon />
        {label}
      </Link>
    );
  };

  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-md items-start px-2">
        {left.map(renderTab)}
        <div className="flex flex-1 justify-center">
          <button
            onClick={onAdd}
            aria-label="Tambah transaksi"
            className="-mt-5 flex h-14 w-14 items-center justify-center rounded-full border-4 border-bg bg-hero text-hero-ink shadow-[0_10px_24px_-8px_rgba(43,33,28,0.6)] transition active:scale-90"
          >
            <IconPlus width={26} height={26} />
          </button>
        </div>
        {right.map(renderTab)}
      </div>
    </nav>
  );
}

export function Splash() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4">
      <div className="arch flex h-20 w-14 items-center justify-center bg-hero">
        <div className="h-5 w-5 animate-pulse rounded-full bg-limone-fill" />
      </div>
      <p className="font-serif text-2xl">Bilancio</p>
    </div>
  );
}
