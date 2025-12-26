// src/routes/whatsapp/devices/list.ts
import { Env } from "../../index";
import { auth } from "../../_lib/auth";
import { jsonResponse } from "../../_lib/utils";

export async function devicesListHandler(req: Request, env: Env) {
  const session = await auth(env, req);
  
  if (!session || !session.companyId) {
    return jsonResponse({ success: false, error: "Unauthorised" }, 401);
  }

  const companyId = session.companyId;

  const indexKey = `wa:devices:${companyId}`;
  const deviceIds = await env.KV.get(indexKey, "json") || [];

  const results = [];

  for (const id of deviceIds) {
    const data = await env.KV.get(`wa:device:${id}`, "json");
    if (data) results.push(data);
  }

  return jsonResponse({ success: true, devices: results });
}
