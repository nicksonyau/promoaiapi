// src/routes/whatsapp/devices/runtime.ts
import { Env } from "../../index";
import { jsonResponse } from "../../_lib/utils";

export async function deviceRuntimeUpdateHandler(req: Request, env: Env, sessionId: string) {
  const updates = await req.json();

  const key = `wa:device:${sessionId}`;
  const device = await env.KV.get(key, "json");

  if (!device) return jsonResponse({ success: false, error: "Not found" }, 404);

  const merged = {
    ...device,
    ...updates, // { ready, qr, jid, number, meta }
    lastUpdated: Date.now(),
  };

  await env.KV.put(key, JSON.stringify(merged));

  return jsonResponse({ success: true });
}
