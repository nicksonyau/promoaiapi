import { Env } from "../../../index";
import { jsonResponse } from "../../_lib/utils";
import { requireCompany } from "../../../_lib/auth";

export async function webhookSubscriptionsUpdateHandler(req: Request, env: Env) {
  try {
    const session = await requireCompany(env, req);
    if (!session?.companyId)
      return jsonResponse({ success: false, error: "Unauthorized" }, 401);

    const body = await req.json();
    if (!body?.id)
      return jsonResponse({ success: false, error: "Missing id" }, 400);

    const key = `webhook:subscription:${session.companyId}:${body.id}`;
    const existing = await env.KV.get(key, "json");
    if (!existing)
      return jsonResponse({ success: false, error: "Not found" }, 404);

    const updated = {
      ...existing,
      ...body,
      updatedAt: new Date().toISOString(),
    };

    await env.KV.put(key, JSON.stringify(updated));
    return jsonResponse({ success: true });
  } catch (e: any) {
    return jsonResponse(
      { success: false, error: e?.message || "Server error" },
      500
    );
  }
}
