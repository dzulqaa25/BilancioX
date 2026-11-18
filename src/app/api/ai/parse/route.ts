import {
  buildParsePrompt,
  detectWallet,
  parseMessageLocal,
  refineCategoryWithKeywords,
  walletLabel,
  type ParsedIntent,
} from "@/lib/parser";
import { getCategory } from "@/lib/categories";
import { formatRp, todayISO } from "@/lib/format";
import type { WalletType } from "@/lib/types";
import { callGemini } from "@/lib/gemini";

/** Mem-parse pesan menggunakan Gemini jika tersedia, atau parser lokal sebagai cadangan. */
async function parseWithAI(message: string, source: "app" | "shortcut" = "shortcut"): Promise<ParsedIntent> {
  if (!process.env.GEMINI_API_KEY) {
    return parseMessageLocal(message, source);
  }

  try {
    const raw = await callGemini(buildParsePrompt(message), true);
    if (!raw) return parseMessageLocal(message, source);
    const cleanedJson = raw.replace(/^```(?:json)?\s*|\s*```$/gi, "").trim();
    const parsed = JSON.parse(cleanedJson) as Record<string, unknown>;
    const amount = Number(parsed.amount);

    if (parsed.kind === "transaction" && Number.isFinite(amount) && amount > 0) {
      const type = parsed.type === "income" ? "income" : "expense";
      const refinedCatId = refineCategoryWithKeywords(message, type, String(parsed.category ?? "lainnya"));
      const cat = getCategory(refinedCatId);

      // Periksa apakah user menyebutkan cash/digital (baik dari deteksi AI maupun regex lokal)
      const localWallet = detectWallet(message);
      const aiWallet = parsed.wallet === "cash" || parsed.wallet === "digital" ? (parsed.wallet as WalletType) : null;
      const walletSpecified = Boolean(aiWallet || localWallet.specified);
      const wallet: WalletType = aiWallet ?? localWallet.wallet;

      const note = String(parsed.note ?? "").trim() || cat.label;
      return {
        kind: "transaction",
        data: {
          type,
          amount: Math.round(amount),
          category: cat.id,
          note,
          date: todayISO(),
          source,
          wallet,
        },
        walletSpecified,
        reply: `Tercatat (${type === "income" ? "Pemasukan" : "Pengeluaran"} · ${walletLabel(wallet)})\n${cat.label} · ${formatRp(amount)} — ${note}`,
      };
    }

    if (parsed.kind === "debt" && Number.isFinite(amount) && amount > 0) {
      const direction = parsed.direction === "owed" ? "owed" : "owe";
      const person = String(parsed.person ?? "Teman").trim() || "Teman";
      const note = String(parsed.note ?? "").trim() || null;
      return {
        kind: "debt",
        data: { direction, person, amount: Math.round(amount), paid: 0, due_date: null, note },
        reply: `${direction === "owe" ? "Hutang" : "Piutang"} tercatat · ${person} · ${formatRp(amount)}`,
      };
    }

    if (parsed.kind === "savings" && Number.isFinite(amount) && amount > 0) {
      const goalHint = String(parsed.goalHint ?? "").trim();
      return {
        kind: "savings",
        goalHint,
        amount: Math.round(amount),
        reply: `Tabungan tercatat · Setor ${formatRp(amount)}${goalHint ? ` ke ${goalHint}` : ""}`,
      };
    }

    return parseMessageLocal(message, source);
  } catch {
    return parseMessageLocal(message, source);
  }
}

export async function POST(req: Request) {
  try {
    const { message } = (await req.json()) as { message?: string };
    const intent = await parseWithAI(message ?? "", "shortcut");
    return Response.json(intent);
  } catch {
    return Response.json(parseMessageLocal("", "shortcut"));
  }
}
