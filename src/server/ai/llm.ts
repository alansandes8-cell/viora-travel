import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { and, gte, sql } from "drizzle-orm";
import { db, schema } from "../db";
import { getSetting } from "../settings";

/**
 * Conversación con un modelo de lenguaje, con proveedores intercambiables:
 * - Google Gemini (GEMINI_API_KEY): tiene un plan gratuito con límite diario.
 * - Groq (GROQ_API_KEY): también tiene plan gratuito.
 * - Claude (ANTHROPIC_API_KEY): pago, si la agencia lo configura.
 * Gemini y Groq se usan por su interfaz compatible con OpenAI (sin SDK extra).
 * Si no hay ninguno, `chat()` devuelve null y la plataforma sigue sin IA.
 */

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface Provider {
  name: "gemini" | "groq" | "anthropic";
  model: string;
}

export function llmProvider(): Provider | null {
  if (process.env.GEMINI_API_KEY) return { name: "gemini", model: process.env.GEMINI_MODEL || "gemini-2.5-flash" };
  if (process.env.GROQ_API_KEY) return { name: "groq", model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile" };
  if (process.env.ANTHROPIC_API_KEY) return { name: "anthropic", model: process.env.AI_MODEL || "claude-opus-5-5" };
  return null;
}

export function llmConfigured(): boolean {
  return llmProvider() !== null;
}

const OPENAI_COMPAT: Record<"gemini" | "groq", { url: string; key: () => string | undefined }> = {
  gemini: { url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", key: () => process.env.GEMINI_API_KEY },
  groq: { url: "https://api.groq.com/openai/v1/chat/completions", key: () => process.env.GROQ_API_KEY },
};

let anthropicClient: Anthropic | null = null;

async function underDailyLimit(): Promise<boolean> {
  const limit = await getSetting<number>("ai_daily_limit", 200);
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  const [row] = await db().select({ n: sql<number>`count(*)::int` }).from(schema.aiRuns).where(and(gte(schema.aiRuns.createdAt, since)));
  return (row?.n ?? 0) < limit;
}

async function logRun(stage: string, model: string, started: number, ok: boolean, error?: string) {
  await db()
    .insert(schema.aiRuns)
    .values({ stage, projectId: null, model, inputTokens: null, outputTokens: null, durationMs: Date.now() - started, ok, error: error?.slice(0, 500) ?? null })
    .catch(() => {});
}

/**
 * Envía la conversación y devuelve el texto de la respuesta (o null si no hay IA,
 * se alcanzó el límite diario o el proveedor falló). Con `json: true` pide un objeto JSON.
 */
export async function chat(stage: string, messages: ChatMessage[], opts: { json?: boolean; maxTokens?: number; temperature?: number } = {}): Promise<string | null> {
  const p = llmProvider();
  if (!p || !(await underDailyLimit())) return null;
  const started = Date.now();
  try {
    let text: string | null;
    if (p.name === "anthropic") {
      anthropicClient ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 60_000, maxRetries: 1 });
      const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
      const res = await anthropicClient.messages.create({
        model: p.model,
        max_tokens: opts.maxTokens ?? 800,
        system,
        messages: messages.filter((m) => m.role !== "system").map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      });
      text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    } else {
      const cfg = OPENAI_COMPAT[p.name];
      const res = await fetch(cfg.url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.key()}` },
        body: JSON.stringify({
          model: p.model,
          messages,
          max_tokens: opts.maxTokens ?? 800,
          temperature: opts.temperature ?? 0.4,
          ...(opts.json ? { response_format: { type: "json_object" } } : {}),
        }),
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      text = data.choices?.[0]?.message?.content ?? null;
    }
    await logRun(stage, `${p.name}:${p.model}`, started, !!text);
    return text?.trim() || null;
  } catch (e) {
    await logRun(stage, `${p.name}:${p.model}`, started, false, (e as Error).message);
    return null;
  }
}

/** Extrae el primer objeto JSON de una respuesta (tolera bloques ```json). */
export function parseJsonObject(text: string | null): unknown {
  if (!text) return null;
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}
