// src/routes/voucher/voucherRedeem.ts
import { VoucherClaim, nowIso } from "../../_lib/voucherUtils";

function jsonResponse(obj: any, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function voucherRedeemHandler(req: Request, env: any): Promise<Response> {
  try {
    if (req.method !== "POST") {
      return jsonResponse({ success: false, error: "Method not allowed" }, 405);
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return jsonResponse({ success: false, error: "Invalid JSON" }, 400);
    }

    const promoId = String(body.promoId || "").trim();
    const claimId = String(body.claimId || "").trim();

    if (!promoId || !claimId) {
      return jsonResponse({ success: false, error: "promoId & claimId required" }, 400);
    }

    const claimsKey = `voucher:claims:${promoId}`;
    const claims: VoucherClaim[] = (await env.KV.get(claimsKey, { type: "json" })) || [];

    const idx = claims.findIndex((c) => c.id === claimId);
    if (idx === -1) {
      return jsonResponse({ success: false, error: "Claim not found" }, 404);
    }

    const claim = claims[idx];
    if (claim.redeemedAt) {
      return jsonResponse({ success: false, error: "Already redeemed" }, 400);
    }

    claim.redeemedAt = nowIso();
    claims[idx] = claim;

    await env.KV.put(claimsKey, JSON.stringify(claims));

    return jsonResponse({ success: true, claim });
  } catch (err: any) {
    console.error("voucherRedeem error:", err);
    return jsonResponse(
      { success: false, error: "Failed to redeem voucher", message: String(err?.message || err) },
      500
    );
  }
}
