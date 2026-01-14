import { jsonResponse } from "../../_lib/utils";
import { auth } from "../../_lib/auth";
import type { Env } from "../../index";

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
  updatedAt?: string;
};

function normalizeAgg(v: any): UsageAgg {
  return {
    waMessages: Number(v?.waMessages || 0),
    aiReplies: Number(v?.aiReplies || 0),
    storageBytes: Number(v?.storageBytes || 0),
    campaigns: Number(v?.campaigns || 0),
    updatedAt: v?.updatedAt,
  };
}

export async function subscriptionUsageGetHandler(req: Request, env: Env) {
  const traceId = crypto.randomUUID();

  try {
    if (req.method !== "GET") {
      return jsonResponse({ success: false, error: "Method not allowed" }, 405, req);
    }

    const session = await auth(env, req);
    if (!session?.companyId) {
      return jsonResponse({ success: false, error: "Unauthorized" }, 401, req);
    }

    const companyId = String(session.companyId);

    const dayKey = `usage:daily:${companyId}:${yyyyMmDd()}`;
    const monthKey = `usage:monthly:${companyId}:${yyyyMm()}`;

    const dailyRaw = await env.KV.get(dayKey, "json");
    const monthlyRaw = await env.KV.get(monthKey, "json");

    const daily = normalizeAgg(dailyRaw);
    const monthly = normalizeAgg(monthlyRaw);

    console.log("[usage/get] trace=", traceId, { companyId });

    return jsonResponse(
      { success: true, daily, monthly },
      200,
      req
    );
  } catch (e: any) {
    console.error("[usage/get] error trace=", traceId, e);
    return jsonResponse({ success: false, error: e?.message || "Internal error" }, 500, req);
  }
}
