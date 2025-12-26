import { Env } from "../../index";
import { jsonResponse } from "../../_lib/utils";
import { auth } from "../../_lib/auth";

export async function broadcastPauseHandler(req: Request, env: Env) {
  try {
    const session = await auth(env, req);
    if (!session?.companyId) {
      return jsonResponse({ success: false, error: "Unauthorized" }, 401);
    }

    const { broadcastId } = await req.json();
    const key = `broadcast:${session.companyId}:${broadcastId}`;
    const broadcast = await env.KV.get(key, { type: "json" }) as any;

    if (!broadcast || broadcast.status !== "running") {
      return jsonResponse({ success: false, error: "Invalid state" }, 400);
    }

    broadcast.status = "paused";
    broadcast.updatedAt = new Date().toISOString();

    await env.KV.put(key, JSON.stringify(broadcast));

    return jsonResponse({ success: true });
  } catch (err: any) {
    console.error("[BROADCAST_PAUSE]", err);
    return jsonResponse({ success: false, error: err.message }, 500);
  }
}
