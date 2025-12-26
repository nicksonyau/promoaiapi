import { Env } from "../../../index";
import { jsonResponse } from "../../_lib/utils";
import { requireCompany } from "../../../_lib/auth";

export async function webhookSubscriptionsDeleteHandler(
  req: Request,
  env: Env,
  id: string
) {
  try {
    const session = await requireCompany(env, req);
    if (!session?.companyId) {
      return jsonResponse({ success: false, error: "Unauthorized" }, 401);
    }

    const subId = String(id || "").trim();
    if (!subId) {
      return jsonResponse({ success: false, error: "Missing id" }, 400);
    }

    const key = `webhook:subscription:${session.companyId}:${subId}`;
    const indexKey = `webhook:subscription-index:${session.companyId}`;

    await env.KV.delete(key);

    const index = ((await env.KV.get(indexKey, "json")) as string[]) || [];
    if (Array.isArray(index) && index.length) {
      await env.KV.put(indexKey, JSON.stringify(index.filter((x) => x !== subId)));
    }

    return jsonResponse({ success: true });
  } catch (e: any) {
    return jsonResponse({ success: false, error: e?.message || "Server error" }, 500);
  }
}
