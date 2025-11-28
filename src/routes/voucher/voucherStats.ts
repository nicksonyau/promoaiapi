// src/routes/voucher/voucherStats.ts
import { Voucher, VoucherClaim } from "../../_lib/voucherUtils";

function jsonResponse(obj: any, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function voucherStatsHandler(req: Request, env: any): Promise<Response> {
  try {
    if (req.method !== "GET") {
      return jsonResponse({ success: false, error: "Method not allowed" }, 405);
    }

    const url = new URL(req.url);
    const storeId = url.searchParams.get("storeId");
    if (!storeId) {
      return jsonResponse({ success: false, error: "storeId required" }, 400);
    }

    const idxKey = `voucher:index:store:${storeId}`;
    const promoIds: string[] = (await env.KV.get(idxKey, { type: "json" })) || [];

    const stats: any[] = [];

    for (const promoId of promoIds) {
      const vRaw = await env.KV.get(`voucher:${promoId}`, { type: "json" });
      if (!vRaw) continue;
      const voucher = vRaw as Voucher;

      const claimsKey = `voucher:claims:${promoId}`;
      const claims: VoucherClaim[] = (await env.KV.get(claimsKey, { type: "json" })) || [];

      const totalClaims = claims.length;
      const totalRedeemed = claims.filter((c) => !!c.redeemedAt).length;

      stats.push({
        promoId,
        title: voucher.title,
        totalQuantity: voucher.totalQuantity,
        remainingQuantity: voucher.remainingQuantity,
        totalClaims,
        totalRedeemed,
      });
    }

    return jsonResponse({ success: true, stats });
  } catch (err: any) {
    console.error("voucherStats error:", err);
    return jsonResponse(
      { success: false, error: "Failed to compute stats", message: String(err?.message || err) },
      500
    );
  }
}
