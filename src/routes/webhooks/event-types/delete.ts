import { Env } from "../../../index";
import { jsonResponse } from "../../_lib/utils";
import { requireCompany } from "../../../_lib/auth";

export async function eventTypesDeleteHandler(req: Request, env: Env, id: string) {
  try {
    if (req.method !== "DELETE") {
      return jsonResponse({ success: false, error: "Method not allowed" }, 405);
    }

    const session = await requireCompany(env, req);
    if (!session?.companyId) {
      return jsonResponse({ success: false, error: "Unauthorized" }, 401);
    }

    const key = `webhook:event-type:${session.companyId}:${id}`;
    const existing = await env.KV.get(key);
    if (!existing) {
      return jsonResponse({ success: false, error: "Not found" }, 404);
    }

    await env.KV.delete(key);
    return jsonResponse({ success: true }, 200);
  } catch (e: any) {
    return jsonResponse({ success: false, error: e?.message || "Server error" }, 500);
  }
}
