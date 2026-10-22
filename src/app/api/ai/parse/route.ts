import { buildParsePrompt, parseMessageLocal, type ParsedIntent } from "@/lib/parser";
import { getCategory } from "@/lib/categories";
import { formatRp, todayISO } from "@/lib/format";
import { callGemini } from "../insight/route";

/** Mem-parse pesan menggunakan Gemini jika tersedia, atau parser lokal sebagai cadangan. */
export async function parseWithAI(message: string, source: "app" | "shortcut" = "shortcut"): Promise<ParsedIntent> {
  if (!process.env.GEMINI_API_KEY) {
    return parseMessageLocal(message, source);
  }

  try {
    const raw = await callGemini(buildParsePrompt(message), true);
    if (!raw) return parseMessageLocal(message, source);
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    if (parsed.kind === "transaction" && typeof parsed.amount === "number" && parsed.amount > 0) {
      const type = parsed.type === "income" ? "income" : "expense";
      const cat = getCategory(String(parsed.category ?? "lainnya"));
      const note = String(parsed.note ?? "").trim() || cat.label;
      return {
        kind: "transaction",
        data: { type, amount: Math.round(parsed.amount), category: cat.id, note, date: todayISO(), source },
        reply: `✅ *Tercatat (${type === "income" ? "Pemasukan" : "Pengeluaran"})*\n${cat.emoji} ${cat.label} · ${formatRp(parsed.amount)}\n_${note}_`,
      };
    }

    if (parsed.kind === "debt" && typeof parsed.amount === "number" && parsed.amount > 0) {
      const direction = parsed.direction === "owed" ? "owed" : "owe";
      const person = String(parsed.person ?? "Teman").trim() || "Teman";
      const note = String(parsed.note ?? "").trim() || null;
      return {
        kind: "debt",
        data: { direction, person, amount: Math.round(parsed.amount), paid: 0, due_date: null, note },
        reply: `✅ *${direction === "owe" ? "Hutang" : "Piutang"} tercatat*\n${person} · ${formatRp(parsed.amount)}`,
      };
    }

    if (parsed.kind === "savings" && typeof parsed.amount === "number" && parsed.amount > 0) {
      const goalHint = String(parsed.goalHint ?? "").trim();
      return {
        kind: "savings",
        goalHint,
        amount: Math.round(parsed.amount),
        reply: `✅ *Tabungan tercatat*\nSetor ${formatRp(parsed.amount)}${goalHint ? ` → ${goalHint}` : ""}`,
      };
    }

    return parseMessageLocal(message, source);
  } catch {
    return parseMessageLocal(message, source);
  }
}

export async function POST(req: Request) {
  const { message } = (await req.json()) as { message?: string };
  const intent = await parseWithAI(message ?? "", "shortcut");
  return Response.json(intent);
}
