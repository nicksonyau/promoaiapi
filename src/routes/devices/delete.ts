// src/routes/whatsapp/devices/delete.ts
import { Env } from "../../index";
import { auth } from "../../_lib/auth";
import { jsonResponse } from "../../_lib/utils";

export async function deviceDeleteHandler(req: Request, env: Env, sessionId: string) {
  const session = await auth(env, req);
  if (!session || !session.companyId) {
    return jsonResponse({ success: false, error: "Unauthorised" }, 401);
  }

  const companyId = session.companyId;

  await env.KV.delete(`wa:device:${sessionId}`);

  const indexKey = `wa:devices:${companyId}`;
  const list = await env.KV.get(indexKey, "json") || [];

  await env.KV.put(indexKey, JSON.stringify(list.filter((x: string) => x !== sessionId)));

  return jsonResponse({ success: true });
}
