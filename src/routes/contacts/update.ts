import { Env } from "../../index";
import { jsonResponse } from "../../_lib/utils";
import { auth } from "../../_lib/auth";

function normalizePhone(phone: string) {
  return String(phone || "").trim().replace(/\s+/g, "");
}

function normalizeTags(tags: any): string[] {
  if (!Array.isArray(tags)) return [];
  const cleaned = tags
    .map((t) => String(t || "").trim().toLowerCase())
    .filter(Boolean);
  return Array.from(new Set(cleaned));
}

export async function contactsUpdateHandler(
  req: Request,
  env: Env,
  contactId?: string
) {
  try {
    // -----------------------
    // METHOD GUARD
    // -----------------------
    if (req.method !== "PUT") {
      return jsonResponse({ success: false, error: "Method not allowed" }, 405);
    }

    // -----------------------
    // AUTH
    // -----------------------
    const session = await auth(env, req);
    if (!session?.companyId) {
      return jsonResponse({ success: false, error: "Unauthorized" }, 401);
    }

    const companyId = session.companyId;

    // -----------------------
    // ID (PATH PARAM FIRST, FALLBACK TO QUERY)
    // -----------------------
    let id = contactId || null;
    if (id) {
      try {
        id = decodeURIComponent(id);
      } catch {}
      if (!id.trim()) id = null;
    }

    if (!id) {
      const url = new URL(req.url);
      const qid = url.searchParams.get("id");
      if (qid && qid.trim()) id = qid.trim();
    }

    if (!id) {
      return jsonResponse({ success: false, error: "Missing contact id" }, 400);
    }

    // -----------------------
    // LOAD EXISTING
    // -----------------------
    const key = `contact:${companyId}:${id}`;
    const existing: any = await env.KV.get(key, "json");

    if (!existing) {
      return jsonResponse({ success: false, error: "Contact not found" }, 404);
    }

    // -----------------------
    // PARSE BODY
    // -----------------------
    const body = await req.json().catch(() => null);
    if (!body) {
      return jsonResponse({ success: false, error: "Invalid JSON" }, 400);
    }

    const patchName =
      typeof body.name === "string" ? body.name.trim() : undefined;

    const patchPhone =
      body.phone !== undefined ? normalizePhone(body.phone) : undefined;

    const patchTags =
      body.tags !== undefined ? normalizeTags(body.tags) : undefined;

    const hasPatch =
      patchName !== undefined || patchPhone !== undefined || patchTags !== undefined;

    if (!hasPatch) {
      return jsonResponse({ success: false, error: "No fields to update" }, 400);
    }

    // -----------------------
    // PHONE DEDUP IF CHANGED
    // -----------------------
    const oldPhone = normalizePhone(existing.phone);
    let nextPhone = oldPhone;

    if (patchPhone !== undefined) {
      if (!patchPhone) {
        return jsonResponse({ success: false, error: "Phone is required" }, 400);
      }
      nextPhone = patchPhone;
      if (nextPhone !== oldPhone) {
        const newPhoneKey = `contact_phone:${companyId}:${nextPhone}`;
        const existingId = await env.KV.get(newPhoneKey);
        if (existingId && existingId !== id) {
          return jsonResponse(
            { success: false, error: "Phone already exists" },
            409
          );
        }
      }
    }

    // -----------------------
    // TAG INDEX UPDATE IF CHANGED
    // -----------------------
    const oldTags: string[] = Array.isArray(existing.tags)
      ? normalizeTags(existing.tags)
      : [];
    const nextTags =
      patchTags !== undefined ? patchTags : oldTags;

    // remove from old tag index (if tags changed)
    if (patchTags !== undefined) {
      for (const t of oldTags) {
        const tagKey = `tag:${companyId}:${t}`;
        const ids = (await env.KV.get(tagKey, "json")) || [];
        const nextIds = ids.filter((x: string) => x !== id);
        await env.KV.put(tagKey, JSON.stringify(nextIds));
      }

      // add to new tag index
      for (const t of nextTags) {
        const tagKey = `tag:${companyId}:${t}`;
        const ids = (await env.KV.get(tagKey, "json")) || [];
        if (!ids.includes(id)) {
          ids.push(id);
          await env.KV.put(tagKey, JSON.stringify(ids));
        }
      }
    }

    // -----------------------
    // PHONE INDEX UPDATE IF CHANGED
    // -----------------------
    if (nextPhone !== oldPhone) {
      await env.KV.delete(`contact_phone:${companyId}:${oldPhone}`);
      await env.KV.put(`contact_phone:${companyId}:${nextPhone}`, id);
    }

    // -----------------------
    // SAVE UPDATED CONTACT
    // -----------------------
    const updated = {
      ...existing,
      name: patchName !== undefined ? (patchName || null) : existing.name ?? null,
      phone: nextPhone,
      tags: nextTags,
      updatedAt: Date.now(),
    };

    await env.KV.put(key, JSON.stringify(updated));

    return jsonResponse({ success: true, contact: updated });
  } catch (err: any) {
    console.error("[CONTACT_UPDATE]", err);
    return jsonResponse({ success: false, error: err.message }, 500);
  }
}
