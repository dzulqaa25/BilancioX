import { ALL_CATEGORIES, EXPENSE_CATEGORIES, INCOME_CATEGORIES, getCategory } from "./categories";
import { formatRp, parseAmount, todayISO } from "./format";
import type { DebtDirection, NewDebt, NewTransaction, TxType } from "./types";

export type ParsedIntent =
  | { kind: "transaction"; data: NewTransaction; reply: string }
  | { kind: "debt"; data: NewDebt; reply: string }
  | { kind: "savings"; goalHint: string; amount: number; reply: string }
  | { kind: "summary"; reply: string }
  | { kind: "unknown"; reply: string };

const KEYWORD_CATEGORY: [RegExp, string][] = [
  [/\b(makan|minum|kopi|teh|nasi|ayam|mie|bakso|seblak|warteg|kantin|sarapan|jajan|gofood|grabfood|snack|roti|susu|padang|geprek)\b/i, "makan"],
  [/\b(ojol|gojek|grab|maxim|bensin|parkir|bus|kereta|krl|mrt|angkot|transjakarta|tol|transport)\b/i, "transportasi"],
  [/\b(beli|belanja|shopee|tokopedia|tiktok|lazada|baju|kaos|celana|sepatu|sandal|skincare|sabun|shampo|alfamart|indomaret)\b/i, "belanja"],
  [/\b(listrik|token|pulsa|paket\s*data|kuota|wifi|internet|air|pdam|kos|kost|sewa|langganan|spotify|netflix)\b/i, "tagihan"],
  [/\b(nonton|bioskop|game|steam|karaoke|nongkrong|konser|jalan|healing|hiburan)\b/i, "hiburan"],
  [/\b(obat|dokter|apotek|klinik|vitamin|sakit|rs|bpjs|kesehatan)\b/i, "kesehatan"],
  [/\b(buku|print|fotokopi|jilid|ukt|spp|kampus|kuliah|alat\s*tulis|kursus|seminar)\b/i, "pendidikan"],
];

/** Mengekstrak nominal (mis. "25rb", "1,5jt", "35.000", "20000") dari kalimat. */
function extractAmount(text: string): { amount: number; cleaned: string } {
  const regex = /(?:rp\.?\s*)?(\d+(?:[.,]\d+)?)\s*(rb|ribu|k|jt|juta)\b|(?:rp\.?\s*)(\d[\d.,]*)|\b(\d{4,}|\d{1,3}(?:[.,]\d{3})+)\b/i;
  const m = text.match(regex);
  if (!m) return { amount: 0, cleaned: text.trim() };
  const raw = m[1] ? `${m[1]}${m[2]}` : (m[3] ?? m[4] ?? "0");
  const amount = parseAmount(raw);
  const cleaned = text.replace(m[0], " ").replace(/\s+/g, " ").trim();
  return { amount, cleaned };
}

/**
 * Parser lokal berbasis aturan (tanpa kuota AI).
 * Dipakai langsung jika GEMINI_API_KEY belum diisi atau sebagai cadangan.
 */
export function parseMessageLocal(rawText: string, source: "app" | "shortcut" = "shortcut"): ParsedIntent {
  const text = rawText.trim();
  if (!text) {
    return { kind: "unknown", reply: "Ketik seperti: `nasi padang 22rb` atau `uang jajan 1,5jt`." };
  }

  if (/^(ringkasan|rekap|saldo|laporan|summary|info|help|bantuan)\b/i.test(text)) {
    return {
      kind: "summary",
      reply:
        "📊 *Format Input Cepat Bilancio*\n" +
        "• Pengeluaran: `kopi susu 18rb`, `ojol ke kampus 15k`\n" +
        "• Pemasukan: `uang jajan 1,5jt`, `masuk 200rb jual buku`\n" +
        "• Hutang: `hutang ke Budi 50rb beli buku`\n" +
        "• Piutang: `piutang Sinta 35rb talangin makan`\n" +
        "• Tabungan: `nabung liburan 100rb`",
    };
  }

  const { amount, cleaned } = extractAmount(text);
  if (amount <= 0) {
    return {
      kind: "unknown",
      reply: "Nominal belum terbaca. Contoh: `makan siang 25rb` atau `uang jajan 1,5jt`.",
    };
  }

  // ---- Tabungan ----
  if (/\b(nabung|tabung|setor\s*tabungan|menabung)\b/i.test(text)) {
    const goalHint = cleaned.replace(/\b(nabung|tabung|setor\s*tabungan|menabung|untuk|buat|ke)\b/gi, "").trim();
    return {
      kind: "savings",
      goalHint,
      amount,
      reply: `✅ *Tabungan tercatat*\nSetor ${formatRp(amount)}${goalHint ? ` → ${goalHint}` : ""}`,
    };
  }

  // ---- Hutang / piutang ----
  if (/\b(hutang|utang|pinjam|piutang|dipinjam|minjem|ngutang|talangin)\b/i.test(text)) {
    const isOwed = /\b(piutang|dipinjam|minjem\s*ke\s*aku|talangin|pinjamin)\b/i.test(text);
    const direction: DebtDirection = isOwed ? "owed" : "owe";
    const personMatch = cleaned.match(/\b(?:ke|sama|dari|untuk|buat)\s+([A-Za-zÀ-ÿ]+)/i);
    const person = personMatch?.[1] ?? (cleaned.replace(/\b(hutang|utang|pinjam|piutang|talangin|ke|sama|dari)\b/gi, "").trim().split(/\s+/)[0] || "Teman");
    const note = cleaned || null;
    return {
      kind: "debt",
      data: { direction, person, amount, paid: 0, due_date: null, note },
      reply: `✅ *${direction === "owe" ? "Hutang" : "Piutang"} tercatat*\n${person} · ${formatRp(amount)}`,
    };
  }

  // ---- Pemasukan vs Pengeluaran ----
  const isIncome = /\b(uang\s*jajan|kiriman|bulanan|pemasukan|masuk|dapat|dikasih|gaji|bonus|beasiswa|freelance|jual)\b/i.test(text);
  const type: TxType = isIncome ? "income" : "expense";

  let category = type === "income" ? "uang_jajan" : "lainnya";
  if (type === "income") {
    if (!/\b(uang\s*jajan|kiriman|bulanan|ortu)\b/i.test(text)) category = "lainnya_masuk";
  } else {
    for (const [re, id] of KEYWORD_CATEGORY) {
      if (re.test(text)) {
        category = id;
        break;
      }
    }
  }

  const cat = getCategory(category);
  const note = cleaned || cat.label;
  const tx: NewTransaction = {
    type,
    amount,
    category,
    note,
    date: todayISO(),
    source,
  };

  return {
    kind: "transaction",
    data: tx,
    reply: `✅ *Tercatat (${type === "income" ? "Pemasukan" : "Pengeluaran"})*\n${cat.emoji} ${cat.label} · ${formatRp(amount)}\n_${note}_`,
  };
}

/** Prompt sistem untuk Gemini saat mem-parse input kalimat bebas. */
export function buildParsePrompt(message: string): string {
  const expIds = EXPENSE_CATEGORIES.map((c) => `${c.id} (${c.label})`).join(", ");
  const incIds = INCOME_CATEGORIES.map((c) => `${c.id} (${c.label})`).join(", ");
  const validIds = ALL_CATEGORIES.map((c) => c.id).join("|");
  return `Kamu adalah parser transaksi keuangan mahasiswa Indonesia untuk aplikasi Bilancio.
Ubah kalimat berikut menjadi JSON murni (tanpa markdown, tanpa penjelasan).

Kategori pengeluaran: ${expIds}
Kategori pemasukan: ${incIds}

Skema JSON yang wajib dikembalikan:
- Jika pemasukan/pengeluaran:
  {"kind":"transaction","type":"expense"|"income","amount":number,"category":"${validIds}","note":"string"}
- Jika hutang/piutang:
  {"kind":"debt","direction":"owe"|"owed","person":"string","amount":number,"note":"string"}
- Jika menabung:
  {"kind":"savings","goalHint":"string","amount":number}
- Jika minta ringkasan/bantuan:
  {"kind":"summary"}

Pesan: ${JSON.stringify(message)}`;
}
