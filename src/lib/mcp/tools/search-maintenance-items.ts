import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "search_maintenance_items",
  title: "Search maintenance items",
  description:
    "Search the maintenance reference dataset (اذونات الاستلام) by item description, receipt code or branch. Requires an admin or moderator account.",
  inputSchema: {
    query: z.string().trim().min(1).max(200).nullable().describe("Text to match in the item description, or null."),
    receipt_code: z.string().trim().min(1).max(50).nullable().describe("Exact receipt code such as auf-001, or null."),
    limit: z.number().int().min(1).max(200).default(50).describe("Maximum number of items to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, receipt_code, limit }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Not authenticated");
    const supabase = supabaseForUser(ctx);
    let request = supabase
      .from("maintenance_items")
      .select("id, receipt_code, item_index, item_date, branch, description, unit, quantity, unit_price, total, status")
      .order("receipt_code", { ascending: true })
      .limit(limit ?? 50);
    if (receipt_code) request = request.eq("receipt_code", receipt_code);
    if (query) request = request.ilike("description", `%${query}%`);
    const { data, error } = await request;
    if (error) throw new ToolError(error.message);
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { items: data ?? [] },
    };
  },
});
