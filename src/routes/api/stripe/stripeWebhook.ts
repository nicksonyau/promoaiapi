import { jsonResponse } from "../../../_lib/utils";
import type { Env } from "../../../index";

function requireEnv(env: any, key: string) {
  const v = env?.[key];
  if (!v) throw new Error(`Missing env.${key}`);
  return String(v);
}

// Stripe signature header: "t=...,v1=...,v1=..."
function parseStripeSig(sigHeader: string) {
  const out: { t?: string; v1: string[] } = { v1: [] };
  const parts = sigHeader.split(",").map((s) => s.trim());
  for (const p of parts) {
    const [k, v] = p.split("=");
    if (k === "t") out.t = v;
    if (k === "v1" && v) out.v1.push(v);
  }
  return out;
}

async function hmacSHA256Hex(secret: string, message: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  const bytes = new Uint8Array(sig);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function stripeGet(url: string, secretKey: string) {
  const res = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  const data = await res.json().catch(() => null);
  return { res, data };
}

function normalizePlan(p: any) {
  return String(p || "").trim().toLowerCase();
}
function normalizeInterval(i: any) {
  const v = String(i || "").trim().toLowerCase();
  return v === "yearly" ? "yearly" : "monthly";
}

// idempotency: avoid double-processing retries
async function dedupeEvent(env: Env, eventId: string) {
  const k = `stripeEvent:${eventId}`;
  const hit = await env.KV.get(k);
  if (hit) return true;
  await env.KV.put(k, "1", { expirationTtl: 60 * 60 * 48 });
  return false;
}

export async function stripeWebhookHandler(req: Request, env: Env) {
  const traceId = crypto.randomUUID();

  try {
    console.log(`[stripe/webhook] start trace=${traceId}`);

    if (req.method !== "POST") {
      return jsonResponse({ success: false, error: "Method not allowed" }, 405, req);
    }

    const secret = requireEnv(env, "STRIPE_WEBHOOK_SECRET");
    const sigHeader = req.headers.get("stripe-signature") || "";
    if (!sigHeader) {
      return jsonResponse({ success: false, error: "Missing stripe-signature" }, 400, req);
    }

    // RAW body is required for Stripe signature verification
    const payload = await req.text();
    const parsed = parseStripeSig(sigHeader);

    const t = parsed.t;
    if (!t || parsed.v1.length === 0) {
      return jsonResponse({ success: false, error: "Invalid signature header" }, 400, req);
    }

    // 5-minute replay protection
    const nowSec = Math.floor(Date.now() / 1000);
    const tSec = Number(t);
    if (!Number.isFinite(tSec) || Math.abs(nowSec - tSec) > 300) {
      return jsonResponse({ success: false, error: "Stale webhook" }, 400, req);
    }

    const signedPayload = `${t}.${payload}`;
    const expected = await hmacSHA256Hex(secret, signedPayload);

    const match = parsed.v1.some((v) => v === expected);
    if (!match) {
      console.warn(`[stripe/webhook] signature mismatch trace=${traceId}`);
      return jsonResponse({ success: false, error: "Invalid signature" }, 400, req);
    }

    const event = JSON.parse(payload);

    if (!event?.id) return jsonResponse({ success: true }, 200, req);
    if (await dedupeEvent(env, String(event.id))) {
      console.log(`[stripe/webhook] deduped trace=${traceId}`, { id: event.id, type: event?.type });
      return jsonResponse({ success: true }, 200, req);
    }

    console.log(`[stripe/webhook] event trace=${traceId}`, { type: event?.type, id: event?.id });

    const stripeKey = requireEnv(env, "STRIPE_SECRET_KEY");

    // 1) Checkout completed → activate subscription in KV
    if (event?.type === "checkout.session.completed") {
      const session = event?.data?.object;

      const companyId = session?.metadata?.companyId;
      const plan = normalizePlan(session?.metadata?.plan);
      const interval = normalizeInterval(session?.metadata?.interval);

      const stripeSubId = session?.subscription;
      const stripeCustomerId = session?.customer;

      if (!companyId || !plan) {
        console.warn(`[stripe/webhook] missing metadata trace=${traceId}`);
        return jsonResponse({ success: true }, 200, req);
      }

      let status = "active";
      let startDateIso: string | null = null;
      let endDateIso: string | null = null;

      // fetch subscription to get current_period_start/end
      if (stripeSubId) {
        const { res, data } = await stripeGet(
          `https://api.stripe.com/v1/subscriptions/${stripeSubId}`,
          stripeKey
        );

        if (res.ok && data) {
          status = String(data?.status || "active");
          const cps = data?.current_period_start;
          const cpe = data?.current_period_end;

          if (typeof cps === "number") startDateIso = new Date(cps * 1000).toISOString();
          if (typeof cpe === "number") endDateIso = new Date(cpe * 1000).toISOString();
        } else {
          console.warn(`[stripe/webhook] failed to fetch subscription trace=${traceId}`, data);
        }
      }

      const key = `subscription:${companyId}`;

      // Minimal shape + Stripe ids (your UI can read this)
      const subscription = {
        companyId,
        plan,
        interval,
        status,
        startDate: startDateIso || new Date().toISOString(),
        endDate: endDateIso,
        stripe: {
          checkoutSessionId: session?.id || null,
          subscriptionId: stripeSubId || null,
          customerId: stripeCustomerId || null,
        },
        source: "stripe",
        updatedAt: new Date().toISOString(),
      };

      await env.KV.put(key, JSON.stringify(subscription));
      console.log(`[stripe/webhook] stored subscription trace=${traceId}`, subscription);

      return jsonResponse({ success: true }, 200, req);
    }

    // 2) Keep KV synced when Stripe changes the subscription later
    if (
      event?.type === "customer.subscription.updated" ||
      event?.type === "customer.subscription.deleted"
    ) {
      const sub = event?.data?.object;
      const meta = sub?.metadata || {};

      const companyId = meta?.companyId;
      if (!companyId) return jsonResponse({ success: true }, 200, req);

      const plan = normalizePlan(meta?.plan);
      const interval = normalizeInterval(meta?.interval);

      const status = String(
        sub?.status || (event.type.endsWith("deleted") ? "canceled" : "active")
      );

      const cps = sub?.current_period_start;
      const cpe = sub?.current_period_end;

      const key = `subscription:${companyId}`;
      const existing = await env.KV.get(key, "json");

      const merged = {
        ...(existing && typeof existing === "object" ? existing : {}),
        companyId,
        plan: plan || existing?.plan || "starter",
        interval: interval || existing?.interval || "monthly",
        status,
        startDate:
          typeof cps === "number"
            ? new Date(cps * 1000).toISOString()
            : existing?.startDate || new Date().toISOString(),
        endDate: typeof cpe === "number" ? new Date(cpe * 1000).toISOString() : existing?.endDate || null,
        stripe: {
          ...(existing?.stripe || {}),
          subscriptionId: sub?.id || existing?.stripe?.subscriptionId || null,
          customerId: sub?.customer || existing?.stripe?.customerId || null,
        },
        source: "stripe",
        updatedAt: new Date().toISOString(),
      };

      await env.KV.put(key, JSON.stringify(merged));
      console.log(`[stripe/webhook] synced trace=${traceId}`, { companyId, status });

      return jsonResponse({ success: true }, 200, req);
    }

    return jsonResponse({ success: true }, 200, req);
  } catch (e: any) {
    console.error(`[stripe/webhook] error trace=${traceId}`, e);
    return jsonResponse({ success: false, error: e?.message || "Internal error" }, 500, req);
  }
}
