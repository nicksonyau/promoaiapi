import { jsonResponse } from "../../_lib/utils";
import { auth } from "../../_lib/auth";
import type { Env } from "../../index";

type BillingEvent = {
  id: string;
  ts: string;
  type: "activate" | "checkout_created" | "plan_changed" | string;
  plan?: string;
  interval?: string;
  refId?: string | null;
  note?: string;
};

export async function subscriptionBillingListHandler(req: Request, env: Env) {
  const traceId = crypto.randomUUID();

  try {
    console.log(`[subscription/billing/list] start trace=${traceId}`);

    if (req.method !== "GET") {
      return jsonResponse({ success: false, error: "Method not allowed" }, 405, req);
    }

    const session = await auth(env, req);
    if (!session?.companyId) {
      return jsonResponse({ success: false, error: "Unauthorized" }, 401, req);
    }

    const companyId = String(session.companyId);
    const key = `billinglog:${companyId}`;

    const events = (await env.KV.get(key, "json")) as BillingEvent[] | null;
    console.log(` =====================billing list start delete`);
  
    //await env.KV.delete(`subscription:${session.companyId}`);
    //await env.KV.delete(`billinglog:${session.companyId}`);

    return jsonResponse(
      { success: true, events: Array.isArray(events) ? events : [] },
      200,
      req
    );
  } catch (e: any) {
    console.error(`[subscription/billing/list] error trace=${traceId}`, e);
    return jsonResponse(
      { success: false, error: e?.message || "Internal error" },
      500,
      req
    );
  }
}
