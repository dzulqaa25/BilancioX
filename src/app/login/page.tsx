"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { useStore } from "@/lib/store";
import { Button, Eyebrow, Segmented, TextField } from "@/components/ui";

export default function LoginPage() {
  const { authStatus } = useStore();
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured || authStatus === "signedIn") {
      router.replace("/");
    }
  }, [authStatus, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const sb = getSupabase();
      if (mode === "signin") {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace("/");
      } else {
        const { error } = await sb.auth.signUp({ email, password });
        if (error) throw error;
        setMsg("Akun berhasil dibuat. Jika konfirmasi email aktif di Supabase, cek inbox kamu terlebih dulu.");
      }
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Gagal masuk.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pt-safe mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 pb-12">
      <div className="mb-8 text-center">
        <div className="tricolore mx-auto mb-3" />
        <Eyebrow>Personal Finance</Eyebrow>
        <h1 className="mt-1 font-serif text-5xl">Bilancio</h1>
        <p className="mt-2 text-sm text-muted">Masuk untuk membuka buku catatan keuanganmu.</p>
      </div>

      <form onSubmit={submit} className="card space-y-4 p-5">
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: "signin", label: "Sign In" },
            { value: "signup", label: "Sign Up" },
          ]}
        />
        <TextField
          label="Email"
          type="email"
          required
          placeholder="nama@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <TextField
          label="Password"
          type="password"
          required
          minLength={6}
          placeholder="Minimal 6 karakter"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {msg && <p className="text-xs leading-relaxed text-terracotta">{msg}</p>}
        <Button type="submit" disabled={busy}>
          {busy ? "Memproses…" : mode === "signin" ? "Masuk" : "Daftar"}
        </Button>
      </form>
    </div>
  );
}
