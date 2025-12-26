import { Env } from "../../index";
import { auth } from "../../_lib/auth";

export async function broadcastStartHandler(req: Request, env: Env) {
  const session = await auth(env, req);
  if (!session?.companyId) return;

  const { broadcastId } = await req.json();
  const key = `broadcast:${session.companyId}:${broadcastId}`;
  const broadcast = await env.KV.get(key, { type: "json" }) as any;

  if (!broadcast || broadcast.status !== "queued") return;

  broadcast.status = "running";
  broadcast.metrics.queued = broadcast.audience.total;
  broadcast.updatedAt = new Date().toISOString();

  await env.KV.put(key, JSON.stringify(broadcast));

  // ⚠️ NO sending here – execution engine later
}
