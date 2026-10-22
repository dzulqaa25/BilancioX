const rupiah = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });

/** 1250000 -> "Rp 1.250.000" */
export function formatRp(value: number): string {
  const sign = value < 0 ? "−" : "";
  return `${sign}Rp ${rupiah.format(Math.abs(Math.round(value)))}`;
}

/** 1250000 -> "1.250.000" */
export function formatNumber(value: number): string {
  return rupiah.format(Math.round(value));
}

/** Versi ringkas: 1250000 -> "1,25 jt", 35000 -> "35 rb" */
export function formatCompact(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "−" : "";
  if (abs >= 1_000_000_000) return `${sign}${trim(abs / 1_000_000_000)} M`;
  if (abs >= 1_000_000) return `${sign}${trim(abs / 1_000_000)} jt`;
  if (abs >= 1_000) return `${sign}${trim(abs / 1_000)} rb`;
  return `${sign}${abs}`;
}

function trim(n: number): string {
  return n.toLocaleString("id-ID", { maximumFractionDigits: n >= 100 ? 0 : n >= 10 ? 1 : 2 });
}

/** Mengubah input bebas ("25.000", "25rb", "1,5jt") menjadi angka. */
export function parseAmount(input: string): number {
  const s = input.toLowerCase().replace(/\s/g, "").replace(/rp/g, "");
  const m = s.match(/^([\d.,]+)(rb|k|ribu|jt|juta)?$/);
  if (!m) return Number(s.replace(/\D/g, "")) || 0;
  let num = m[1];
  const unit = m[2];
  if (unit) {
    num = num.replace(/\./g, "").replace(",", ".");
    const base = parseFloat(num) || 0;
    const mult = unit === "jt" || unit === "juta" ? 1_000_000 : 1_000;
    return Math.round(base * mult);
  }
  return Number(num.replace(/[.,]/g, "")) || 0;
}

/** Tanggal lokal hari ini dalam format YYYY-MM-DD. */
export function todayISO(): string {
  return toISODate(new Date());
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

const dayFmt = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long" });
const shortFmt = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" });
const monthFmt = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" });

/** "Hari ini", "Kemarin", atau "Senin, 20 Oktober" */
export function formatDayLabel(iso: string): string {
  const today = todayISO();
  const y = new Date();
  y.setDate(y.getDate() - 1);
  if (iso === today) return "Hari ini";
  if (iso === toISODate(y)) return "Kemarin";
  return dayFmt.format(parseISODate(iso));
}

export function formatShortDate(iso: string): string {
  return shortFmt.format(parseISODate(iso));
}

/** "October 2026" (judul berbahasa Inggris) */
export function formatMonthTitle(d: Date = new Date()): string {
  return monthFmt.format(d);
}

export function greeting(d: Date = new Date()): string {
  const h = d.getHours();
  if (h < 11) return "Buongiorno";
  if (h < 17) return "Buon pomeriggio";
  return "Buonasera";
}

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
