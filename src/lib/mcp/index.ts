import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listReconciliationSessions from "./tools/list-reconciliation-sessions";
import getReconciliationSession from "./tools/get-reconciliation-session";
import listReceiptItems from "./tools/list-receipt-items";
import reviewReceiptItem from "./tools/review-receipt-item";
import searchMaintenanceItems from "./tools/search-maintenance-items";

// The OAuth issuer must be the direct Supabase host, built from the project ref
// (Vite inlines this literal at build time, so the entry stays import-safe).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "aztriage",
  title: "AzTriage",
  version: "0.1.0",
  instructions:
    "Tools for AzTriage maintenance receipt reconciliation (الفرز والمطابقة). Use list_reconciliation_sessions to find sessions, get_reconciliation_session for a session's pages and match counts, list_receipt_items to inspect extracted items, review_receipt_item to record a review decision, and search_maintenance_items to look up the maintenance reference dataset.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listReconciliationSessions,
    getReconciliationSession,
    listReceiptItems,
    reviewReceiptItem,
    searchMaintenanceItems,
  ],
});
