// src/routes/whatsapp/devices/update.ts
import { Env } from "../../index";
import { jsonResponse } from "../../_lib/utils";

export async function deviceUpdateHandler(req: Request, env: Env, sessionId: string) {
  const body = await req.json();

  const key = `wa:device:${sessionId}`;
  const exists = await env.KV.get(key, "json");

  if (!exists) {
    return jsonResponse({ success: false, error: "Device not found" }, 404);
  }

  const updated = {
    ...exists,
    ...body,
    lastUpdated: Date.now(),
  };

  await env.KV.put(key, JSON.stringify(updated));

  return jsonResponse({ success: true });
}
