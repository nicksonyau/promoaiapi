import { Env } from "../../index";
import { jsonResponse } from "../../_lib/utils";
import { auth } from "../../_lib/auth";

function toInt(v: string | null, def: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  const i = Math.floor(n);
  return i > 0 ? i : def;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function norm(s: any) {
  return String(s || "").trim().toLowerCase();
}

function contactMatches(contact: any, q: string, tag: string) {
  const name = norm(contact?.name);
  const phone = norm(contact?.phone);
  const tagsArr = Array.isArray(contact?.tags) ? contact.tags : [];
  const tags = tagsArr.map((t: any) => norm(t)).filter(Boolean);

  if (tag) {
    if (!tags.includes(tag)) return false;
  }

  if (q) {
    const hay = `${name} ${phone} ${tags.join(" ")}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }

  return true;
}

export async function contactsListHandler(req: Request, env: Env) {
  try {
    // -----------------------
    // METHOD GUARD
    // -----------------------
    if (req.method !== "GET") {
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
    // QUERY PARAMS
    // -----------------------
    const url = new URL(req.url);
    const page = toInt(url.searchParams.get("page"), 1);
    const pageSize = clamp(toInt(url.searchParams.get("pageSize"), 10), 1, 200);

    // optional filters
    const q = norm(url.searchParams.get("q"));
    const tag = norm(url.searchParams.get("tag"));

    // -----------------------
    // LOAD ID SOURCE (INDEX OR TAG INDEX)
    // -----------------------
    const indexKey = `contacts:${companyId}`;
    const allIds = ((await env.KV.get(indexKey, "json")) as string[] | null) || [];

    // If you have tag index, use it (fast path)
    let sourceIds: string[] = allIds;
    let usedTagIndex = false;

    if (tag) {
      const tagKey = `tag:${companyId}:${tag}`;
      const tagIds = (await env.KV.get(tagKey, "json")) as string[] | null;
      if (Array.isArray(tagIds)) {
        sourceIds = tagIds;
        usedTagIndex = true;
      }
    }

    // -----------------------
    // FAST PATH: no q, no tag-scan needed
    // - if tag exists AND tag-index exists => slice tagIds and load that page only
    // - if no tag and no q => slice allIds and load that page only
    // -----------------------
    const noQ = !q;
    const noTag = !tag;

    if (noQ && (noTag || usedTagIndex)) {
      const total = sourceIds.length;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));

      const safePage = clamp(page, 1, totalPages);
      const start = (safePage - 1) * pageSize;
      const sliceIds = sourceIds.slice(start, start + pageSize);

      const contacts: any[] = [];
      for (const id of sliceIds) {
        const contactKey = `contact:${companyId}:${id}`;
        const c = await env.KV.get(contactKey, "json");
        if (c) contacts.push(c);
      }

      return jsonResponse({
        success: true,
        contacts,
        total,
        page: safePage,
        pageSize,
        totalPages,
      });
    }

    // -----------------------
    // SCAN PATH (supports q and/or tag when tag index missing)
    // NOTE: O(N) KV reads. Acceptable for ~1000.
    // -----------------------
    const matched: any[] = [];
    for (const id of sourceIds) {
      const contactKey = `contact:${companyId}:${id}`;
      const c = await env.KV.get(contactKey, "json");
      if (!c) continue;
      if (contactMatches(c, q, tag)) matched.push(c);
    }

    const total = matched.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = clamp(page, 1, totalPages);
    const start = (safePage - 1) * pageSize;

    return jsonResponse({
      success: true,
      contacts: matched.slice(start, start + pageSize),
      total,
      page: safePage,
      pageSize,
      totalPages,
    });
  } catch (err: any) {
    console.error("[CONTACTS_LIST]", err);
    return jsonResponse({ success: false, error: err.message }, 500);
  }
}
