import { jsonResponse } from "../../_lib/utils";
import { auth } from "../../_lib/auth";
import type { Env } from "../../index";

function requireEnv(env: any, key: string) {
  const v = env?.[key];
  if (!v) throw new Error(`Missing env.${key}`);
  return String(v);
}

async function stripeGet(url: string, secretKey: string) {
  const res = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  const data = await res.json().catch(() => null);
  return { res, data };
}

export async function subscriptionInvoicesHandler(req: Request, env: Env) {
  const traceId = crypto.randomUUID();

  try {
    console.log(`[subscription/invoices] start trace=${traceId}`);

    if (req.method !== "GET") {
      return jsonResponse({ success: false, error: "Method not allowed" }, 405, req);
    }

    const session = await auth(env, req);
    if (!session?.companyId) {
      return jsonResponse({ success: false, error: "Unauthorized" }, 401, req);
    }

    const companyId = String(session.companyId);
    const subKey = `subscription:${companyId}`;
    const sub = await env.KV.get(subKey, "json");

    const customerId = sub?.stripe?.customerId;
    if (!customerId) {
      // Free plan or not yet paid
      return jsonResponse({ success: true, invoices: [] }, 200, req);
    }

    const stripeKey = requireEnv(env, "STRIPE_SECRET_KEY");
    const url = new URL("https://api.stripe.com/v1/invoices");
    url.searchParams.set("customer", String(customerId));
    url.searchParams.set("limit", "10");

    const { res, data } = await stripeGet(url.toString(), stripeKey);

    if (!res.ok) {
      return jsonResponse(
        { success: false, error: data?.error?.message || "Failed to fetch invoices" },
        400,
        req
      );
    }

    const list = Array.isArray(data?.data) ? data.data : [];
    const invoices = list.map((inv: any) => ({
      id: inv?.id || null,
      number: inv?.number || inv?.id || "",
      status: inv?.status || "",
      created: typeof inv?.created === "number" ? new Date(inv.created * 1000).toISOString() : null,
      currency: inv?.currency || "",
      amountPaid: typeof inv?.amount_paid === "number" ? inv.amount_paid : 0,
      hostedInvoiceUrl: inv?.hosted_invoice_url || null,
      invoicePdf: inv?.invoice_pdf || null,
    }));

    return jsonResponse({ success: true, invoices }, 200, req);
  } catch (e: any) {
    console.error(`[subscription/invoices] error trace=${traceId}`, e);
    return jsonResponse({ success: false, error: e?.message || "Internal error" }, 500, req);
  }
}
