import { jsonResponse } from "../../_lib/utils";
import { auth } from "../../_lib/auth";
import type { Env } from "../../index";

type UsageType = "wa_message" | "ai_reply" | "storage_bytes" | "campaign";

type UsageLogBody = {
  type: UsageType;
  amount?: number; // default 1
};

function yyyyMmDd(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function yyyyMm(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

type UsageAgg = {
  waMessages: number;
  aiReplies: number;
  storageBytes: number;
  campaigns: number;
  updatedAt: string;
};

function emptyAgg(): UsageAgg {
  return {
    waMessages: 0,
    aiReplies: 0,
    storageBytes: 0,
    campaigns: 0,
    updatedAt: new Date().toISOString(),
  };
}

async function bumpAgg(env: Env, key: string, type: UsageType, amt: number) {
  const cur = (await env.KV.get(key, "json")) as UsageAgg | null;
  const agg = cur && typeof cur === "object" ? { ...emptyAgg(), ...cur } : emptyAgg();

  const n = Number.isFinite(amt) ? Math.max(0, Math.floor(amt)) : 1;

  if (type === "wa_message") agg.waMessages += n;
  if (type === "ai_reply") agg.aiReplies += n;
  if (type === "campaign") agg.campaigns += n;
  if (type === "storage_bytes") agg.storageBytes += n;

  agg.updatedAt = new Date().toISOString();
  await env.KV.put(key, JSON.stringify(agg));
  return agg;
}

export async function subscriptionUsageLogHandler(req: Request, env: Env) {
  const traceId = crypto.randomUUID();

  try {
    if (req.method !== "POST") {
      return jsonResponse({ success: false, error: "Method not allowed" }, 405, req);
    }

    const session = await auth(env, req);
    if (!session?.companyId) {
      return jsonResponse({ success: false, error: "Unauthorized" }, 401, req);
    }

    const body = (await req.json().catch(() => null)) as UsageLogBody | null;
    const type = String(body?.type || "") as UsageType;

    const allowed: UsageType[] = ["wa_message", "ai_reply", "storage_bytes", "campaign"];
    if (!allowed.includes(type)) {
      return jsonResponse({ success: false, error: "Invalid usage type" }, 400, req);
    }

    const amount = typeof body?.amount === "number" ? body.amount : 1;

    const companyId = String(session.companyId);
    const dayKey = `usage:daily:${companyId}:${yyyyMmDd()}`;
    const monthKey = `usage:monthly:${companyId}:${yyyyMm()}`;

    const daily = await bumpAgg(env, dayKey, type, amount);
    const monthly = await bumpAgg(env, monthKey, type, amount);

    console.log("[usage/log] trace=", traceId, { companyId, type, amount });

    return jsonResponse({ success: true, daily, monthly }, 200, req);
  } catch (e: any) {
    console.error("[usage/log] error trace=", traceId, e);
    return jsonResponse({ success: false, error: e?.message || "Internal error" }, 500, req);
  }
}
