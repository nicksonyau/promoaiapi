import { Env } from "../../index";
import { jsonResponse } from "../../_lib/utils";
import { auth } from "../../_lib/auth";

type BatchContact = {
  name?: string;
  phone: string;
  tags?: string[];
};

function normStr(v: any) {
  return String(v ?? "").trim();
}

function normTag(v: any) {
  return String(v ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

function uniqTags(tags: any[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const t of tags || []) {
    const v = normTag(t);
    if (!v) continue;
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

function parseTagsField(raw: string): string[] {
  const s = normStr(raw);
  if (!s) return [];
  // allow vip|fnb|hotlead OR vip;fnb
  const parts = s.split(/[|;]+/g).map((x) => x.trim()).filter(Boolean);
  return uniqTags(parts);
}

// Small CSV line parser that supports quoted fields
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      // escaped quote
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }

    if (ch === "," && !inQuotes) {
      out.push(cur.trim());
      cur = "";
      continue;
    }

    cur += ch;
  }

  out.push(cur.trim());
  return out;
}

async function upsertTagIndex(env: Env, companyId: string, tag: string, contactId: string) {
  const t = normTag(tag);
  if (!t) return;
  const tagKey = `tag:${companyId}:${t}`;
  const tagIds = ((await env.KV.get(tagKey, "json")) as string[] | null) || [];
  if (!tagIds.includes(contactId)) {
    tagIds.push(contactId);
    await env.KV.put(tagKey, JSON.stringify(tagIds));
  }
}

export async function contactsImport(req: Request, env: Env) {
  try {
    if (req.method !== "POST") {
      return jsonResponse({ success: false, error: "Method not allowed" }, 405);
    }

    const session = await auth(env, req);
    if (!session?.companyId) {
      return jsonResponse({ success: false, error: "Unauthorized" }, 401);
    }

    const companyId = session.companyId;
    const ct = (req.headers.get("content-type") || "").toLowerCase();

    // =========================================================
    // A) JSON BATCH MODE (for UI progress)
    // body: { contacts: [{name, phone, tags}] }
    // =========================================================
    if (ct.includes("application/json")) {
      const body = await req.json().catch(() => null);

      if (body && Array.isArray(body.contacts)) {
        const contacts = body.contacts as BatchContact[];
        if (contacts.length === 0) {
          return jsonResponse({ success: false, error: "No contacts" }, 400);
        }

        const indexKey = `contacts:${companyId}`;
        const ids = ((await env.KV.get(indexKey, "json")) as string[] | null) || [];

        let added = 0;

        for (const c of contacts) {
          const phone = normStr(c?.phone);
          if (!phone) continue;

          const id = crypto.randomUUID();
          const tags = uniqTags(Array.isArray(c.tags) ? c.tags : []);

          const contact = {
            id,
            companyId,
            name: normStr(c?.name) || null,
            phone,
            tags,
            createdAt: Date.now(),
          };

          await env.KV.put(`contact:${companyId}:${id}`, JSON.stringify(contact));
          ids.push(id);
          added++;

          for (const t of tags) {
            await upsertTagIndex(env, companyId, t, id);
          }
        }

        await env.KV.put(indexKey, JSON.stringify(ids));
        return jsonResponse({ success: true, added });
      }
      // else: fall through to CSV mode below (some clients JSON-wrap CSV)
    }

    // =========================================================
    // B) CSV MODE (raw text/csv OR json-wrapped string)
    // =========================================================
    let text = "";
    if (ct.includes("application/json")) {
      const j = await req.json().catch(() => null);
      if (typeof j === "string") text = j;
      else if (j && typeof j.csv === "string") text = j.csv;
      else text = "";
    } else {
      text = await req.text().catch(() => "");
    }

    if (!text) return jsonResponse({ success: false, error: "Empty CSV" }, 400);

    const lines = text
      .split(/\r?\n/g)
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length < 2) {
      return jsonResponse({ success: false, error: "CSV has no data" }, 400);
    }

    const headerRaw = lines[0].replace(/^\uFEFF/, "");
    const header = parseCsvLine(headerRaw).map((h) => h.toLowerCase());

    const nameIdx = header.indexOf("name");
    const phoneIdx = header.indexOf("phone");
    const tagsIdx = header.indexOf("tags");

    if (phoneIdx === -1) {
      return jsonResponse({ success: false, error: "Missing phone column" }, 400);
    }

    const indexKey = `contacts:${companyId}`;
    const ids = ((await env.KV.get(indexKey, "json")) as string[] | null) || [];

    let added = 0;

    for (let i = 1; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i]);
      const phone = normStr(cols[phoneIdx]);
      if (!phone) continue;

      const name = nameIdx >= 0 ? normStr(cols[nameIdx]) : "";
      const tags = tagsIdx >= 0 ? parseTagsField(cols[tagsIdx] || "") : [];

      const id = crypto.randomUUID();

      const contact = {
        id,
        companyId,
        name: name || null,
        phone,
        tags,
        createdAt: Date.now(),
      };

      await env.KV.put(`contact:${companyId}:${id}`, JSON.stringify(contact));
      ids.push(id);
      added++;

      for (const t of tags) {
        await upsertTagIndex(env, companyId, t, id);
      }
    }

    await env.KV.put(indexKey, JSON.stringify(ids));

    return jsonResponse({ success: true, added });
  } catch (err: any) {
    console.error("[CONTACT_IMPORT]", err);
    return jsonResponse({ success: false, error: err.message }, 500);
  }
}
