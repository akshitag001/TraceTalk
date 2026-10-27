import { NextResponse } from "next/server";
import { offlineResponse } from "@/lib/parseLocal";
import { OUTPUT_SCHEMA_HINT, PARSER_SYSTEM_PROMPT, RECHECK_INSTRUCTION, SUMMARY_SYSTEM_PROMPT } from "@/lib/prompts";
import { ParseResult, SummaryResult } from "@/lib/schema";
import type { ParseRequest, ParseResponse } from "@/lib/types";
import { validateParse } from "@/lib/validate";

export const runtime = "nodejs";

interface SummaryRequest {
  mode: "summary";
  facts: { id: string; text: string; eventTime?: string; evidence: string[] }[];
}

function config() {
  const base = process.env.LLM_BASE_URL;
  const key = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL;
  return base && key && model ? { base: base.replace(/\/$/, ""), key, model } : null;
}

type Msg = { role: "system" | "user" | "assistant"; content: string };

async function chat(cfg: NonNullable<ReturnType<typeof config>>, messages: Msg[]): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25_000);
  try {
    const res = await fetch(`${cfg.base}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${cfg.key}` },
      body: JSON.stringify({ model: cfg.model, messages, temperature: 0, response_format: { type: "json_object" } }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`model returned HTTP ${res.status}`);
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string") throw new Error("model returned no content");
    return content.replace(/^```(?:json)?\s*|\s*```$/g, "");
  } finally {
    clearTimeout(timer);
  }
}

/** One call, one retry with the validation error, then give up. */
async function callValidated<T>(
  cfg: NonNullable<ReturnType<typeof config>>,
  messages: Msg[],
  schema: { safeParse: (v: unknown) => { success: true; data: T } | { success: false; error: { message: string } } },
): Promise<T> {
  let last = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const content = await chat(cfg, attempt === 0 ? messages : [...messages, { role: "assistant", content: last }, {
      role: "user",
      content: "That output did not match the schema. Return only valid JSON matching the schema exactly.",
    }]);
    last = content;
    let json: unknown;
    try {
      json = JSON.parse(content);
    } catch {
      continue;
    }
    const parsed = schema.safeParse(json);
    if (parsed.success) return parsed.data;
  }
  throw new Error("model output failed validation twice");
}

async function handleParse(req: ParseRequest): Promise<ParseResponse> {
  const cfg = config();
  if (!cfg) return offlineResponse(req, "no model configured");
  const payload = {
    note: req.note,
    timezone: req.timezone,
    caseDate: req.caseDate,
    pinnedEventIds: req.pinnedEventIds,
    ledger: req.ledger,
    candidates: req.candidates,
    ...(req.mode === "recheck" ? { recheck: req.recheck } : {}),
  };
  const messages: Msg[] = [
    { role: "system", content: PARSER_SYSTEM_PROMPT },
    {
      role: "user",
      content: `${req.mode === "recheck" ? RECHECK_INSTRUCTION + "\n\n" : ""}Output schema:\n${OUTPUT_SCHEMA_HINT}\n\nInput:\n${JSON.stringify(payload)}`,
    },
  ];
  try {
    const data = await callValidated(cfg, messages, ParseResult);
    const { result, rejected } = validateParse(data, req.candidates, req.ledger);
    return { parser: "model", result, rejected };
  } catch (err) {
    return offlineResponse(req, err instanceof Error ? err.message : "model call failed");
  }
}

async function handleSummary(req: SummaryRequest) {
  const cfg = config();
  if (!cfg || !req.facts.length) return { sentences: null };
  const valid = new Set(req.facts.flatMap((f) => [f.id, ...f.evidence]));
  try {
    const data = await callValidated(
      cfg,
      [
        { role: "system", content: SUMMARY_SYSTEM_PROMPT },
        { role: "user", content: JSON.stringify({ confirmedFacts: req.facts }) },
      ],
      SummaryResult,
    );
    // Any sentence citing an ID that doesn't exist is dropped.
    const sentences = data.sentences.filter((s) => s.citations.every((id) => valid.has(id)));
    return { sentences: sentences.length ? sentences : null };
  } catch {
    return { sentences: null };
  }
}

export async function GET() {
  return NextResponse.json({ model: !!config() });
}

export async function POST(request: Request) {
  let body: ParseRequest | SummaryRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (body.mode === "summary") return NextResponse.json(await handleSummary(body));
  if (typeof body.note !== "string" || !Array.isArray(body.candidates)) {
    return NextResponse.json({ error: "missing note or candidates" }, { status: 400 });
  }
  return NextResponse.json(await handleParse(body));
}
