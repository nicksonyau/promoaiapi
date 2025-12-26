import { Env } from "../../index";
import { jsonResponse } from "../../_lib/utils";
import { auth } from "../../_lib/auth";

export async function broadcastScheduleHandler(req: Request, env: Env) {
  try {
    if (req.method !== "POST") {
      return jsonResponse({ success: false, error: "Method not allowed" }, 405);
    }

    const session = await auth(env, req);
    if (!session?.companyId) {
      return jsonResponse({ success: false, error: "Unauthorized" }, 401);
    }

    const { broadcastId, scheduleAt, phones } = await req.json();

    if (!broadcastId || !Array.isArray(phones)) {
      return jsonResponse({ success: false, error: "Invalid payload" }, 400);
    }

    const key = `broadcast:${session.companyId}:${broadcastId}`;
    const broadcast = await env.KV.get(key, { type: "json" }) as any;

    if (!broadcast || broadcast.status !== "draft") {
      return jsonResponse({ success: false, error: "Invalid broadcast state" }, 400);
    }

    broadcast.audience = {
      phones,
      total: phones.length
    };

    broadcast.scheduleAt = scheduleAt || null;
    broadcast.status = scheduleAt ? "scheduled" : "queued";
    broadcast.updatedAt = new Date().toISOString();

    await env.KV.put(key, JSON.stringify(broadcast));

    return jsonResponse({ success: true, broadcast });
  } catch (err: any) {
    console.error("[BROADCAST_SCHEDULE]", err);
    return jsonResponse({ success: false, error: err.message }, 500);
  }
}
