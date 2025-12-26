import { Env } from "../../../index";
import { jsonResponse } from "../../_lib/utils";
import { requireCompany } from "../../../_lib/auth";

function sanitize(r: any) {
  return {
    ...r,
    signing: {
      mode: r.signing?.mode || "none",
      header: r.signing?.header,
      secret: undefined, // NEVER expose
    },
  };
}

export async function webhookSubscriptionsListHandler(req: Request, env: Env) {
  try {
    if (req.method !== "GET")
      return jsonResponse({ success: false, error: "Method not allowed" }, 405);

    const session = await requireCompany(env, req);
    if (!session?.companyId)
      return jsonResponse({ success: false, error: "Unauthorized" }, 401);

    const indexKey = `webhook:subscription-index:${session.companyId}`;
    const prefix = `webhook:subscription:${session.companyId}:`;

    const ids = ((await env.KV.get(indexKey, "json")) as string[]) || [];
    const items = [];

    for (const id of ids) {
      const rec = await env.KV.get(`${prefix}${id}`, "json");
      if (rec) items.push(sanitize(rec));
    }

    return new Response(
      JSON.stringify({ success: true, data: { items } }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (e: any) {
    return jsonResponse(
      { success: false, error: e?.message || "Server error" },
      500
    );
  }
}
