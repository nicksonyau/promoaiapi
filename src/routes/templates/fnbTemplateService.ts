import { Env } from "../index";

// DELETE handler for KV templates
export async function deleteTemplateHandler(req: Request, env: Env): Promise<Response> {
  try {
    const url = new URL(req.url);
    const id = url.pathname.split("/").pop(); // last segment = template ID

    if (!id) {
      return new Response(JSON.stringify({ success: false, error: "Missing template ID" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Delete template from KV
    await env.KV.delete(`template:${id}`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("KV delete error:", err);
    return new Response(JSON.stringify({ success: false, error: "Failed to delete template" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
