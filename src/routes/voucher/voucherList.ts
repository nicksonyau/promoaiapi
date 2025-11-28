// src/routes/voucher/voucherList.ts
import { jsonResponse } from "../../_lib/utils";
import { auth } from "../../_lib/auth";
import { Voucher, computeVoucherStatus } from "../../_lib/voucherUtils";

export async function voucherListHandler(req: Request, env: any): Promise<Response> {
  try {
    // -----------------------------
    // METHOD CHECK
    // -----------------------------
    if (req.method !== "GET") {
      return jsonResponse({ success: false, error: "Method not allowed" }, 405);
    }

    // -----------------------------
    // AUTH → GET companyId
    // -----------------------------
    const session = await auth(env, req);

    if (!session || !session.companyId) {
      return jsonResponse({ success: false, error: "Unauthorized" }, 401);
    }

    const companyId = session.companyId;

    // -----------------------------
    // LOAD INDEX: voucher:index:company:<companyId>
    // -----------------------------
    const idxKey = `voucher:index:company:${companyId}`;
    const promoIds: string[] = (await env.KV.get(idxKey, { type: "json" })) || [];

    const vouchers: Voucher[] = [];

    // -----------------------------
    // LOAD EACH VOUCHER
    // -----------------------------
    for (const promoId of promoIds) {
      const raw = await env.KV.get(`voucher:${promoId}`, { type: "json" });
      if (!raw) continue;

      const v = raw as Voucher;

      // Compute dynamic status
      v.status = computeVoucherStatus(v);

      vouchers.push(v);
    }

    // -----------------------------
    // SUCCESS RESPONSE
    // -----------------------------
    return jsonResponse({ success: true, vouchers }, 200);
  } catch (err: any) {
    console.error("voucherList error:", err);
    return jsonResponse(
      { success: false, error: "Failed to load vouchers", detail: String(err) },
      500
    );
  }
}
