import { jsonResponse } from "../../_lib/utils";
import { auth } from "../../_lib/auth";
import type { Env } from "../../index";

export async function subscriptionGetHandler(req: Request, env: Env) {
  const traceId = crypto.randomUUID();

  try {
    if (req.method !== "GET") {
      return jsonResponse({ success: false, error: "Method not allowed" }, 405);
    }

    console.log(`[subscription/get] start trace=${traceId}`);

    // 🔐 AUTH
    const session = await auth(env, req);
    console.log(`[subscription/get] auth trace=${traceId}`, {
      hasSession: !!session,
      companyId: session?.companyId ?? null,
    });

    if (!session?.companyId) {
      return jsonResponse({ success: false, error: "Unauthorized" }, 401);
    }

    const key = `subscription:${session.companyId}`;

    // ✅ READ ONLY
    const existing = await env.KV.get(key, "json");

    if (!existing) {
      console.log(`[subscription/get] no subscription trace=${traceId}`);

      return jsonResponse(
        {
          success: true,
          subscription: null,
          requiresActivation: true,
        },
        200
      );
    }

    console.log(`[subscription/get] found subscription trace=${traceId}`, {
      plan: existing.plan,
      status: existing.status,
      endDate: existing.endDate,
    });

    return jsonResponse(
      {
        success: true,
        subscription: existing,
        requiresActivation: false,
      },
      200
    );
  } catch (e: any) {
    console.error(`[subscription/get] error trace=${traceId}`, e);

    return jsonResponse(
      { success: false, error: e?.message || "Internal error" },
      500
    );
  }
}
