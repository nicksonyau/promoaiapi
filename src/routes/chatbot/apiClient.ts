// src/routes/chatbot/apiClient.ts

import { Env } from "../../index";

export async function fetchFromAPI(env: Env, path: string) {
  // Build absolute URL using WORKER_URL env variable
  const base = "http://localhost:8787";

  if (!base) {
    console.error("❌ WORKER_URL is missing in environment variables");
    return null;
  }

  const sanitizedPath = path.startsWith("/") ? path : "/" + path;
  const url = `${base}${sanitizedPath}`;

  console.log("===================================");
  console.log("🌐 [apiClient] Fetching URL:", url);
  console.log("📌 [apiClient] Base:", base);
  console.log("📌 [apiClient] Path:", sanitizedPath);
  console.log("===================================");

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    console.log("📥 [apiClient] Response Status:", res.status, res.statusText);

    if (!res.ok) {
      console.log("❌ NOT OK Response");
      return null;
    }

    const json = await res.json();
    console.log("📦 JSON Response:", json);

    return json;
  } catch (err) {
    console.error("❌ [apiClient] Fetch error:", err);
    return null;
  }
}
