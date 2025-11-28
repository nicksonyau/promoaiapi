// src/routes/voucher/voucherDelete.ts
import { jsonResponse } from "../../_lib/utils";
import { auth } from "../../_lib/auth";

export async function voucherDeleteHandler(req: Request, env: any): Promise<Response> {
  try {
    if (req.method !== "DELETE") {
      return jsonResponse({ success: false, error: "Method not allowed" }, 405);
    }

    const session = await auth(env, req);
    if (!session || !session.companyId) {
      return jsonResponse({ success: false, error: "Unauthorized" }, 401);
    }

    const companyId = session.companyId;

    // Extract promoId from URL
    const promoId = req.url.split("/voucher/delete/")[1];
    if (!promoId)
      return jsonResponse({ success: false, error: "promoId required" }, 400);

    // Check exist
    const raw = await env.KV.get(`voucher:${promoId}`, { type: "json" });
    if (!raw)
      return jsonResponse({ success: false, error: "Voucher not found" }, 404);

    // Delete main record
    await env.KV.delete(`voucher:${promoId}`);

    // Remove from company index
    const idxKey = `voucher:index:company:${companyId}`;
    const list: string[] = (await env.KV.get(idxKey, { type: "json" })) || [];
    const updated = list.filter((id) => id !== promoId);
    await env.KV.put(idxKey, JSON.stringify(updated));

    return jsonResponse({ success: true });

  } catch (err: any) {
    console.error("voucherDelete error:", err);
    return jsonResponse(
      { success: false, error: "Failed to delete voucher", detail: String(err) },
      500
    );
  }
}
