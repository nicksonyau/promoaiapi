// File: src/routes/campaign/campaignUpdate.ts
import { Env } from "../index";
import {
  base64ToArrayBuffer,
  uploadToR2,
  r2UrlForKey,
  jsonResponse,
} from "../_lib/utils";
import { requireCompany } from "../../_lib/auth";

interface ProductInput {
  name: string;
  orgPrice: string;
  promoPrice: string;
  img?: string;
}

interface Campaign {
  id: string;
  companyId: string;
  type: string;
  title: string;
  description: string;
  bannerImage: string;
  products: ProductInput[];
  cta: { whatsapp: string; orderUrl: string };
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt?: string;
  r2Keys: string[];
}

// ------------------------------
// CORS OPTIONS
// ------------------------------
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "PUT, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

// ------------------------------
// Helper: Upload Image to R2
// ------------------------------
async function uploadImage(env: Env, base64: string, key: string) {
  if (!env.MY_R2_BUCKET) return null;
  if (!base64.startsWith("data:")) return null;

  const match = base64.match(/^data:image\/([a-zA-Z0-9+]+);base64,/);
  const ext = match ? match[1] : "png";

  const objectKey = `campaigns/${key}_${Date.now()}.${ext}`;
  const { buffer, contentType } = base64ToArrayBuffer(base64);

  await uploadToR2(env, objectKey, buffer, contentType);

  return { objectKey, url: r2UrlForKey(objectKey) };
}

// ------------------------------
// MAIN UPDATE HANDLER
// ------------------------------
export async function campaignUpdateHandler(req: Request, env: Env) {
  try {
    if (req.method === "OPTIONS") return onRequestOptions();
    if (req.method !== "PUT")
      return jsonResponse({ success: false, error: "Method not allowed" }, 405);

    // --------------------------------------------------
    // AUTHENTICATION
    // --------------------------------------------------
    const auth = await requireCompany(env, req);
    if (!auth) return jsonResponse({ success: false, error: "Unauthorized" }, 401);

    const { companyId } = auth;

    // --------------------------------------------------
    // Extract ID
    // --------------------------------------------------
    const id = req.url.split("/campaign/update/")[1];
    if (!id) return jsonResponse({ success: false, error: "Missing ID" }, 400);

    // --------------------------------------------------
    // Load original (DASHBOARD storage)
    // --------------------------------------------------
    const listKey = `campaigns:${companyId}`;
    const listRaw = await env.KV.get(listKey, { type: "json" });
    const list: Campaign[] = (listRaw as Campaign[]) || [];

    const index = list.findIndex((c) => c.id === id);
    if (index === -1)
      return jsonResponse({ success: false, error: "Campaign not found" }, 404);

    const old = list[index];

    // Parse update body
    const body = await req.json();

    // --------------------------------------------------
    // HANDLE BANNER UPDATE
    // --------------------------------------------------
    let bannerImage = old.bannerImage;
    const r2Keys = [...old.r2Keys];

    if (body.bannerImage && body.bannerImage.startsWith("data:")) {
      const upload = await uploadImage(env, body.bannerImage, `${id}/banner`);
      if (upload) {
        bannerImage = upload.url;
        r2Keys.push(upload.objectKey);
      }
    }

    // --------------------------------------------------
    // HANDLE PRODUCTS
    // --------------------------------------------------
    const updatedProducts: ProductInput[] = [];

    for (let i = 0; i < body.products.length; i++) {
      let img = body.products[i].img;

      if (img && img.startsWith("data:")) {
        const upload = await uploadImage(env, img, `${id}/product-${i}`);
        if (upload) {
          img = upload.url;
          r2Keys.push(upload.objectKey);
        }
      }

      updatedProducts.push({
        name: body.products[i].name,
        orgPrice: body.products[i].orgPrice,
        promoPrice: body.products[i].promoPrice,
        img,
      });
    }

    // --------------------------------------------------
    // MERGE UPDATE
    // --------------------------------------------------
    const updated: Campaign = {
      ...old,
      type: body.type,
      title: body.title,
      description: body.description,
      bannerImage,
      products: updatedProducts,
      cta: body.cta,
      startDate: body.startDate || old.startDate,
      endDate: body.endDate || old.endDate,
      updatedAt: new Date().toISOString(),
      r2Keys,
    };

    // --------------------------------------------------
    // SAVE BACK (DASHBOARD storage)
    // --------------------------------------------------
    list[index] = updated;
    await env.KV.put(listKey, JSON.stringify(list));

    // --------------------------------------------------
    // SAVE TO CHATBOT storage
    // --------------------------------------------------
    // 1) Full record
    await env.KV.put(`campaign:${id}`, JSON.stringify(updated));

    // 2) Ensure ID is in chatbot index
    const idxKey = `campaign:index:company:${companyId}`;
    const idxList: string[] =
      (await env.KV.get(idxKey, { type: "json" })) || [];

    if (!idxList.includes(id)) {
      idxList.push(id);
      await env.KV.put(idxKey, JSON.stringify(idxList));
    }

    return jsonResponse({ success: true, campaign: updated }, 200);
  } catch (err: any) {
    return jsonResponse(
      { success: false, error: "Internal error", details: err.message },
      500
    );
  }
}
