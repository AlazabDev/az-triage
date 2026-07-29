CREATE TABLE public.maintenance_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_code text NOT NULL UNIQUE,
  pdf_page integer,
  receipt_date date,
  branch text,
  items_count integer NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.maintenance_receipts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.maintenance_receipts TO authenticated;
GRANT ALL ON public.maintenance_receipts TO service_role;

ALTER TABLE public.maintenance_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "maintenance_receipts_public_read" ON public.maintenance_receipts FOR SELECT USING (true);
CREATE POLICY "maintenance_receipts_admin_write" ON public.maintenance_receipts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.maintenance_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_code text NOT NULL REFERENCES public.maintenance_receipts(receipt_code) ON DELETE CASCADE,
  item_index integer NOT NULL DEFAULT 0,
  item_date date,
  branch text,
  description text NOT NULL,
  unit text,
  quantity numeric,
  unit_price numeric,
  total numeric,
  status text NOT NULL DEFAULT 'مؤكد',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.maintenance_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.maintenance_items TO authenticated;
GRANT ALL ON public.maintenance_items TO service_role;

ALTER TABLE public.maintenance_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "maintenance_items_public_read" ON public.maintenance_items FOR SELECT USING (true);
CREATE POLICY "maintenance_items_admin_write" ON public.maintenance_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_maintenance_items_receipt ON public.maintenance_items(receipt_code);

CREATE TRIGGER update_maintenance_receipts_updated_at BEFORE UPDATE ON public.maintenance_receipts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_maintenance_items_updated_at BEFORE UPDATE ON public.maintenance_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();