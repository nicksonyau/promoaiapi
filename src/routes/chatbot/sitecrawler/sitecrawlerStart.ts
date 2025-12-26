import { Env } from "../../../index";
import { jsonResponse } from "../../_lib/utils";
import { auth } from "../../../_lib/auth";
import * as cheerio from "cheerio";

interface SiteRecord {
  id: string;
  chatbotId: string;
  companyId: string;
  rootUrl: string;
  maxPages: number;
  status: "pending" | "indexing" | "indexed" | "failed" | "stopped";
  pagesCrawled: number;
  createdAt: number;
  updatedAt: number;
}

/* =======================================================
   MAIN START HANDLER
======================================================= */

export async function chatbotSitecrawlerStartHandler(
  req: Request,
  env: Env
): Promise<Response> {

  console.log("🟢 [SITECRAWLER_START]");

  try {
    if (req.method !== "POST")
      return jsonResponse({ success: false, error: "Method not allowed" }, 405);

    const session = await auth(env, req);
    if (!session?.companyId)
      return jsonResponse({ success: false, error: "Unauthorized" }, 401);

    const siteId = req.url.split("/").pop()!;
    const siteKey = `chatbot:sitecrawler:site:${siteId}`;
    const raw = await env.chatbotconfig.get(siteKey);

    if (!raw) return jsonResponse({ success: false, error: "Not found" }, 404);

    const site: SiteRecord = JSON.parse(raw);
    if (site.companyId !== session.companyId)
      return jsonResponse({ success: false, error: "Forbidden" }, 403);

    site.status = "indexing";
    site.updatedAt = Date.now();
    await env.chatbotconfig.put(siteKey, JSON.stringify(site));

    const { pagesVisited, pages } = await crawlSite(site);

    // ✅ SAVE PAGE URL LIST
    await env.chatbotconfig.put(
      `chatbot:sitecrawler:pages:${siteId}`,
      JSON.stringify(pagesVisited)
    );

    // ✅ SAVE FULL PAGE CONTENT
    await env.chatbotconfig.put(
      `chatbot:sitecrawler:content:${siteId}`,
      JSON.stringify({ pages, updatedAt: Date.now() })
    );

    site.status = "indexed";
    site.pagesCrawled = pagesVisited.length;
    site.updatedAt = Date.now();
    await env.chatbotconfig.put(siteKey, JSON.stringify(site));

    return jsonResponse({
      success: true,
      pagesCrawled: site.pagesCrawled
    });

  } catch (err: any) {
    console.error("🔥 CRAWL ERROR", err);
    return jsonResponse({ success: false, error: err.message }, 500);
  }
}

/* =======================================================
   CRAWLER ENGINE (FINAL)
======================================================= */

async function crawlSite(site: SiteRecord): Promise<{
  pagesVisited: string[];
  pages: { url: string; title?: string; text: string }[];
}> {

  const visited = new Set<string>();
  const queue: string[] = [];
  const pages: { url: string; title?: string; text: string }[] = [];

  const root = new URL(site.rootUrl);
  const origin = root.origin;
  const maxPages = 30;

  // ✅ Seed entry points
  queue.push(root.toString());
  queue.push(origin + "/blog");
  queue.push(origin + "/blog/");
  queue.push(origin + "/news");
  queue.push(origin + "/articles");
  queue.push(origin + "/sitemap.xml");
  queue.push(origin + "/sitemap_index.xml");

  console.log("🧭 Seed URLs loaded");

  while (queue.length && visited.size < maxPages) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    if (!current.startsWith(origin)) continue;

    visited.add(current);
    console.log("🌐 Fetch", current);

    try {
      const res = await fetch(current, {
        headers: { "User-Agent": "PromoHubAI-Crawler/1.0" }
      });

      if (!res.ok) continue;

      const type = res.headers.get("content-type") || "";

      /* ======= XML SITEMAP CRAWL ======= */
      if (type.includes("xml") || current.endsWith(".xml")) {
        const xml = await res.text();
        const urls = xml.match(/https?:\/\/[^<"]+/g) || [];

        urls.forEach(u => {
          if (u.startsWith(origin)) queue.push(u);
        });

        continue;
      }

      if (!type.includes("text/html")) continue;

      /* ======= HTML SCRAPE ======= */
      const html = (await res.text()).slice(0, 300_000);
      const $ = cheerio.load(html);

      // ✅ REMOVE NON-TEXT ELEMENTS
      $("script,style,nav,footer,header,img,svg,video,canvas,iframe").remove();

      const title = $("title").text()?.trim() || "";
      let text = $("body").text().replace(/\s+/g, " ").trim();
      text = text.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");

      if (text.length > 80) {
        pages.push({ url: current, title, text });
        console.log("📄 Saved content:", current);
      }

      /* ======= LINK DISCOVERY ======= */
      $("a[href]").each((_, el) => {
        const href = $(el).attr("href");
        if (!href) return;

        // ❌ BLOCK BAD URL PATTERNS
        if (
          href.startsWith("#") ||
          href.startsWith("javascript") ||
          href.startsWith("mailto") ||
          href.includes("cdn-cgi") ||
          href.includes("email-protection")
        ) return;

        try {
          const link = new URL(href, current);
          if (link.origin !== origin) return;
          link.hash = "";

          const clean = link.toString();
          if (!visited.has(clean)) queue.push(clean);
        } catch {}
      });

    } catch (e) {
      console.error("❌ Fetch failed", current, e);
    }
  }

  return {
    pagesVisited: [...visited],
    pages
  };
}
