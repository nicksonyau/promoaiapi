"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import toast from "react-hot-toast";
import { apiFetch } from "@/lib/api";

// ✅ MATCH SiteCrawler KV Record Structure
interface SiteRecord {
  id: string;
  rootUrl: string;
  status?: "pending" | "indexing" | "indexed" | "failed" | "stopped";
  pagesCrawled?: number;
  maxPages?: number;
  createdAt?: number;
}

export default function ChatbotSourcesPage() {
  const params = useParams();
  const chatbotId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [sites, setSites] = useState<SiteRecord[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const [adding, setAdding] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // new state for pages + content
  const [selectedSite, setSelectedSite] = useState<string | null>(null);
  const [pages, setPages] = useState<string[]>([]);
  const [selectedPage, setSelectedPage] = useState<string | null>(null);
  const [pageContent, setPageContent] = useState<string>("");
  const [loadingPages, setLoadingPages] = useState(false);
  const [loadingContent, setLoadingContent] = useState(false);

  // -------------------------
  // Load Sites (✅ SITECRAWLER KV)
  // -------------------------
  const loadSites = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/chatbot/sitecrawler/list/${chatbotId}`);
      const data = await res.json();

      if (!data.success) throw new Error(data.error || "Load failed");

      setSites(data.list || []);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load websites");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (chatbotId) loadSites();
  }, [chatbotId]);

  // -------------------------
  // Add Root Website
  // -------------------------
  const addSite = async () => {
    if (!urlInput.trim()) return toast.error("Enter a valid URL");

    setAdding(true);
    try {
      const res = await apiFetch(`/chatbot/sitecrawler/create`, {
        method: "POST",
        body: JSON.stringify({ chatbotId, rootUrl: urlInput }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast.success("Website added");
      setUrlInput("");
      loadSites();
    } catch (e: any) {
      toast.error(e.message || "Add failed");
    } finally {
      setAdding(false);
    }
  };

  // -------------------------
  // Delete Site
  // -------------------------
  const removeSite = async (id: string) => {
    if (!confirm("Remove this website crawl?")) return;

    try {
      const res = await apiFetch(`/chatbot/sitecrawler/delete/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast.success("Removed");
      loadSites();
      // reset right panel if same site
      if (selectedSite === id) {
        setSelectedSite(null);
        setPages([]);
        setSelectedPage(null);
        setPageContent("");
      }
    } catch (e: any) {
      toast.error(e.message || "Delete failed");
    }
  };

  // -------------------------
  // Start Crawl
  // -------------------------
  const startCrawl = async (id: string) => {
    setProcessingId(id);
    try {
      const res = await apiFetch(`/chatbot/sitecrawler/start/${id}`, {
        method: "POST",
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast.success("Crawling completed");
      loadSites();
      // reload pages if user is viewing this site
      if (selectedSite === id) {
        await loadPages(id);
      }
    } catch (e: any) {
      toast.error(e.message || "Crawl failed");
    } finally {
      setProcessingId(null);
    }
  };

  // -------------------------
  // Load Pages list for a site
  // -------------------------
  const loadPages = async (siteId: string) => {
    setSelectedSite(siteId);
    setSelectedPage(null);
    setPageContent("");
    setLoadingPages(true);

    try {
      const res = await apiFetch(`/chatbot/sitecrawler/pages/${siteId}`);
      const data = await res.json();

      if (!data.success) throw new Error(data.error);
      setPages(data.pages || []);
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to load pages");
    } finally {
      setLoadingPages(false);
    }
  };

  // -------------------------
  // Load single page content
  // -------------------------
  const loadPageContent = async (url: string) => {
    if (!selectedSite) return;

    setSelectedPage(url);
    setLoadingContent(true);

    try {
      const res = await apiFetch(
        `/chatbot/sitecrawler/page?siteId=${selectedSite}&url=${encodeURIComponent(
          url
        )}`
      );
      const data = await res.json();

      if (!data.success) throw new Error(data.error || "Load failed");
      setPageContent(data.content || "");
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to load content");
    } finally {
      setLoadingContent(false);
    }
  };

  // -------------------------
  // UI
  // -------------------------
  return (
    <div className="p-10 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Website Crawler</h1>

      {/* ADD ROOT SITE */}
      <div className="bg-white p-5 rounded-xl border mb-6">
        <h2 className="font-semibold mb-3">Add Website Root</h2>
        <div className="flex gap-2">
          <input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://example.com"
            className="flex-1 border px-3 py-2 rounded-md"
          />
          <button
            onClick={addSite}
            disabled={adding}
            className="bg-indigo-600 text-white px-4 rounded-md disabled:opacity-50"
          >
            {adding ? "Adding…" : "Add"}
          </button>
        </div>
      </div>

      {/* SITE LIST */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="p-4 font-semibold">Websites</div>

        {loading && (
          <div className="p-6 text-gray-400 text-center">Loading...</div>
        )}

        {!loading && sites.length === 0 && (
          <div className="p-6 text-gray-400 text-center">No sites added yet</div>
        )}

        {!loading && sites.length > 0 && (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-left">Root URL</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Pages</th>
                <th className="p-3 w-64 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {sites.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="p-3 break-all">{s.rootUrl}</td>
                  <td className="p-3 text-center">
                    <StatusBadge status={s.status} />
                  </td>
                  <td className="p-3 text-center">
                    {s.pagesCrawled ?? "-"} / {s.maxPages ?? "-"}
                  </td>
                  <td className="p-3 text-center space-x-2">
                    <button
                      onClick={() => loadPages(s.id)}
                      className="bg-gray-800 text-white px-3 py-1 rounded text-xs"
                    >
                      View Pages
                    </button>

                    <button
                      onClick={() => startCrawl(s.id)}
                      disabled={processingId === s.id}
                      className="bg-black text-white px-3 py-1 rounded text-xs disabled:opacity-50"
                    >
                      {processingId === s.id ? "Crawling…" : "Crawl"}
                    </button>

                    <button
                      onClick={() => removeSite(s.id)}
                      className="text-red-500 hover:underline text-xs"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* PAGES + CONTENT PANEL */}
      {selectedSite && (
        <div className="mt-8 grid grid-cols-3 gap-4 border rounded-xl bg-white overflow-hidden">
          {/* PAGE LIST */}
          <div className="border-r p-4">
            <h3 className="font-semibold mb-2">Crawled Pages</h3>

            {loadingPages && (
              <p className="text-gray-400 text-sm">Loading pages...</p>
            )}

            {!loadingPages && pages.length === 0 && (
              <p className="text-gray-400 text-sm">No pages indexed yet</p>
            )}

            {!loadingPages &&
              pages.map((p) => (
                <div
                  key={p}
                  onClick={() => loadPageContent(p)}
                  className={`cursor-pointer p-2 text-xs break-all rounded hover:bg-indigo-50 ${
                    selectedPage === p ? "bg-indigo-100 font-semibold" : ""
                  }`}
                >
                  {p}
                </div>
              ))}
          </div>

          {/* PAGE CONTENT */}
          <div className="col-span-2 p-4 overflow-auto max-h-[500px]">
            <h3 className="font-semibold mb-2">Page Content</h3>

            {loadingContent && (
              <p className="text-gray-400 text-sm">Loading content...</p>
            )}

            {!loadingContent && !pageContent && (
              <p className="text-gray-400 text-sm">Select a page</p>
            )}

            {!loadingContent && pageContent && (
              <pre className="whitespace-pre-wrap text-xs">
                {pageContent.slice(0, 20000)}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status?: "pending" | "indexing" | "indexed" | "failed" | "stopped";
}) {
  if (status === "indexed")
    return <span className="text-green-600 font-medium">Indexed</span>;
  if (status === "indexing")
    return <span className="text-blue-600 font-medium">Indexing</span>;
  if (status === "failed")
    return <span className="text-red-600 font-medium">Failed</span>;
  if (status === "stopped")
    return <span className="text-yellow-600 font-medium">Stopped</span>;
  return <span className="text-gray-400">Pending</span>;
}
