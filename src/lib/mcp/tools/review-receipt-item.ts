import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "review_receipt_item",
  title: "Review receipt item",
  description:
    "Update the review outcome of one extracted receipt item: set its match status, a reviewer note, and/or a corrected description.",
  inputSchema: {
    item_id: z.string().uuid().describe("The receipt item id."),
    match_status: z
      .enum(["confirmed", "partial", "needs_review", "unmatched"])
      .nullable()
      .describe("New match status, or null to leave unchanged."),
    reviewer_note: z
      .string()
      .trim()
      .max(2000)
      .nullable()
      .describe("Reviewer note to store, or null to leave unchanged."),
    corrected_description: z
      .string()
      .trim()
      .max(2000)
      .nullable()
      .describe("Corrected item description, or null to leave unchanged."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ item_id, match_status, reviewer_note, corrected_description }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Not authenticated");
    const patch: Record<string, string> = {};
    if (match_status) patch.match_status = match_status;
    if (reviewer_note !== null) patch.reviewer_note = reviewer_note;
    if (corrected_description !== null) patch.corrected_description = corrected_description;
    if (Object.keys(patch).length === 0) throw new ToolError("Nothing to update: provide at least one field");

    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("receipt_items")
      .update(patch)
      .eq("id", item_id)
      .select("id, item_code, description, corrected_description, match_status, reviewer_note")
      .maybeSingle();
    if (error) throw new ToolError(error.message);
    if (!data) throw new ToolError("Item not found or not accessible");
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { item: data },
    };
  },
});
