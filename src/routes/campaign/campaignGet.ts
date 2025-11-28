// File: src/routes/campaign/campaignGet.ts
import { Env } from "../index";
import { jsonResponse } from "../_lib/utils";
import { requireCompany } from "../../_lib/auth";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function fixImageUrl(env: Env, val?: string | null): string | null {
  if (!val || typeof val !== "string") return null;
  if (val.startsWith("http://") || val.startsWith("https://")) return val;

  const base =
    env.WORKER_URL ||
    env.CF_PAGES_URL ||
    "http://localhost:8787";

  const cleaned = val
    .replace(/^\/r2\//, "")
    .replace(/^r2\//, "")
    .replace(/^\/+/, "");

  return `${base}/r2/${cleaned}`;
}

export async function campaignGetHandler(
  req: Request,
  env: Env
): Promise<Response> {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (req.method !== "GET") {
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

    // Extract ID from URL: /campaign/<id>
    const id = req.url.split("/campaign/")[1];
    if (!id) {
      return jsonResponse(
        { success: false, error: "Missing campaign ID" },
        400
      );
    }

    const raw = await env.KV.get(kvKey, { type: "json" });
    const list = (raw as any[]) || [];

    const campaign = list.find((c) => c.id === id);
    if (!campaign) {
      return jsonResponse(
        { success: false, error: "Campaign not found" },
        404
      );
    }

    const cleaned = {
      ...campaign,
      bannerImage: fixImageUrl(env, campaign.bannerImage),
      products: Array.isArray(campaign.products)
        ? campaign.products.map((p: any) => ({
            ...p,
            img: fixImageUrl(env, p.img),
          }))
        : [],
    };

    return new Response(JSON.stringify(cleaned), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...CORS_HEADERS,
      },
    });
  } catch (err: any) {
    console.error("❌ campaignGetHandler error:", err);
    return jsonResponse(
      { success: false, error: "Failed to load campaign" },
      500
    );
  }
}
