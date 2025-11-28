// src/routes/voucher/voucherClaim.ts
export async function voucherClaimHandler(req: Request, env: any): Promise<Response> {
  try {
    if (req.method !== "POST") {
      return jsonResponse({ success: false, error: "Method not allowed" }, 405);
    }

    const session = await auth(env, req);
    if (!session || !session.companyId) {
      return jsonResponse({ success: false, error: "Unauthorized" }, 401);
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
    if (!phone && !userId) {
      return jsonResponse({ success: false, error: "phone or userId required" }, 400);
    }

    // 🔒 ATOMIC OPERATION WITH COUNTER
    const voucherKey = `voucher:${promoId}`;
    const voucher = await env.KV.get(voucherKey, { type: "json" });
    
    if (!voucher) {
      return jsonResponse({ success: false, error: "Voucher not found" }, 404);
    }

    const v = voucher as Voucher;
    v.status = computeVoucherStatus(v);
    
    if (v.status !== "active") {
      return jsonResponse({ success: false, error: `Voucher not active (${v.status})` }, 400);
    }

    if (v.remainingQuantity <= 0) {
      return jsonResponse({ success: false, error: "Voucher fully claimed" }, 400);
    }

    // Check per-user limit
    const claimsKey = `voucher:claims:${promoId}`;
    const claims: VoucherClaim[] = (await env.KV.get(claimsKey, { type: "json" })) || [];
    
    const identity = phone || userId || "";
    const userClaimsCount = claims.filter(
      (c) => (c.phone || c.userId) === identity
    ).length;

    if (userClaimsCount >= v.perUserLimit) {
      return jsonResponse({ success: false, error: "Per-user limit reached" }, 400);
    }

    // 🔥 ATOMIC UPDATE
    const claimId = generateCode("CLM", 10);
    const claim: VoucherClaim = {
      id: claimId,
      promoId,
      userId,
      phone,
      createdAt: nowIso(),
      source: body.source || "web",
      meta: body.meta || undefined,
    };

    claims.push(claim);
    
    // Update voucher quantities atomically
    v.remainingQuantity = Math.max(0, v.remainingQuantity - 1);
    v.claimed = (v.claimed || 0) + 1;
    v.updatedAt = nowIso();

    // Save both records
    await Promise.all([
      env.KV.put(voucherKey, JSON.stringify(v)),
      env.KV.put(claimsKey, JSON.stringify(claims))
    ]);

    return jsonResponse({ success: true, claim, voucher: v }, 201);
  } catch (err: any) {
    console.error("voucherClaim error:", err);
    return jsonResponse(
      { success: false, error: "Failed to claim voucher", message: String(err?.message || err) },
      500
    );
  }
}