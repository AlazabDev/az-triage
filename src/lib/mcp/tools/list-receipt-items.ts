import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_receipt_items",
  title: "List receipt items",
  description:
    "List extracted receipt items for one reconciliation session, optionally filtered by match status (e.g. confirmed, partial, needs_review).",
  inputSchema: {
    session_id: z.string().uuid().describe("The reconciliation session id."),
    match_status: z
      .string()
      .trim()
      .min(1)
      .optional()
      .describe("Optional match status filter, e.g. confirmed, partial, needs_review."),
    limit: z.number().int().min(1).max(200).default(50).describe("Maximum number of items to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ session_id, match_status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Not authenticated");
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("receipt_items")
      .select(
        "id, item_index, item_code, description, corrected_description, unit, quantity, unit_price, total, match_status, match_score, reviewer_note",
      )
      .eq("session_id", session_id)
      .order("item_index", { ascending: true })
      .limit(limit ?? 50);
    if (match_status) query = query.eq("match_status", match_status);
    const { data, error } = await query;
    if (error) throw new ToolError(error.message);
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { items: data ?? [] },
    };
  },
});
