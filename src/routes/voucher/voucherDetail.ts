// src/routes/voucher/voucherDetail.ts

import { jsonResponse } from "../../_lib/utils";
import { Voucher, computeVoucherStatus } from "../../_lib/voucherUtils";
import { auth } from "../../_lib/auth";

export async function voucherDetailHandler(req: Request, env: any): Promise<Response> {
  try {
    if (req.method !== "GET") {
      return jsonResponse({ success: false, error: "Method not allowed" }, 405);
    }

    // -----------------------------
    // AUTH REQUIRED
    // -----------------------------
    const session = await auth(env, req);
    if (!session || !session.companyId) {
      return jsonResponse({ success: false, error: "Unauthorized" }, 401);
    }

    const url = new URL(req.url);
    const promoId = url.searchParams.get("promoId");

    if (!promoId) {
      return jsonResponse({ success: false, error: "promoId required" }, 400);
    }

    // -----------------------------
    // Fetch voucher
    // -----------------------------
    const raw = await env.KV.get(`voucher:${promoId}`, { type: "json" });

    if (!raw) {
      return jsonResponse({ success: false, error: "Voucher not found" }, 404);
    }

    const voucher = raw as Voucher;

    // Tenant check — prevent cross-company access
    if (voucher.companyId !== session.companyId) {
      return jsonResponse({ success: false, error: "Forbidden" }, 403);
    }

    // Recompute latest status
    voucher.status = computeVoucherStatus(voucher);

    return jsonResponse({ success: true, voucher });
  } catch (err: any) {
    console.error("voucherDetail error:", err);
    return jsonResponse(
      { success: false, error: "Failed to load voucher", detail: String(err) },
      500
    );
  }
}
