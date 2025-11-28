// File: src/routes/campaignCreate.ts
import { Env } from "../index";
import {
  base64ToArrayBuffer,
  uploadToR2,
  r2UrlForKey,
  jsonResponse,
} from "../_lib/utils";
import { auth } from "../../_lib/auth";

// ------------------------------
// Types
// ------------------------------
interface ProductInput {
  name: string;
  orgPrice: string;
  promoPrice: string;
  img?: string;
}

interface CampaignInput {
  type: string;
  title: string;
  description?: string;
  bannerImage?: string;
  products?: ProductInput[];
  cta?: {
    whatsapp?: string;
    orderUrl?: string;
  };
  startDate?: string;
  endDate?: string;
}

interface Campaign extends CampaignInput {
  id: string;
  companyId: string;
  r2Keys: string[];
  createdAt: string;
  updatedAt?: string;
}

// ------------------------------
// OPTIONS (CORS)
// ------------------------------
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

// ------------------------------
// Upload base64 → R2
// ------------------------------
async function uploadImage(env: Env, base64: string, key: string) {
  if (!base64 || !base64.startsWith("data:")) return null;
  if (!env.MY_R2_BUCKET) return null;

  const m = base64.match(/^data:image\/([a-zA-Z0-9+]+);base64,/);
  const ext = m ? m[1] : "png";

  const objectKey = `campaigns/${key}_${Date.now()}.${ext}`;
  const { buffer, contentType } = base64ToArrayBuffer(base64);

  await uploadToR2(env, objectKey, buffer, contentType);

  return { objectKey, url: r2UrlForKey(objectKey) };
}

// ------------------------------
// Validation
// ------------------------------
function validateCampaignInput(body: any) {
  if (!body.title || !body.title.trim())
    return { valid: false, error: "Missing campaign title" };

  if (!body.type)
    return { valid: false, error: "Missing campaign type" };

  const allowedTypes = [
    "flash-sale",
    "seasonal",
    "bundle",
    "clearance",
    "new-arrival",
  ];

  if (!allowedTypes.includes(body.type))
    return {
      valid: false,
      error: `Invalid type. Must be: ${allowedTypes.join(", ")}`,
    };

  return { valid: true };
}

// ------------------------------
// CREATE CAMPAIGN
// ------------------------------
export async function campaignCreateHandler(req: Request, env: Env) {
  try {
    if (req.method === "OPTIONS") return onRequestOptions();
    if (req.method !== "POST")
      return jsonResponse({ success: false, error: "Method not allowed" }, 405);

    // ------------------------------
    // AUTH REQUIRED
    // ------------------------------
    const session = await auth(env, req);
    if (!session || !session.companyId)
      return jsonResponse({ success: false, error: "Unauthorised" }, 401);

    const companyId = session.companyId;

    // ------------------------------
    // Parse JSON
    // ------------------------------
    let body: CampaignInput;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ success: false, error: "Invalid JSON" }, 400);
    }

    // ------------------------------
    // Validate
    // ------------------------------
    const validation = validateCampaignInput(body);
    if (!validation.valid)
      return jsonResponse({ success: false, error: validation.error }, 400);

    // ------------------------------
    // Create Campaign ID
    // ------------------------------
    const id =
      "campaign_" +
      companyId +
      "_" +
      Date.now() +
      "_" +
      Math.random().toString(36).slice(2, 8);

    const r2Keys: string[] = [];

    // ------------------------------
    // Banner Upload
    // ------------------------------
    let bannerImage = body.bannerImage || "";
    if (bannerImage.startsWith("data:")) {
      const upload = await uploadImage(env, bannerImage, `${id}/banner`);
      if (upload) {
        bannerImage = upload.url;
        r2Keys.push(upload.objectKey);
      }
    }

    // ------------------------------
    // Products
    // ------------------------------
    const products = Array.isArray(body.products) ? body.products : [];
    const finalProducts: ProductInput[] = [];

    for (let i = 0; i < products.length; i++) {
      let img = products[i].img || "";

      if (img.startsWith("data:")) {
        const upload = await uploadImage(env, img, `${id}/product-${i}`);
        if (upload) {
          img = upload.url;
          r2Keys.push(upload.objectKey);
        }
      }

      finalProducts.push({ ...products[i], img });
    }

    // ------------------------------
    // Build Campaign Record
    // ------------------------------
    const now = new Date().toISOString();

    const newCampaign: Campaign = {
      id,
      companyId,
      type: body.type,
      title: body.title.trim(),
      description: body.description || "",
      bannerImage,
      products: finalProducts,
      cta: {
        whatsapp: body.cta?.whatsapp || "",
        orderUrl: body.cta?.orderUrl || "",
      },
      startDate: body.startDate || now,
      endDate: body.endDate || "",
      r2Keys,
      createdAt: now,
    };

    // ------------------------------
    // OLD STORAGE (Dashboard)
    // ------------------------------
    const kvKey = `campaigns:${companyId}`;
    const existing =
      ((await env.KV.get(kvKey, { type: "json" })) as Campaign[]) || [];
    existing.push(newCampaign);
    await env.KV.put(kvKey, JSON.stringify(existing));

    // ------------------------------
    // NEW STORAGE (Chatbot)
    // ------------------------------
    // 1) Single record
    await env.KV.put(`campaign:${id}`, JSON.stringify(newCampaign));

    // 2) Index of campaign IDs
    const indexKey = `campaign:index:company:${companyId}`;
    const indexList: string[] =
      (await env.KV.get(indexKey, { type: "json" })) || [];

    indexList.push(id);

    await env.KV.put(indexKey, JSON.stringify(indexList));

    // ------------------------------
    // Success
    // ------------------------------
    return jsonResponse(
      { success: true, id, campaign: newCampaign },
      201
    );
  } catch (err: any) {
    return jsonResponse(
      { success: false, error: "Internal error", details: err.message },
      500
    );
  }
}
