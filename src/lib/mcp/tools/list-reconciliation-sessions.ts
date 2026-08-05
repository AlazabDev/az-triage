import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_reconciliation_sessions",
  title: "List reconciliation sessions",
  description:
    "List the signed-in user's reconciliation sessions (الفرز والمطابقة), newest first, with status and branch.",
  inputSchema: {
    limit: z.number().int().min(1).max(100).default(20).describe("Maximum number of sessions to return."),
    status: z
      .string()
      .trim()
      .min(1)
      .optional()
      .describe("Optional status filter, e.g. draft, in_review, approved."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, status }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Not authenticated");
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("reconciliation_sessions")
      .select("id, name, branch, session_date, status, notes, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) throw new ToolError(error.message);
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { sessions: data ?? [] },
    };
  },
});
