import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_reconciliation_session",
  title: "Get reconciliation session",
  description:
    "Get one reconciliation session owned by the signed-in user, including its receipt pages, reference files and item match counts.",
  inputSchema: {
    session_id: z.string().uuid().describe("The reconciliation session id."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ session_id }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Not authenticated");
    const supabase = supabaseForUser(ctx);

    const { data: session, error: sessionError } = await supabase
      .from("reconciliation_sessions")
      .select("id, name, branch, session_date, status, notes, is_public, created_at, updated_at")
      .eq("id", session_id)
      .maybeSingle();
    if (sessionError) throw new ToolError(sessionError.message);
    if (!session) throw new ToolError("Session not found or not accessible");

    const [pages, references, items] = await Promise.all([
      supabase
        .from("receipt_pages")
        .select("id, page_index, receipt_code, branch, receipt_date, review_status, extraction_status, extraction_error")
        .eq("session_id", session_id)
        .order("page_index", { ascending: true }),
      supabase
        .from("excel_snapshots")
        .select("id, original_filename, file_kind, row_count, created_at")
        .eq("session_id", session_id),
      supabase.from("receipt_items").select("match_status").eq("session_id", session_id),
    ]);

    for (const result of [pages, references, items]) {
      if (result.error) throw new ToolError(result.error.message);
    }

    const counts: Record<string, number> = {};
    for (const item of items.data ?? []) {
      const key = (item as { match_status: string | null }).match_status ?? "unmatched";
      counts[key] = (counts[key] ?? 0) + 1;
    }

    const payload = {
      session,
      pages: pages.data ?? [],
      reference_files: references.data ?? [],
      item_counts: counts,
      item_total: (items.data ?? []).length,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
