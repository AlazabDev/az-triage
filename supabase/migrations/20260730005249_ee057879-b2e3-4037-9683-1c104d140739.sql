DROP POLICY IF EXISTS "receipts_auth_read" ON storage.objects;

CREATE POLICY "receipts_staff_read"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'Receipts'
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'moderator'::public.app_role)
    )
  );