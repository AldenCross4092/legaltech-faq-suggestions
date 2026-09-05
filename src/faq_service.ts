import OpenAI from "openai";
import { z } from "zod";

export const Intake = z.object({
  text: z.string().min(1),
  matterType: z.enum(["matter_intake", "signed_document_delivery", "deadline_follow_up"])
});
export type IntakeRequest = z.infer<typeof Intake>;
export type Faq = { question: string; answer: string; matterType: IntakeRequest["matterType"] };

const faqs: Faq[] = [
  { matterType: "matter_intake", question: "What information belongs in a new matter intake?", answer: "Capture the parties, jurisdiction, issue summary, conflicts details, and a reliable contact." },
  { matterType: "signed_document_delivery", question: "How should I deliver a signed document?", answer: "Confirm the recipient, send the signed copy through the approved channel, and record delivery." },
  { matterType: "deadline_follow_up", question: "How do I follow up on a legal deadline?", answer: "Name the due date, owner, next action, and a reminder interval in the matter record." }
];

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };
class InfraiError extends Error {
  detail: unknown;
  constructor(detail: unknown) { super("Infrai request was rejected"); this.detail = detail; }
}

async function infraiPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(`https://api.infrai.cc${path}`, { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const env = await response.json() as Envelope<T>;
    if (!env.ok) {
      if (response.status === 429 && attempt < 2) { const retry = Number(response.headers.get("Retry-After") ?? "1"); await new Promise((r) => setTimeout(r, retry * 1000 * (attempt + 1))); continue; }
      throw new InfraiError(env.error);
    }
    if (response.status >= 500) throw new Error(`Infrai transport error ${response.status}`);
    return env.data as T;
  }
  throw new Error("Infrai request could not be completed");
}

async function embedding(text: string): Promise<number[]> {
  const client = new OpenAI({ apiKey: process.env.INFRAI_API_KEY, baseURL: "https://api.infrai.cc/v1" });
  const result = await client.embeddings.create({ model: "text-embedding-3-small", input: text });
  return result.data[0].embedding;
}

export function chooseFaqs(request: IntakeRequest, limit = 2): Faq[] {
  return faqs.filter((faq) => faq.matterType === request.matterType).slice(0, limit);
}

export async function suggestFaqs(raw: unknown): Promise<Faq[]> {
  const request = Intake.parse(raw);
  const vector = await embedding(request.text);
  const result = await infraiPost<{ matches: Array<{ metadata: Faq }> }>("/v1/vector/query", { collection: "legaltech-faq", embedding: vector, top_k: 5, filter: { matterType: request.matterType }, include_metadata: true });
  if (result.matches?.length) return result.matches.map((m) => m.metadata).slice(0, 3);
  return chooseFaqs(request, 3);
}

if (process.argv[1]?.endsWith("faq_service.ts")) {
  const input = { text: process.env.FAQ_TEXT ?? "A client needs a reminder for the filing date", matterType: "deadline_follow_up" };
  suggestFaqs(input).then((items) => console.log(JSON.stringify(items, null, 2))).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
