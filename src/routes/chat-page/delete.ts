// src/routes/chat-page/delete.ts
import type { Env } from "../../index";
import { jsonResponse } from "../_lib/utils";
import { requireCompany } from "../../_lib/auth";

function safeJsonParse<T>(s: string, fallback: T): T {
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

function extractId(x: any): string {
  if (typeof x === "string") return x.trim();
  if (x && typeof x === "object") {
    const v = x.id ?? x.widgetId ?? x.chatpageId;
    if (typeof v === "string") return v.trim();
  }
  return "";
}

async function removeFromIndex(env: Env, indexKey: string, id: string) {
  const raw = await env.KV.get(indexKey);
  if (!raw) return;

  const parsed = safeJsonParse<any>(raw, []);
  const arr = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.list)
      ? parsed.list
      : [];

  if (!Array.isArray(arr) || arr.length === 0) return;

  const next = arr.filter((x: any) => extractId(x) !== id);
  if (next.length === arr.length) return;

  const nextIds = next.map(extractId).filter(Boolean);
  await env.KV.put(indexKey, JSON.stringify(nextIds));
}

export async function chatpageDeleteHandler(
  req: Request,
  env: Env,
  id: string
): Promise<Response> {
  try {
    // Match create.ts behavior (company-scoped)
    const session = await requireCompany(env, req);
    if (!session?.companyId) {
      return jsonResponse({ success: false, error: "Unauthorized" }, 401);
    }

    const widgetId = (id || "").trim();
    if (!widgetId) {
      return jsonResponse({ success: false, error: "Missing id" }, 400);
    }

    // ✅ MUST match create/update/get key format
    const primaryKey = `chat_page:${session.companyId}:${widgetId}`;

    // Backward-compat cleanup (won’t hurt if missing)
    const legacyKeys = [
      `chatpage:${widgetId}`,
      `chat_page:${widgetId}`,
      `chatpage:${session.companyId}:${widgetId}`,
    ];

    const existed = await env.KV.get(primaryKey);

    // Delete primary key (and legacy just in case)
    await env.KV.delete(primaryKey);
    for (const k of legacyKeys) await env.KV.delete(k);

    // If you maintain an index elsewhere, prune both possible index keys
    await removeFromIndex(env, `chat_page:index:${session.companyId}`, widgetId);
    await removeFromIndex(env, `chatpage:index:${session.companyId}`, widgetId);
    await removeFromIndex(env, `chatpage:index`, widgetId);

    // If it didn't exist, still return success (same behavior you wanted)
    if (!existed) {
      return jsonResponse({ success: true, stale: true });
    }

    return jsonResponse({ success: true });
  } catch (e: any) {
    return jsonResponse(
      { success: false, error: e?.message || "Failed to delete" },
      500
    );
  }
}
