-- 1) Restrict maintenance tables to authenticated users
DROP POLICY IF EXISTS "maintenance_receipts_public_read" ON public.maintenance_receipts;
DROP POLICY IF EXISTS "maintenance_items_public_read" ON public.maintenance_items;

CREATE POLICY "maintenance_receipts_auth_read" ON public.maintenance_receipts
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "maintenance_items_auth_read" ON public.maintenance_items
  FOR SELECT TO authenticated USING (true);

REVOKE ALL ON public.maintenance_receipts FROM anon;
REVOKE ALL ON public.maintenance_items FROM anon;

-- 2) Owner-scope the maintenance-receipts bucket policies
DROP POLICY IF EXISTS "maint_receipts_auth_read" ON storage.objects;
DROP POLICY IF EXISTS "maint_receipts_auth_insert" ON storage.objects;
DROP POLICY IF EXISTS "maint_receipts_auth_update" ON storage.objects;
DROP POLICY IF EXISTS "maint_receipts_auth_delete" ON storage.objects;

CREATE POLICY "maint_receipts_owner_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'maintenance-receipts'
    AND EXISTS (
      SELECT 1 FROM public.reconciliation_sessions s
      WHERE s.owner_id = auth.uid()
        AND s.id::text = (storage.foldername(name))[1]
    )
  );

CREATE POLICY "maint_receipts_owner_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'maintenance-receipts'
    AND EXISTS (
      SELECT 1 FROM public.reconciliation_sessions s
      WHERE s.owner_id = auth.uid()
        AND s.id::text = (storage.foldername(name))[1]
    )
  );

CREATE POLICY "maint_receipts_owner_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'maintenance-receipts'
    AND EXISTS (
      SELECT 1 FROM public.reconciliation_sessions s
      WHERE s.owner_id = auth.uid()
        AND s.id::text = (storage.foldername(name))[1]
    )
  )
  WITH CHECK (
    bucket_id = 'maintenance-receipts'
    AND EXISTS (
      SELECT 1 FROM public.reconciliation_sessions s
      WHERE s.owner_id = auth.uid()
        AND s.id::text = (storage.foldername(name))[1]
    )
  );

CREATE POLICY "maint_receipts_owner_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'maintenance-receipts'
    AND EXISTS (
      SELECT 1 FROM public.reconciliation_sessions s
      WHERE s.owner_id = auth.uid()
        AND s.id::text = (storage.foldername(name))[1]
    )
  );

-- 3) Authenticated-only read policy for the Receipts bucket (going private)
DROP POLICY IF EXISTS "receipts_auth_read" ON storage.objects;
CREATE POLICY "receipts_auth_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'Receipts');