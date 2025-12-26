import { Env } from "../../index";
import { jsonResponse } from "../../_lib/utils";
import { auth } from "../../_lib/auth";

function normalizePhone(phone: string) {
  return String(phone || "").trim().replace(/\s+/g, "");
}

function normalizeTag(tag: any) {
  return String(tag ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

function uniqTags(tags: any): string[] {
  if (!Array.isArray(tags)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const t of tags) {
    const v = normalizeTag(t);
    if (!v) continue;
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

function mergeTags(existing: any, incoming: any): string[] {
  return uniqTags([...(Array.isArray(existing) ? existing : []), ...(Array.isArray(incoming) ? incoming : [])]);
}

export async function contactsCreateHandler(req: Request, env: Env) {
  try {
    if (req.method !== "POST") {
      return jsonResponse({ success: false, error: "Method not allowed" }, 405);
    }

    const session = await auth(env, req);
    if (!session?.companyId) {
      return jsonResponse({ success: false, error: "Unauthorized" }, 401);
    }

    const companyId = session.companyId;

    const body = await req.json().catch(() => null);
    if (!body) {
      return jsonResponse({ success: false, error: "Invalid JSON" }, 400);
    }

    const { name, phone, tags } = body || {};
    if (!phone) {
      return jsonResponse({ success: false, error: "Phone is required" }, 400);
    }

    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      return jsonResponse({ success: false, error: "Phone is required" }, 400);
    }

    const phoneKey = `contact_phone:${companyId}:${normalizedPhone}`;
    const existingId = await env.KV.get(phoneKey);

    const incomingName = String(name ?? "").trim();
    const incomingTags = uniqTags(tags);

    // ---------------------------------------
    // UPSERT: if exists -> update + merge tags
    // ---------------------------------------
    if (existingId) {
      const recordKey = `contact:${companyId}:${existingId}`;
      const existing = (await env.KV.get(recordKey, "json")) as any | null;

      // If phone index exists but record missing/corrupt -> recreate safely
      if (!existing || existing.companyId !== companyId) {
        const id = crypto.randomUUID();
        const contact = {
          id,
          companyId,
          name: incomingName || null,
          phone: normalizedPhone,
          tags: incomingTags,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        await env.KV.put(`contact:${companyId}:${id}`, JSON.stringify(contact));
        await env.KV.put(phoneKey, id);

        // contacts index
        const indexKey = `contacts:${companyId}`;
        const ids = ((await env.KV.get(indexKey, "json")) as string[] | null) || [];
        if (!ids.includes(id)) {
          ids.push(id);
          await env.KV.put(indexKey, JSON.stringify(ids));
        }

        // tag index
        for (const tag of incomingTags) {
          const tagKey = `tag:${companyId}:${tag}`;
          const tagIds = ((await env.KV.get(tagKey, "json")) as string[] | null) || [];
          if (!tagIds.includes(id)) {
            tagIds.push(id);
            await env.KV.put(tagKey, JSON.stringify(tagIds));
          }
        }

        return jsonResponse({ success: true, contact, created: true, updated: false }, 200);
      }

      const nextTags = mergeTags(existing.tags, incomingTags);
      const nextName = incomingName ? incomingName : (existing.name ?? null);

      const updated = {
        ...existing,
        name: nextName,
        tags: nextTags,
        phone: normalizedPhone, // keep consistent
        updatedAt: Date.now(),
      };

      await env.KV.put(recordKey, JSON.stringify(updated));

      // ensure contacts index includes it (some older data might miss)
      const indexKey = `contacts:${companyId}`;
      const ids = ((await env.KV.get(indexKey, "json")) as string[] | null) || [];
      if (!ids.includes(existingId)) {
        ids.push(existingId);
        await env.KV.put(indexKey, JSON.stringify(ids));
      }

      // add tag index only for incoming tags (cheap, avoids re-writing all)
      for (const tag of incomingTags) {
        const tagKey = `tag:${companyId}:${tag}`;
        const tagIds = ((await env.KV.get(tagKey, "json")) as string[] | null) || [];
        if (!tagIds.includes(existingId)) {
          tagIds.push(existingId);
          await env.KV.put(tagKey, JSON.stringify(tagIds));
        }
      }

      // ✅ NO MORE 409
      return jsonResponse({ success: true, contact: updated, created: false, updated: true }, 200);
    }

    // ---------------------------------------
    // CREATE NEW
    // ---------------------------------------
    const id = crypto.randomUUID();

    const contact = {
      id,
      companyId,
      name: incomingName || null,
      phone: normalizedPhone,
      tags: incomingTags,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await env.KV.put(`contact:${companyId}:${id}`, JSON.stringify(contact));

    // phone index
    await env.KV.put(phoneKey, id);

    // contacts index
    const indexKey = `contacts:${companyId}`;
    const ids = ((await env.KV.get(indexKey, "json")) as string[] | null) || [];
    if (!ids.includes(id)) {
      ids.push(id);
      await env.KV.put(indexKey, JSON.stringify(ids));
    }

    // tag index
    for (const tag of incomingTags) {
      const tagKey = `tag:${companyId}:${tag}`;
      const tagIds = ((await env.KV.get(tagKey, "json")) as string[] | null) || [];
      if (!tagIds.includes(id)) {
        tagIds.push(id);
        await env.KV.put(tagKey, JSON.stringify(tagIds));
      }
    }

    return jsonResponse({ success: true, contact, created: true, updated: false }, 200);
  } catch (err: any) {
    console.error("[CONTACT_CREATE]", err);
    return jsonResponse({ success: false, error: err?.message || "Server error" }, 500);
  }
}
