DROP POLICY IF EXISTS "maintenance_receipts_auth_read" ON public.maintenance_receipts;
DROP POLICY IF EXISTS "maintenance_items_auth_read" ON public.maintenance_items;

CREATE POLICY "maintenance_receipts_staff_read" ON public.maintenance_receipts
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'moderator'::app_role)
  );

CREATE POLICY "maintenance_items_staff_read" ON public.maintenance_items
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'moderator'::app_role)
  );