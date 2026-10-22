import { analysisPayload } from "@/lib/finance";
import { callGemini } from "@/lib/gemini";

export async function POST(req: Request) {
  try {
    const summary = (await req.json()) as ReturnType<typeof analysisPayload>;
    if (!process.env.GEMINI_API_KEY) {
      return Response.json({
        text:
          "💡 GEMINI_API_KEY belum diisi di file .env.local. " +
          "Ringkasan di atas sudah dihitung otomatis oleh Bilancio. " +
          "Setelah kamu menambahkan GEMINI_API_KEY dari Google AI Studio, tombol ini akan memberikan analisis dan saran personal dari Gemini.",
      });
    }

    const prompt = `Kamu adalah penasihat keuangan pribadi yang ramah untuk seorang mahasiswa di Indonesia.
Analisis data keuangan berikut dan berikan 3 poin singkat dalam bahasa Indonesia yang santai, jelas, dan langsung bisa dipraktikkan:
1) Pos pengeluaran terbesar dan polanya,
2) Perbandingan dengan pemasukan (uang jajan) atau periode sebelumnya,
3) Satu tips hemat konkret beserta perkiraan nominal Rupiah yang bisa dihemat.
Jangan gunakan judul bertele-tele. Maksimal 110 kata.

Data JSON:
${JSON.stringify(summary)}`;

    const text = await callGemini(prompt, false);
    return Response.json({ text: text ?? "Tidak ada respons dari Gemini." });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Gagal memanggil Gemini." },
      { status: 500 },
    );
  }
}
