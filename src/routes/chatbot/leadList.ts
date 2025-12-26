import { Env } from "../../index";
import { jsonResponse } from "../../_lib/utils";
import { auth } from "../../_lib/auth";

export async function leadList(req: Request, env: Env) {
  try {
    // ----------------------------------
    // METHOD GUARD
    // ----------------------------------
    if (req.method !== "GET") {
      return jsonResponse({ success: false, error: "Method not allowed" }, 405);
    }

    // ----------------------------------
    // AUTH
    // ----------------------------------
    const session = await auth(env, req);
    if (!session?.companyId) {
      return jsonResponse({ success: false, error: "Unauthorised" }, 401);
    }

    const companyId = session.companyId;
    const prefix = `lead:${companyId}:`;

    // ----------------------------------
    // LOAD
    // ----------------------------------
    const keys = await env.LEADS_KV.list({ prefix });
    const leads: any[] = [];

    for (const k of keys.keys) {
      const rec = await env.LEADS_KV.get(k.name, { type: "json" });
      if (!rec) continue;

      // ✅ Extract ID from key: lead:companyId:LEADID
      const id = k.name.replace(prefix, "");

      leads.push({
        id,        // ✅ FIXED: add id
        ...rec
      });
    }

    // ----------------------------------
    // SORT
    // ----------------------------------
    leads.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

    // ----------------------------------
    // RESPONSE
    // ----------------------------------
    return jsonResponse({
      success: true,
      total: leads.length,
      leads
    }, 200);

  } catch (err: any) {
    console.error("[LEAD_LIST]", err);
    return jsonResponse({ success: false, error: err.message }, 500);
  }
}
