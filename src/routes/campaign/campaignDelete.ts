// File: src/routes/campaign/campaignDelete.ts
import { Env } from "../index";
import { jsonResponse } from "../_lib/utils";
import { requireCompany } from "../../_lib/auth";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function campaignDeleteHandler(
  req: Request,
  env: Env
): Promise<Response> {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (req.method !== "DELETE") {
      return jsonResponse(
        { success: false, error: "Method not allowed" },
        405
      );
    }

    const auth = await requireCompany(env, req);
    if (!auth)
      return jsonResponse({ success: false, error: "Unauthorized" }, 401);

    const { companyId } = auth;
    const kvKey = `campaigns:${companyId}`;

    // Expect URL like /campaign/delete/<id>
    const parts = req.url.split("/campaign/delete/");
    const id = parts[1];
    if (!id) {
      return jsonResponse(
        { success: false, error: "Missing campaign ID" },
        400
      );
    }

    const raw = await env.KV.get(kvKey, { type: "json" });
    const list = (raw as any[]) || [];

    const idx = list.findIndex((c) => c.id === id);
    if (idx === -1) {
      return jsonResponse(
        { success: false, error: "Campaign not found" },
        404
      );
    }

    list.splice(idx, 1);
    await env.KV.put(kvKey, JSON.stringify(list));

    return new Response(
      JSON.stringify({ success: true, id }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...CORS_HEADERS,
        },
      }
    );
  } catch (err: any) {
    console.error("❌ campaignDeleteHandler error:", err);
    return jsonResponse(
      { success: false, error: "Failed to delete campaign" },
      500
    );
  }
}
