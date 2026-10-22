"use client";

import { useState } from "react";
import { formatNumber } from "@/lib/format";

/** Label kecil berhuruf kapital ala menu restoran. */
export function Eyebrow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <p className={`text-xs uppercase tracking-[0.22em] text-muted ${className}`}>{children}</p>;
}

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.16em] text-muted">{children}</span>;
}

const inputCls =
  "w-full rounded-2xl border border-line bg-card px-4 py-3 text-ink outline-none placeholder:text-muted/70 focus:border-oro";

export function TextField(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, className = "", ...rest } = props;
  return (
    <label className="block">
      <FieldLabel>{label}</FieldLabel>
      <input className={`${inputCls} ${className}`} {...rest} />
    </label>
  );
}

/** Input nominal Rupiah dengan pemisah ribuan otomatis. */
export function AmountInput({
  value,
  onChange,
  label = "Nominal",
  autoFocus,
  large,
}: {
  value: number;
  onChange: (n: number) => void;
  label?: string;
  autoFocus?: boolean;
  large?: boolean;
}) {
  const [text, setText] = useState(value ? formatNumber(value) : "");
  return (
    <label className="block">
      <FieldLabel>{label}</FieldLabel>
      <div className={`flex items-baseline gap-2 rounded-2xl border border-line bg-card px-4 focus-within:border-oro ${large ? "py-4" : "py-3"}`}>
        <span className={`font-serif text-muted ${large ? "text-2xl" : "text-base"}`}>Rp</span>
        <input
          inputMode="numeric"
          autoFocus={autoFocus}
          placeholder="0"
          value={text}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, "").slice(0, 13);
            const n = Number(digits || 0);
            setText(digits ? formatNumber(n) : "");
            onChange(n);
          }}
          className={`num w-full bg-transparent text-ink outline-none placeholder:text-muted/50 ${large ? "font-serif text-4xl" : ""}`}
        />
      </div>
    </label>
  );
}

export function Button({
  variant = "primary",
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) {
  const styles = {
    primary: "bg-hero text-hero-ink",
    ghost: "border border-line bg-card text-ink",
    danger: "border border-terracotta/40 text-terracotta",
  }[variant];
  return (
    <button
      className={`flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 font-medium transition active:scale-[0.98] disabled:opacity-40 ${styles} ${className}`}
      {...rest}
    />
  );
}

/** Pilihan segmen (mis. Expense / Income). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; activeClass?: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex rounded-full border border-line bg-card p-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`flex-1 rounded-full px-3 py-2 text-sm font-medium transition ${
              active ? (o.activeClass ?? "bg-hero text-hero-ink") : "text-muted"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Chip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm transition ${
        active ? "bg-hero text-hero-ink" : "border border-line text-muted"
      }`}
    >
      {children}
    </button>
  );
}

export function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-soft">
      <div
        className="h-full rounded-full transition-[width] duration-700"
        style={{ width: `${Math.min(100, Math.max(0, value * 100))}%`, background: color }}
      />
    </div>
  );
}

export function PageHeader({ eyebrow, title, right }: { eyebrow: string; title: string; right?: React.ReactNode }) {
  return (
    <header className="mb-5 flex items-end justify-between gap-3">
      <div>
        <div className="tricolore mb-2" />
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="font-serif text-[34px] leading-tight">{title}</h1>
      </div>
      {right}
    </header>
  );
}

export function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="card px-6 py-10 text-center">
      <p className="font-serif text-xl">{title}</p>
      <p className="mt-1 text-sm text-muted">{hint}</p>
    </div>
  );
}
