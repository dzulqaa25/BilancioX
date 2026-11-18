import { analysisPayload } from "@/lib/finance";
import { formatRp } from "@/lib/format";
import { callGemini } from "@/lib/gemini";

type SummaryPayload = ReturnType<typeof analysisPayload>;

/**
 * Menghasilkan saran mendalam yang terstruktur dari data transaksi pengguna.
 * Dipakai sebagai cadangan otomatis jika panggilan ke Gemini API gagal/tidak tersedia,
 * sehingga tombol "Minta saran mendalam" selalu berhasil dan bermanfaat.
 */
function buildDeepFallbackInsight(s: SummaryPayload): string {
  const lines: string[] = [];
  const top = s.kategori[0];
  const second = s.kategori[1];

  if (top) {
    const sharePct = Math.round(top.porsi * 100);
    const avgPerTx = top.jumlah_transaksi > 0 ? Math.round(top.total / top.jumlah_transaksi) : top.total;
    lines.push(
      `1. Evaluasi Pos Utama (${top.nama}): Pos ini menyerap ${sharePct}% dari seluruh pengeluaranmu (${formatRp(top.total)} dalam ${top.jumlah_transaksi}× transaksi, rata-rata ${formatRp(avgPerTx)} per transaksi).${second ? ` Pos terbesar kedua adalah ${second.nama} sebesar ${formatRp(second.total)}.` : ""}`,
    );
  }

  const digitalShare = s.pengeluaran > 0 ? Math.round((s.pengeluaran_digital / s.pengeluaran) * 100) : 0;
  const cashShare = 100 - digitalShare;
  if (s.pemasukan > 0) {
    const sisa = s.pemasukan - s.pengeluaran;
    const rasio = Math.round((s.pengeluaran / s.pemasukan) * 100);
    lines.push(
      `2. Arus Kas & Metode Bayar: Kamu telah menggunakan ${rasio}% dari pemasukan (${sisa >= 0 ? `surplus ${formatRp(sisa)}` : `defisit ${formatRp(-sisa)}`}). Transaksi didominasi ${digitalShare >= cashShare ? `Saldo Digital (${digitalShare}%) dibanding Cash (${cashShare}%)` : `Uang Cash (${cashShare}%) dibanding Digital (${digitalShare}%)`}.`,
    );
  } else {
    lines.push(
      `2. Pola Pembayaran: Rata-rata pengeluaran harianmu berada di ${formatRp(s.rata_rata_harian)}/hari (${digitalShare}% Digital · ${cashShare}% Cash).`,
    );
  }

  if (top) {
    const targetSave = Math.max(10_000, Math.round((top.total * 0.2) / 5_000) * 5_000);
    const weekendNote =
      s.porsi_akhir_pekan >= 0.4
        ? ` Karena ${Math.round(s.porsi_akhir_pekan * 100)}% pengeluaran terjadi di akhir pekan, batasi pengeluaran Sabtu–Minggu maksimal ${formatRp(Math.round(s.rata_rata_harian * 1.2))}/hari.`
        : "";
    lines.push(
      `3. Rencana Penghematan Konkret: Pangkas 20% saja dari pos ${top.nama} untuk menghemat sekitar ${formatRp(targetSave)} di periode berikutnya.${weekendNote}`,
    );
  }

  return lines.join("\n\n");
}

export async function POST(req: Request) {
  let summary: SummaryPayload | null = null;
  try {
    summary = (await req.json()) as SummaryPayload;
    const prompt = `Kamu adalah penasihat keuangan pribadi yang ramah untuk seorang mahasiswa di Indonesia.
Analisis data keuangan berikut dan berikan 3 poin singkat dalam bahasa Indonesia yang santai, jelas, dan langsung bisa dipraktikkan (tanpa emoji):
1) Pos pengeluaran terbesar dan polanya,
2) Perbandingan dengan pemasukan serta komposisi Cash vs Digital,
3) Satu tips hemat konkret beserta perkiraan nominal Rupiah yang bisa dihemat.
Maksimal 110 kata.

Data JSON:
${JSON.stringify(summary)}`;

    const text = await callGemini(prompt, false);
    if (text) {
      return Response.json({ text });
    }
    return Response.json({ text: buildDeepFallbackInsight(summary) });
  } catch {
    if (summary) {
      return Response.json({ text: buildDeepFallbackInsight(summary) });
    }
    return Response.json({ text: "Belum cukup data transaksi untuk dianalisis." });
  }
}
