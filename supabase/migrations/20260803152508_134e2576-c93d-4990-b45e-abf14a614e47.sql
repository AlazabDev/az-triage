-- 1) Allow logged-in users (and RLS policies) to call the role checker again
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- 2) Fix broken storage policies on maintenance-receipts:
--    they compared the session id to the session NAME instead of the object path.
DROP POLICY IF EXISTS maint_receipts_owner_insert ON storage.objects;
DROP POLICY IF EXISTS maint_receipts_owner_read ON storage.objects;
DROP POLICY IF EXISTS maint_receipts_owner_update ON storage.objects;
DROP POLICY IF EXISTS maint_receipts_owner_delete ON storage.objects;

CREATE POLICY maint_receipts_owner_insert ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'maintenance-receipts'
  AND EXISTS (
    SELECT 1 FROM public.reconciliation_sessions s
    WHERE s.owner_id = auth.uid()
      AND s.id::text = (storage.foldername(storage.objects.name))[1]
  )
);

CREATE POLICY maint_receipts_owner_read ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'maintenance-receipts'
  AND EXISTS (
    SELECT 1 FROM public.reconciliation_sessions s
    WHERE s.owner_id = auth.uid()
      AND s.id::text = (storage.foldername(storage.objects.name))[1]
  )
);

CREATE POLICY maint_receipts_owner_update ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'maintenance-receipts'
  AND EXISTS (
    SELECT 1 FROM public.reconciliation_sessions s
    WHERE s.owner_id = auth.uid()
      AND s.id::text = (storage.foldername(storage.objects.name))[1]
  )
)
WITH CHECK (
  bucket_id = 'maintenance-receipts'
  AND EXISTS (
    SELECT 1 FROM public.reconciliation_sessions s
    WHERE s.owner_id = auth.uid()
      AND s.id::text = (storage.foldername(storage.objects.name))[1]
  )
);

CREATE POLICY maint_receipts_owner_delete ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'maintenance-receipts'
  AND EXISTS (
    SELECT 1 FROM public.reconciliation_sessions s
    WHERE s.owner_id = auth.uid()
      AND s.id::text = (storage.foldername(storage.objects.name))[1]
  )
);

-- 3) Store the reference file (Excel / PDF) of a session so the review screen can show it
ALTER TABLE public.excel_snapshots
  ADD COLUMN IF NOT EXISTS file_kind text NOT NULL DEFAULT 'excel';