import { jsonResponse } from "../../_lib/utils";
import { auth } from "../../_lib/auth";
import type { Env } from "../../index";

/**
 * Canonical plan definitions
 * ❗ Backend is source of truth
 */
const PLAN_DEFINITION: Record<string, any> = {
  free: {
    interval: "monthly",
    messageLimitPerDay: 10,
    campaignLimitPerMonth: 3,
    aiReplies: 50,
    storageMb: 100,
  },

  // future-ready
  starter: {
    interval: "monthly",
    messageLimitPerDay: 50,
    campaignLimitPerMonth: 10,
    aiReplies: 300,
    storageMb: 5120,
  },
};

export async function subscriptionActivateHandler(req: Request, env: Env) {
  const traceId = crypto.randomUUID();

  try {
    console.log(`[subscription/activate] start trace=${traceId}`);

    // METHOD GUARD
    if (req.method !== "POST") {
      console.warn(`[subscription/activate] invalid method trace=${traceId}`);
      return jsonResponse({ success: false, error: "Method not allowed" }, 405);
    }

    // 🔐 AUTH
    const session = await auth(env, req);
    console.log(`[subscription/activate] auth trace=${traceId}`, {
      hasSession: !!session,
      companyId: session?.companyId ?? null,
    });

    if (!session?.companyId) {
      return jsonResponse({ success: false, error: "Unauthorized" }, 401);
    }

    // 📥 INPUT
    const body = await req.json().catch(() => null);
    if (!body?.plan) {
      console.warn(`[subscription/activate] missing plan trace=${traceId}`);
      return jsonResponse(
        { success: false, error: "Plan is required" },
        400
      );
    }

    const plan = String(body.plan).toLowerCase();
    const planDef = PLAN_DEFINITION[plan];

    if (!planDef) {
      console.warn(`[subscription/activate] invalid plan trace=${traceId}`, {
        plan,
      });
      return jsonResponse(
        { success: false, error: "Invalid plan" },
        400
      );
    }

    const companyId = session.companyId;
    const key = `subscription:${companyId}`;

    // 🔍 CHECK EXISTING SUBSCRIPTION
    const existing = await env.KV.get(key, "json");

    if (existing) {
      // ✅ Free → Free is idempotent
      if (existing.plan === "free" && plan === "free") {
        console.log(
          `[subscription/activate] free already active trace=${traceId}`,
          { companyId }
        );

        return jsonResponse(
          {
            success: true,
            subscription: existing,
            alreadyActive: true,
          },
          200
        );
      }

      // 🚫 Any other case is a conflict
      console.warn(
        `[subscription/activate] conflict trace=${traceId}`,
        {
          existingPlan: existing.plan,
          requestedPlan: plan,
        }
      );

      return jsonResponse(
        { success: false, error: "Subscription already exists" },
        409
      );
    }

    // 🧮 DATES
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1); // monthly only for now

    // 📦 SUBSCRIPTION OBJECT
    const subscription = {
      companyId,
      plan,
      interval: planDef.interval,
      status: "active",

      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),

      limits: {
        messageLimitPerDay: planDef.messageLimitPerDay,
        campaignLimitPerMonth: planDef.campaignLimitPerMonth,
        aiReplies: planDef.aiReplies,
        storageMb: planDef.storageMb,
      },

      source: "manual",
      createdAt: new Date().toISOString(),
    };

    // 💾 STORE
    await env.KV.put(key, JSON.stringify(subscription));

    console.log(
      `[subscription/activate] activated trace=${traceId}`,
      subscription
    );

    return jsonResponse(
      { success: true, subscription },
      200
    );
  } catch (e: any) {
    console.error(
      `[subscription/activate] error trace=${traceId}`,
      e
    );

    return jsonResponse(
      { success: false, error: e?.message || "Internal error" },
      500
    );
  }
}
