import { Env } from "../../../index";
import { jsonResponse } from "../../_lib/utils";
import { requireCompany } from "../../../_lib/auth";

export async function webhookSubscriptionsCreateHandler(req: Request, env: Env) {
  try {
    if (req.method !== "POST")
      return jsonResponse({ success: false, error: "Method not allowed" }, 405);

    const session = await requireCompany(env, req);
    if (!session?.companyId)
      return jsonResponse({ success: false, error: "Unauthorized" }, 401);

    const body = await req.json();

    if (!body?.endpoint?.url || !body?.endpoint?.method)
      return jsonResponse({ success: false, error: "Missing endpoint" }, 400);

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const record = {
      id,
      companyId: session.companyId,
      description: body.description || "",
      endpoint: {
        method: body.endpoint.method,
        url: body.endpoint.url,
        headers: body.endpoint.headers || [],
      },
      labels: body.labels || [],
      metadata: body.metadata || [],
      eventTypeIds: body.eventTypeIds || [],
      enabled: body.enabled !== false,
      signing: {
        mode: body.signing?.mode || "none",
        header: body.signing?.header || "X-PromoHubAI-Signature",
        secret:
          body.signing?.mode === "hmac-sha256"
            ? crypto.randomUUID().replace(/-/g, "")
            : undefined,
      },
      createdAt: now,
      updatedAt: now,
    };

    const key = `webhook:subscription:${session.companyId}:${id}`;
    const indexKey = `webhook:subscription-index:${session.companyId}`;

    await env.KV.put(key, JSON.stringify(record));

    const index = ((await env.KV.get(indexKey, "json")) as string[]) || [];
    index.unshift(id);
    await env.KV.put(indexKey, JSON.stringify(index));

    return jsonResponse({ success: true, data: record });
  } catch (e: any) {
    return jsonResponse(
      { success: false, error: e?.message || "Server error" },
      500
    );
  }
}
