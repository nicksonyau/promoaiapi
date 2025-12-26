import { Env } from "../../../index";
import { jsonResponse } from "../../_lib/utils";
import { requireCompany } from "../../../_lib/auth";

export async function webhookEventsGetHandler(req: Request, env: Env, eventId: string) {
  try {
    const session = await requireCompany(env, req);
    if (!session?.companyId) return jsonResponse({ success: false, error: "Unauthorized" }, 401);

    const key = `webhook:event:${session.companyId}:${eventId}`;
    const ev = (await env.KV.get(key, "json").catch(() => null)) as any;
    if (!ev) return jsonResponse({ success: false, error: "Not found" }, 404);

    return jsonResponse({ success: true, data: ev });
  } catch (e: any) {
    return jsonResponse({ success: false, error: e?.message || "Server error" }, 500);
  }
}
