import { analysisPayload, type Analysis } from "@/lib/finance";

const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

/** Memanggil Google Gemini REST API tanpa ketergantungan SDK tambahan. */
export async function callGemini(prompt: string, jsonMode = false): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_MODEL}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: jsonMode ? 0.1 : 0.5,
        maxOutputTokens: 450,
        ...(jsonMode ? { responseMimeType: "application/json" } : {}),
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Gemini API (${res.status}): ${errText.slice(0, 160)}`);
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? null;
}

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

export type InsightRequest = ReturnType<typeof analysisPayload> | Analysis;
