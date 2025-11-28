// src/routes/storeCreate.ts
import {
  base64ToArrayBuffer,
  uploadToR2,
  r2UrlForKey,
  invalidateCacheFor,
  jsonResponse
} from "../_lib/utils";
import { auth } from "../../_lib/auth";

export interface Env {
  KV: KVNamespace;
  MY_R2_BUCKET?: R2Bucket;
}

function genStoreId() {
  return "store_" + Math.random().toString(36).slice(2, 10);
}

export async function storeCreateHandler(req: Request, env: Env): Promise<Response> {
  const start = Date.now();
  try {
    // 🔐 AUTH (required)
    const session = await auth(env, req);
    if (!session) {
      return jsonResponse({ success: false, error: "Unauthorized" }, 401);
    }

    const companyId = session.companyId;

    if (req.method !== "POST") {
      return jsonResponse({ success: false, error: "Method not allowed" }, 405);
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return jsonResponse({ success: false, error: "Invalid JSON" }, 400);
    }

    let { brand, tagline = "", templateId = "restaurant", sections = {} } = body;
    if (!brand) {
      return jsonResponse({ success: false, error: "Missing brand" }, 400);
    }

    const storeId = body.storeId || genStoreId();
    const storeKey = `store:${storeId}`;

    // -------------------------------
    // FILE UPLOAD HANDLER (as before)
    // -------------------------------
    async function uploadIfBase64(val: any, prefix: string) {
      if (!val || typeof val !== "string") return val || null;
      if (val.startsWith("/r2/") || val.startsWith("http")) return val;

      try {
        const { buffer, contentType } = base64ToArrayBuffer(val);
        const ext = contentType.split("/")[1] || "png";
        const objectKey = `${prefix}.${ext}`;
        await uploadToR2(env, objectKey, buffer, contentType);
        return r2UrlForKey(objectKey);
      } catch (err) {
        console.warn("uploadIfBase64 failed", err);
        return null;
      }
    }

    // Brand images
    let logoUrl = null;
    if (sections.brand?.logo) {
      logoUrl = await uploadIfBase64(sections.brand.logo, `stores/${storeId}/logo`);
      if (logoUrl) sections.brand.logo = logoUrl;
    }

    if (sections.brand?.heroImage) {
      const hero = await uploadIfBase64(sections.brand.heroImage, `stores/${storeId}/hero`);
      if (hero) sections.brand.heroImage = hero;
    }

    // Menu images
    if (Array.isArray(sections.menu)) {
      for (let i = 0; i < sections.menu.length; i++) {
        const item = sections.menu[i];
        if (item?.img) {
          const u = await uploadIfBase64(item.img, `stores/${storeId}/menu-${i}`);
          if (u) item.img = u;
        }
      }
    }

    const now = new Date().toISOString();

    // -----------------------------------
    // 🔥 FINAL STORE OBJECT (multi-tenant)
    // -----------------------------------
    const storeObj = {
      id: storeId,
      companyId, // CRITICAL
      brand,
      tagline,
      template: templateId,
      sections,
      createdAt: now,
      updatedAt: now,
      logoUrl: logoUrl || sections.brand?.logo || null,
    };

    // Save store
    await env.KV.put(storeKey, JSON.stringify(storeObj));

    // ---------------------------------------------
    // 🔥 TENANT STORE LIST (per-company)
    // ---------------------------------------------
    const tenantKey = `tenant:${companyId}:stores`;
    const existingList = (await env.KV.get(tenantKey, { type: "json" })) || [];
    const list = Array.isArray(existingList) ? existingList : [];

    const filtered = list.filter((s: any) => s.id !== storeId);
    filtered.unshift({
      id: storeId,
      brand,
      tagline,
      logoUrl: storeObj.logoUrl,
      createdAt: now
    });

    await env.KV.put(tenantKey, JSON.stringify(filtered));

    // Invalidate tenant cache
    const origin = new URL(req.url).origin;
    await invalidateCacheFor(`${origin}/store/list?companyId=${companyId}`);

    return jsonResponse({
      success: true,
      id: storeId,
      store: storeObj,
      duration_ms: Date.now() - start
    });

  } catch (err: any) {
    console.error("storeCreate error:", err);
    return jsonResponse({
      success: false,
      error: "Failed to create store",
      message: err?.message || String(err),
    }, 500);
  }
}
