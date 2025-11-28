// src/routes/voucher/voucherCheck.ts
export async function voucherCheckHandler(req: Request, env: any): Promise<Response> {
  try {
    if (req.method !== "POST") {
      return jsonResponse({ success: false, error: "Method not allowed" }, 405);
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return jsonResponse({ success: false, error: "Invalid JSON" }, 400);
    }

    const promoId = String(body.promoId || "").trim();
    const phone = body.phone ? String(body.phone) : undefined;
    const userId = body.userId ? String(body.userId) : undefined;

    if (!promoId) {
      return jsonResponse({ success: false, error: "promoId required" }, 400);
    }

    const voucher = await env.KV.get(`voucher:${promoId}`, { type: "json" });
    if (!voucher) {
      return jsonResponse({ success: false, error: "Voucher not found" }, 404);
    }

    const v = voucher as Voucher;
    v.status = computeVoucherStatus(v);

    const response: any = {
      promoId,
      title: v.title,
      status: v.status,
      discountType: v.discountType,
      discountValue: v.discountValue,
      remainingQuantity: Math.max(0, v.totalQuantity - (v.claimed || 0)),
      validFrom: v.validFrom,
      validUntil: v.validUntil,
      canClaim: false,
      reason: null
    };

    // Check if can claim
    if (v.status !== "active") {
      response.reason = `Voucher not active (${v.status})`;
    } else if (response.remainingQuantity <= 0) {
      response.reason = "Voucher fully claimed";
    } else if (phone || userId) {
      const claimsKey = `voucher:claims:${promoId}`;
      const claims: VoucherClaim[] = (await env.KV.get(claimsKey, { type: "json" })) || [];
      const identity = phone || userId || "";
      const userClaimsCount = claims.filter(
        (c) => (c.phone || c.userId) === identity
      ).length;

      if (userClaimsCount >= v.perUserLimit) {
        response.reason = "Per-user limit reached";
      } else {
        response.canClaim = true;
      }
    } else {
      response.canClaim = true;
    }

    return jsonResponse({ success: true, ...response });
  } catch (err: any) {
    console.error("voucherCheck error:", err);
    return jsonResponse(
      { success: false, error: "Failed to check voucher" },
      500
    );
  }
}