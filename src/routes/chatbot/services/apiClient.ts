// src/routes/chatbot/apiClient.ts

import { Env } from "../../index";

export async function fetchFromAPI(env: Env, path: string) {
  const base = env.API_BASE_URL || env.PUBLIC_API_URL || "";
  if (!base) return null;

  const url = `${base}${path}`;
  console.log("🌐 Fetch API:", url);

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) return null;

    return await res.json();
  } catch (err) {
    console.error("❌ API fetch error:", err);
    return null;
  }
}
