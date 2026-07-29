CREATE POLICY "maint_receipts_auth_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'maintenance-receipts');
CREATE POLICY "maint_receipts_auth_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'maintenance-receipts');
CREATE POLICY "maint_receipts_auth_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'maintenance-receipts') WITH CHECK (bucket_id = 'maintenance-receipts');
CREATE POLICY "maint_receipts_auth_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'maintenance-receipts');