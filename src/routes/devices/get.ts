import { jsonResponse } from "../../_lib/utils";
import { Env } from "../../index";

export async function deviceGetHandler(req: Request, env: Env, sessionId: string) {
  console.log("🔍 [deviceGetHandler] START", { sessionId });

  const key = `wa:device:${sessionId}`;
  let device: any = null;

  // -------------------------------------------------------
  // 1. Load device from KV
  // -------------------------------------------------------
  try {
    device = await env.KV.get(key, "json");
  } catch (err) {
    return jsonResponse({ success: false, error: "Device load failure" }, 500);
  }

  // Ensure fallback object
  if (!device) {
    device = { sessionId, ready: false, qr: null, number: null, jid: null };
  }

  const previousQR = device.qr; // ⭐ Preserve existing QR

  // -------------------------------------------------------
  // 2. FETCH QR FROM BAILEYS
  // -------------------------------------------------------
  const qrUrl = `https://wa.thrivosign.uk/qr?sessionId=${sessionId}`;
  console.log("🌐===================================== [/qr] →", qrUrl);

  let qrRes: any = null;

  try {
    const res = await fetch(qrUrl);
    console.log("🌐 [/qr] Status:", res.status);

    if (res.ok) {
      qrRes = await res.json();
    }
  } catch (err) {
    console.error("❌ [/qr] Error", err);
  }

  // -------------------------------------------------------
  // 3. MERGE QR (SAFE MODE)
  // -------------------------------------------------------
  if (qrRes) {
    device.ready = !!qrRes.ready;

    // ⭐ FIX: Only overwrite QR when Baileys PROVIDES a new QR
    device.qr = qrRes.qr ? qrRes.qr : previousQR;

    console.log("🔄 [QR Merge]", {
      ready: device.ready,
      qrPresent: !!device.qr,
    });
  }

  // -------------------------------------------------------
  // 4. If ready, fetch metadata from Baileys health API
  // -------------------------------------------------------
  let metaRes: any = null;

  if (device.ready) {
    const healthUrl = `https://wa.thrivosign.uk/health?sessionId=${sessionId}`;
    console.log("🌐 [/health] →", healthUrl);

    try {
      const res = await fetch(healthUrl);
      if (res.ok) metaRes = await res.json();
    } catch (err) {
      console.error("❌ [/health] Error", err);
    }
  }

  // -------------------------------------------------------
  // 5. MERGE META INFO (number, name)
  // -------------------------------------------------------
  if (metaRes?.meta) {
    device.number = metaRes.meta.number || device.number || null;
    device.meta = metaRes.meta;

    device.jid = device.number
      ? `${device.number}@s.whatsapp.net`
      : null;

    console.log("🔄 [META Merge]", {
      number: device.number,
      name: device.meta?.name,
      jid: device.jid,
    });
  }

  // -------------------------------------------------------
  // 6. SAVE UPDATED DEVICE BACK TO KV
  // -------------------------------------------------------
  try {
    await env.KV.put(key, JSON.stringify(device));
    console.log("💾 [KV SAVED]", device);
  } catch (err) {
    console.error("❌ Failed saving device", err);
  }

  // -------------------------------------------------------
  // 7. SEND RESPONSE
  // -------------------------------------------------------
  return jsonResponse(
    {
      success: true,
      device,
    },
    200
  );
}
