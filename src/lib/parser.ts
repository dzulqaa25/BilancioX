import { ALL_CATEGORIES, EXPENSE_CATEGORIES, INCOME_CATEGORIES, getCategory } from "./categories";
import { formatRp, parseAmount, todayISO } from "./format";
import type { DebtDirection, NewDebt, NewTransaction, TxType, WalletType } from "./types";

export type ParsedIntent =
  | {
      kind: "transaction";
      data: NewTransaction;
      /** true jika user menuliskan kata kunci cash/digital di kalimatnya; false jika belum disebutkan. */
      walletSpecified: boolean;
      reply: string;
    }
  | { kind: "debt"; data: NewDebt; reply: string }
  | { kind: "savings"; goalHint: string; amount: number; reply: string }
  | { kind: "summary"; reply: string }
  | { kind: "unknown"; reply: string };

/**
 * Kamus komprehensif (Bahasa Indonesia + Bahasa Inggris + Brand populer mahasiswa)
 * agar meskipun tanpa kuota AI, kalimat seperti "fried chicken 30rb" tetap akurat.
 */
const KEYWORD_CATEGORY: [RegExp, string][] = [
  [
    /\b(makan|minum|kopi|teh|nasi|ayam|mie|mi|bakso|baso|seblak|warteg|kantin|sarapan|jajan|gofood|grabfood|shopeefood|snack|cemilan|nyemil|roti|susu|padang|geprek|soto|sate|satai|es|jus|juice|catering|katering|fried\s*chicken|chicken|wings|nugget|burger|pizza|pasta|spaghetti|ramen|udon|sushi|dimsum|dumpling|gyoza|steak|kebab|shawarma|taco|toast|croissant|pastry|donut|donat|cake|kue|bakery|martabak|terang\s*bulan|pisang|cilok|cimol|cireng|batagor|siomay|pempek|tekwan|gado|ketoprak|pecel|rawon|rendang|gulai|tongseng|sop|sup|bubur|lontong|kupat|gudeg|lalapan|penyetan|lele|bebek|ikan|seafood|udang|cumi|kerang|rice\s*bowl|bowl|bento|salad|buah|fruit|lunch|dinner|breakfast|brunch|supper|meal|food|kuliner|resto|restoran|cafe|kafe|warkop|angkringan|warmindo|indomie|popmie|coffee|latte|cappuccino|americano|espresso|mocha|matcha|thaitea|thai\s*tea|milk\s*tea|boba|bubble|smoothie|mineral|aqua|le\s*minerale|galon|eskrim|ice\s*cream|gelato|yogurt|kfc|mcd|mcdonalds|burger\s*king|hokben|marugame|yoshinoya|solaria|richeese|gacoan|mixue|chatime|koi|janji\s*jiwa|kopi\s*kenangan|fore|tomoro|starbucks|sbux|jco|breadtalk|rotio|haus)\b/i,
    "makan",
  ],
  [
    /\b(ojol|gojek|goride|gocar|grab|grabV|grabbike|grabcar|maxim|indrive|bensin|pertalite|pertamax|shell|parkir|bus|transjakarta|tj|kereta|krl|commuter|mrt|lrt|angkot|travel|tiket|pesawat|kapal|tol|etoll|flazz|emoney|transport|transportasi|servis\s*motor|oli|ban|tambal)\b/i,
    "transportasi",
  ],
  [
    /\b(beli|belanja|shopee|tokopedia|tokped|tiktok\s*shop|lazada|blibli|baju|kaos|kemeja|celana|jaket|hoodie|sepatu|sandal|tas|dompet|jam|kacamata|skincare|makeup|kosmetik|parfum|sabun|shampo|odol|deterjen|tisue|tisu|alfamart|alfa|indomaret|superindo|ikea|miniso|mr\s*diy|charger|kabel|earphone|tws|case|aksesoris)\b/i,
    "belanja",
  ],
  [
    /\b(listrik|token|pln|pulsa|paket\s*data|kuota|telkomsel|byu|xl|axis|indosat|im3|tri|smartfren|wifi|indihome|biznet|internet|air|pdam|kos|kost|kosan|kontrakan|sewa|laundry|londri|langganan|spotify|netflix|youtube|icloud|canva|chatgpt|gemini|admin\s*bank|tagihan|iuran)\b/i,
    "tagihan",
  ],
  [
    /\b(nonton|bioskop|xxi|cgv|cinepolis|game|steam|valorant|mlbb|mobile\s*legends|genshin|playstation|ps|billiard|bowling|karaoke|nongkrong|konser|festival|tiket\s*wisata|wisata|jalan|healing|hiburan|topup\s*game|komik|novel)\b/i,
    "hiburan",
  ],
  [
    /\b(obat|dokter|apotek|apotik|klinik|puskesmas|rs|rumah\s*sakit|vitamin|suplemen|sakit|flu|demam|batuk|mag|maag|promag|tolak\s*angin|panadol|paracetamol|hansaplast|masker|bpjs|kesehatan|gigi|optik)\b/i,
    "kesehatan",
  ],
  [
    /\b(buku|print|ngeprint|fotokopi|fc|jilid|ukt|spp|sks|kampus|kuliah|praktikum|lab|alat\s*tulis|pulpen|pensil|binder|kertas|kursus|les|bootcamp|seminar|webinar|sertifikasi|pendidikan|skripsi|tesis)\b/i,
    "pendidikan",
  ],
];

const CASH_REGEX = /\b(cash|tunai|uang\s*tunai|kontan|pakai\s*cash|bayar\s*cash|bayar\s*tunai)\b/i;
const DIGITAL_REGEX =
  /\b(digital|qris|gopay|ovo|dana|shopeepay|spay|linkaja|bca|mybca|mandiri|livin|bri|brimo|bni|wondr|bsi|jago|seabank|blu|jenius|neobank|m-?banking|mbanking|transfer|tf|debit|kartu|va|virtual\s*account|flazz|emoney|brizzi|tapcash)\b/i;

/** Mendeteksi apakah user menyebutkan metode pembayaran cash atau digital. */
export function detectWallet(text: string): { wallet: WalletType; specified: boolean; cleaned: string } {
  if (CASH_REGEX.test(text)) {
    return {
      wallet: "cash",
      specified: true,
      cleaned: text.replace(CASH_REGEX, " ").replace(/\b(pakai|via|lewat|dengan)\s*$/i, "").replace(/\s+/g, " ").trim(),
    };
  }
  if (DIGITAL_REGEX.test(text)) {
    return {
      wallet: "digital",
      specified: true,
      cleaned: text.replace(DIGITAL_REGEX, " ").replace(/\b(pakai|via|lewat|dengan)\s*$/i, "").replace(/\s+/g, " ").trim(),
    };
  }
  return { wallet: "digital", specified: false, cleaned: text };
}

/** Mengekstrak nominal (mis. "25rb", "1,5jt", "35.000", "20000", atau "25") dari kalimat. */
function extractAmount(text: string): { amount: number; cleaned: string } {
  const regex =
    /(?:rp\.?\s*)?(\d+(?:[.,]\d+)?)\s*(rb|ribu|k|jt|juta)\b|(?:rp\.?\s*)(\d[\d.,]*)|\b(\d{4,}|\d{1,3}(?:[.,]\d{3})+|\d{1,3})\b/i;
  const m = text.match(regex);
  if (!m) return { amount: 0, cleaned: text.trim() };
  const raw = m[1] ? `${m[1]}${m[2]}` : (m[3] ?? m[4] ?? "0");
  let amount = parseAmount(raw);
  if (amount > 0 && amount < 1000 && !m[2]) {
    amount *= 1000;
  }
  const cleaned = text.replace(m[0], " ").replace(/\s+/g, " ").trim();
  return { amount, cleaned };
}

export function walletLabel(w: WalletType): string {
  return w === "cash" ? "Cash" : "Digital";
}

/**
 * Parser lokal berbasis aturan (tanpa kuota AI).
 * Dipakai langsung jika GEMINI_API_KEY belum diisi atau sebagai cadangan instan.
 */
export function parseMessageLocal(rawText: string, source: "app" | "shortcut" = "shortcut"): ParsedIntent {
  const text = rawText.trim();
  if (!text) {
    return { kind: "unknown", reply: "Ketik seperti: `fried chicken 30rb cash` atau `uang jajan 1,5jt digital`." };
  }

  if (/^(ringkasan|rekap|saldo|laporan|summary|info|help|bantuan)\b/i.test(text)) {
    return {
      kind: "summary",
      reply:
        "Format Input Cepat Bilancio\n" +
        "• Pengeluaran: `fried chicken 30rb cash`, `ojol ke kampus 15k qris`\n" +
        "• Pemasukan: `uang jajan 1,5jt digital`, `masuk 200rb cash`\n" +
        "• Hutang: `hutang ke Budi 50rb beli buku`\n" +
        "• Piutang: `piutang Sinta 35rb talangin makan`\n" +
        "• Tabungan: `nabung liburan 100rb`",
    };
  }

  const walletInfo = detectWallet(text);
  const { amount, cleaned } = extractAmount(walletInfo.cleaned);
  if (amount <= 0) {
    return {
      kind: "unknown",
      reply: "Nominal belum terbaca. Contoh: `fried chicken 30rb cash` atau `uang jajan 1,5jt`.",
    };
  }

  // ---- Tabungan ----
  if (/\b(nabung|tabung|setor\s*tabungan|menabung)\b/i.test(text)) {
    const goalHint = cleaned.replace(/\b(nabung|tabung|setor\s*tabungan|menabung|untuk|buat|ke)\b/gi, "").trim();
    return {
      kind: "savings",
      goalHint,
      amount,
      reply: `Tabungan tercatat · Setor ${formatRp(amount)}${goalHint ? ` ke ${goalHint}` : ""}`,
    };
  }

  // ---- Hutang / piutang ----
  if (/\b(hutang|utang|pinjam|piutang|dipinjam|minjem|ngutang|talangin)\b/i.test(text)) {
    const isOwed = /\b(piutang|dipinjam|minjem\s*ke\s*aku|talangin|pinjamin)\b/i.test(text);
    const direction: DebtDirection = isOwed ? "owed" : "owe";
    const personMatch = cleaned.match(/\b(?:ke|sama|dari|untuk|buat)\s+([A-Za-zÀ-ÿ]+)/i);
    const person =
      personMatch?.[1] ??
      (cleaned
        .replace(/\b(hutang|utang|pinjam|piutang|talangin|ke|sama|dari)\b/gi, "")
        .trim()
        .split(/\s+/)[0] ||
        "Teman");
    const note = cleaned || null;
    return {
      kind: "debt",
      data: { direction, person, amount, paid: 0, due_date: null, note },
      reply: `${direction === "owe" ? "Hutang" : "Piutang"} tercatat · ${person} · ${formatRp(amount)}`,
    };
  }

  // ---- Pemasukan vs Pengeluaran ----
  const isIncome =
    /\b(uang\s*jajan|kiriman|bulanan|pemasukan|masuk|dapat|dikasih|gaji|bonus|beasiswa|freelance|jual)\b/i.test(text);
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
    wallet: walletInfo.wallet,
  };

  return {
    kind: "transaction",
    data: tx,
    walletSpecified: walletInfo.specified,
    reply: `Tercatat (${type === "income" ? "Pemasukan" : "Pengeluaran"} · ${walletLabel(walletInfo.wallet)})\n${cat.label} · ${formatRp(amount)} — ${note}`,
  };
}

/**
 * Jika Gemini mengembalikan kategori "lainnya" padahal kamus lokal mengenali kata kuncinya
 * (mis. "fried chicken"), gunakan kategori spesifik dari kamus lokal.
 */
export function refineCategoryWithKeywords(text: string, type: TxType, aiCategory: string): string {
  if (type === "expense" && (aiCategory === "lainnya" || !EXPENSE_CATEGORIES.some((c) => c.id === aiCategory))) {
    for (const [re, id] of KEYWORD_CATEGORY) {
      if (re.test(text)) return id;
    }
    return "lainnya";
  }
  if (type === "income" && !INCOME_CATEGORIES.some((c) => c.id === aiCategory)) {
    return /\b(uang\s*jajan|kiriman|bulanan|ortu)\b/i.test(text) ? "uang_jajan" : "lainnya_masuk";
  }
  return aiCategory;
}

/** Prompt sistem untuk Gemini saat mem-parse input kalimat bebas. */
export function buildParsePrompt(message: string): string {
  const expIds = EXPENSE_CATEGORIES.map((c) => `${c.id} (${c.label})`).join(", ");
  const incIds = INCOME_CATEGORIES.map((c) => `${c.id} (${c.label})`).join(", ");
  const validIds = ALL_CATEGORIES.map((c) => c.id).join("|");
  return `Kamu adalah AI parser transaksi keuangan mahasiswa Indonesia untuk aplikasi Bilancio.
Tugasmu: ubah kalimat pengguna menjadi JSON murni (tanpa markdown).

Daftar kategori pengeluaran: ${expIds}
Daftar kategori pemasukan: ${incIds}

ATURAN KATEGORI PENTING:
1. Semua makanan, minuman, jajanan, bahan makan, istilah kuliner bahasa Inggris, maupun nama restoran/kafe/brand makanan (contoh: "fried chicken", "burger", "chicken wings", "ramen", "sushi", "croissant", "coffee", "matcha", "boba", "ice cream", "KFC", "McD", "Mixue", "Gacoan", "HokBen", "Fore", "Kopi Kenangan", "GoFood", "ShopeeFood") WAJIB masuk kategori "makan" (Makan & Minum). JANGAN pernah masukkan makanan/minuman ke "lainnya".
2. Bensin, parkir, ojol, Gojek, Grab, Maxim, KRL, MRT, servis motor -> "transportasi".
3. Baju, sepatu, skincare, sabun, belanja Shopee/Tokopedia, Indomaret/Alfamart (non-makanan) -> "belanja".
4. Kuota, pulsa, listrik, token, wifi, kos, laundry, Netflix, Spotify, iCloud -> "tagihan".
5. Bioskop, nonton, topup game, nongkrong, konser, wisata -> "hiburan".
6. Obat, vitamin, dokter, apotek, klinik -> "kesehatan".
7. Buku, print, fotokopi, jilid, UKT, alat tulis, kursus -> "pendidikan".
8. Gunakan "lainnya" HANYA jika benar-benar tidak cocok dengan 7 kategori di atas.

ATURAN METODE PEMBAYARAN (wallet):
- Jika pengguna menyebutkan kata "cash", "tunai", "kontan" -> "wallet": "cash"
- Jika pengguna menyebutkan "digital", "qris", "gopay", "ovo", "dana", "shopeepay", "bca", "mandiri", "bri", "bni", "jago", "seabank", "transfer", "tf", "debit", "mbanking" -> "wallet": "digital"
- Jika pengguna TIDAK menyebutkan metode pembayaran sama sekali -> "wallet": null

Skema JSON yang wajib dikembalikan:
- Transaksi pemasukan/pengeluaran:
  {"kind":"transaction","type":"expense"|"income","amount":number,"category":"${validIds}","note":"string (nama item bersih tanpa nominal dan tanpa kata cash/digital)","wallet":"cash"|"digital"|null}
- Hutang/piutang:
  {"kind":"debt","direction":"owe"|"owed","person":"string","amount":number,"note":"string"}
- Tabungan:
  {"kind":"savings","goalHint":"string","amount":number}
- Bantuan/ringkasan:
  {"kind":"summary"}

Contoh:
Input: "fried chicken 30rb" -> {"kind":"transaction","type":"expense","amount":30000,"category":"makan","note":"Fried chicken","wallet":null}
Input: "fried chicken 30rb cash" -> {"kind":"transaction","type":"expense","amount":30000,"category":"makan","note":"Fried chicken","wallet":"cash"}
Input: "ojol ke kampus 15k qris" -> {"kind":"transaction","type":"expense","amount":15000,"category":"transportasi","note":"Ojol ke kampus","wallet":"digital"}

Pesan: ${JSON.stringify(message)}`;
}
