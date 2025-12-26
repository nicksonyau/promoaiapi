"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

export function useInitSubscription() {
  const [ready, setReady] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    console.log("[useInitSubscription] init");

    (async () => {
      try {
        console.log("[useInitSubscription] calling GET /subscription/get");

        const res = await apiFetch("/subscription/get");
        const data = await res.json();

        console.log("[useInitSubscription] response", {
          ok: res.ok,
          status: res.status,
          data,
        });

        if (cancelled) {
          console.warn("[useInitSubscription] cancelled before state update");
          return;
        }

        if (!res.ok || !data?.success) {
          console.error("[useInitSubscription] failed", data?.error);
          setError(data?.error || `Request failed (${res.status})`);
        } else {
          console.log("[useInitSubscription] subscription loaded", data.subscription);
          setSubscription(data.subscription);
        }
      } catch (e: any) {
        console.error("[useInitSubscription] exception", e);
        if (!cancelled) setError(e?.message || "Unknown error");
      } finally {
        if (!cancelled) {
          console.log("[useInitSubscription] ready=true");
          setReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
      console.log("[useInitSubscription] cleanup (cancelled)");
    };
  }, []);

  console.log("[useInitSubscription] render", {
    ready,
    subscription,
    error,
  });

  return { ready, subscription, error };
}
