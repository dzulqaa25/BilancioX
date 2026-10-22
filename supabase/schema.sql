-- =====================================================================
-- Bilancio — skema database Supabase
-- Jalankan seluruh file ini di Supabase Dashboard → SQL Editor → Run.
-- =====================================================================

-- ---------- Transaksi (pemasukan & pengeluaran) ----------
create table if not exists public.transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  type        text not null check (type in ('income', 'expense')),
  amount      bigint not null check (amount > 0),
  category    text not null,
  note        text,
  date        date not null default current_date,
  source      text not null default 'app' check (source in ('app', 'shortcut', 'whatsapp')),
  created_at  timestamptz not null default now()
);
-- Jika tabel sudah terlanjur dibuat sebelumnya, perbarui constraint source:
alter table public.transactions drop constraint if exists transactions_source_check;
alter table public.transactions add constraint transactions_source_check check (source in ('app', 'shortcut', 'whatsapp'));
create index if not exists transactions_user_date_idx on public.transactions (user_id, date desc);

-- ---------- Hutang / piutang ----------
create table if not exists public.debts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  direction   text not null check (direction in ('owe', 'owed')),
  person      text not null,
  amount      bigint not null check (amount > 0),
  paid        bigint not null default 0 check (paid >= 0),
  due_date    date,
  note        text,
  created_at  timestamptz not null default now()
);

-- ---------- Target tabungan ----------
create table if not exists public.savings_goals (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name            text not null,
  emoji           text not null default '💰',
  target          bigint not null check (target > 0),
  initial_amount  bigint not null default 0,
  deadline        date,
  created_at      timestamptz not null default now()
);

-- ---------- Setoran / penarikan tabungan ----------
create table if not exists public.savings_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  goal_id     uuid not null references public.savings_goals (id) on delete cascade,
  amount      bigint not null,
  date        date not null default current_date,
  note        text,
  created_at  timestamptz not null default now()
);

-- ---------- Row Level Security: setiap user hanya melihat datanya sendiri ----------
alter table public.transactions    enable row level security;
alter table public.debts           enable row level security;
alter table public.savings_goals   enable row level security;
alter table public.savings_entries enable row level security;

do $$
declare t text;
begin
  foreach t in array array['transactions', 'debts', 'savings_goals', 'savings_entries'] loop
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format(
      'create policy "own rows" on public.%I for all to authenticated
         using (user_id = (select auth.uid()))
         with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;
