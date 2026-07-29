-- 1) Remove anon direct access to shared reconciliation data
DROP POLICY IF EXISTS "public shared sessions readable" ON public.reconciliation_sessions;
DROP POLICY IF EXISTS "public read receipt_documents" ON public.receipt_documents;
DROP POLICY IF EXISTS "public read receipt_pages" ON public.receipt_pages;
DROP POLICY IF EXISTS "public read receipt_items" ON public.receipt_items;
DROP POLICY IF EXISTS "public read excel_snapshots" ON public.excel_snapshots;

REVOKE ALL ON public.reconciliation_sessions FROM anon;
REVOKE ALL ON public.receipt_documents FROM anon;
REVOKE ALL ON public.receipt_pages FROM anon;
REVOKE ALL ON public.receipt_items FROM anon;
REVOKE ALL ON public.excel_snapshots FROM anon;

GRANT ALL ON public.reconciliation_sessions TO service_role;
GRANT ALL ON public.receipt_documents TO service_role;
GRANT ALL ON public.receipt_pages TO service_role;
GRANT ALL ON public.receipt_items TO service_role;
GRANT ALL ON public.excel_snapshots TO service_role;

-- 2) Hide visitor_phone from public readers via column-level grants
REVOKE SELECT ON public.image_comments FROM anon, authenticated;
GRANT SELECT (id, project_id, image_id, visitor_name, text, position_x, position_y, status, session_id, created_at)
  ON public.image_comments TO anon, authenticated;
GRANT INSERT ON public.image_comments TO anon, authenticated;
GRANT ALL ON public.image_comments TO service_role;

-- 3) Lock down SECURITY DEFINER functions
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;