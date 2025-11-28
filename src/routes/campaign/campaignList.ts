// File: src/routes/campaign/campaignList.ts
import { Env } from "../index";
import { jsonResponse } from "../_lib/utils";
import { requireCompany } from "../../_lib/auth";

// Types
interface Campaign {
  id: string;
  companyId: string;
  type: string;
  title: string;
  description?: string;
  bannerImage?: string;
  bannerImageUrl?: string;
  products?: any[];
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt?: string;
  r2Keys?: string[];
}

interface CampaignListItem {
  id: string;
  title: string;
  type: string;
  description?: string;
  bannerImage: string | null;
  bannerImageUrl: string | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  productCount: number;
  status: "active" | "expired" | "upcoming";
}

// CORS
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Fix Image URL
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

// Status helper
function getCampaignStatus(
  startDate?: string,
  endDate?: string
): "active" | "expired" | "upcoming" {
  const now = new Date();
  if (endDate && new Date(endDate) < now) return "expired";
  if (startDate && new Date(startDate) > now) return "upcoming";
  return "active";
}

// Handler
export async function campaignListHandler(
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

    // 🔒 Auth + company
    const auth = await requireCompany(env, req);
    if (!auth)
      return jsonResponse({ success: false, error: "Unauthorized" }, 401);

    const { companyId } = auth;
    const kvKey = `campaigns:${companyId}`; // ✅ SAME AS CREATE

    // Query params
    const url = new URL(req.url);
    const type = url.searchParams.get("type");
    const status = url.searchParams.get("status");
    const sortBy = url.searchParams.get("sortBy") || "createdAt";
    const sortOrder = url.searchParams.get("sortOrder") || "desc";
    const limit = parseInt(url.searchParams.get("limit") || "100");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    // Load campaigns
    const raw = await env.KV.get(kvKey, { type: "json" });
    const campaigns: Campaign[] = (raw as Campaign[]) || [];

    // Filter
    let filtered = campaigns;
    if (type) filtered = filtered.filter((c) => c.type === type);
    if (status)
      filtered = filtered.filter(
        (c) => getCampaignStatus(c.startDate, c.endDate) === status
      );

    // Map to list items
    const list: CampaignListItem[] = filtered.map((c) => {
      const bannerImage = fixImageUrl(env, c.bannerImage || c.bannerImageUrl);
      const bannerImageUrl = fixImageUrl(env, c.bannerImageUrl || c.bannerImage);

      return {
        id: c.id,
        title: c.title || "",
        type: c.type || "",
        description: c.description || "",
        bannerImage,
        bannerImageUrl,
        startDate: c.startDate || null,
        endDate: c.endDate || null,
        createdAt: c.createdAt || null,
        updatedAt: c.updatedAt || null,
        productCount: Array.isArray(c.products) ? c.products.length : 0,
        status: getCampaignStatus(c.startDate, c.endDate),
      };
    });

    // Sort
    list.sort((a, b) => {
      let aVal = a[sortBy as keyof CampaignListItem];
      let bVal = b[sortBy as keyof CampaignListItem];

      if (typeof aVal === "string" && sortBy.includes("Date")) {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal as string).getTime();
      }

      if (sortOrder === "desc") return (aVal as any) < (bVal as any) ? 1 : -1;
      return (aVal as any) > (bVal as any) ? 1 : -1;
    });

    // Pagination
    const total = list.length;
    const paginated = list.slice(offset, offset + limit);

    return new Response(
      JSON.stringify({
        success: true,
        campaigns: paginated,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
        filters: {
          type: type || null,
          status: status || null,
        },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...CORS_HEADERS,
        },
      }
    );
  } catch (err: any) {
    console.error("❌ campaignListHandler error:", err);
    return jsonResponse(
      { success: false, error: "Internal server error" },
      500
    );
  }
}
