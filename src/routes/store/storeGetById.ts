
import { getStoreById } from "../../services/storeService";

export const onRequestGet: PagesFunction = async (context) => {
  const { id } = context.params as { id: string };

  try {
    const store = await getStoreById(id);
    if (!store) {
      return new Response(
        JSON.stringify({ error: "Store not found" }),
        { status: 404 }
      );
    }

    return new Response(JSON.stringify(store), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("mystoreGetById error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch store" }),
      { status: 500 }
    );
  }
};
