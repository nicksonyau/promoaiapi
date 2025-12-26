// src/routes/whatsapp/devices/create.ts
import { Env } from "../../index";
import { auth } from "../../_lib/auth";
import { jsonResponse } from "../../_lib/utils";

export async function devicesCreateHandler(req: Request, env: Env) {
  const session = await auth(env, req);
  if (!session || !session.companyId) {
    return jsonResponse({ success: false, error: "Unauthorised" }, 401);
  }

  const companyId = session.companyId;
  const sessionId = crypto.randomUUID();

  const record = {
    sessionId,
    companyId,
    ready: false,
    number: null,
    jid: null,
    meta: null,
    lastUpdated: Date.now(),
  };

  await env.KV.put(`wa:device:${sessionId}`, JSON.stringify(record));

  // Index update
  const indexKey = `wa:devices:${companyId}`;
  const existing = await env.KV.get(indexKey, "json") || [];
  await env.KV.put(indexKey, JSON.stringify([...existing, sessionId]));

  return jsonResponse({ success: true, sessionId }, 201);
}
