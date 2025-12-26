// routes/events/ingest.ts
import { Env } from "../../index";
import { jsonResponse } from "../_lib/utils";
import { requireApiKey } from "../api-keys/_lib/apiKeyAuth";

export async function eventIngestHandler(req: Request, env: Env) {
  if (req.method !== "POST")
    return jsonResponse({ error: "Method not allowed" }, 405);

  const auth = await requireApiKey(env, req);
  if (!auth)
    return jsonResponse({ error: "Unauthorized" }, 401);

  const body = await req.json().catch(() => null);
  if (!body?.event_type || !body?.payload)
    return jsonResponse({ error: "Invalid payload" }, 400);

  const eventId = crypto.randomUUID();
  const key = `event:${auth.companyId}:${eventId}`;

  await env.KV.put(
    key,
    JSON.stringify({
      id: eventId,
      companyId: auth.companyId,
      ...body,
      receivedAt: new Date().toISOString(),
    })
  );

  return jsonResponse({
    success: true,
    eventId,
  });
}
