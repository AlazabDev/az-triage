
-- Reconciliation sessions
CREATE TABLE public.reconciliation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  branch TEXT,
  session_date DATE,
  status TEXT NOT NULL DEFAULT 'draft',
  share_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  is_public BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reconciliation_sessions TO authenticated;
GRANT SELECT ON public.reconciliation_sessions TO anon;
GRANT ALL ON public.reconciliation_sessions TO service_role;
ALTER TABLE public.reconciliation_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners manage sessions" ON public.reconciliation_sessions
  FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "public shared sessions readable" ON public.reconciliation_sessions
  FOR SELECT TO anon USING (is_public = true);

-- Receipt documents (uploaded PDFs / image files)
CREATE TABLE public.receipt_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.reconciliation_sessions(id) ON DELETE CASCADE,
  document_number INT NOT NULL,
  original_filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  page_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, document_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.receipt_documents TO authenticated;
GRANT SELECT ON public.receipt_documents TO anon;
GRANT ALL ON public.receipt_documents TO service_role;
ALTER TABLE public.receipt_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners manage receipt_documents" ON public.receipt_documents
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.reconciliation_sessions s WHERE s.id = session_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.reconciliation_sessions s WHERE s.id = session_id AND s.owner_id = auth.uid()));
CREATE POLICY "public read receipt_documents" ON public.receipt_documents
  FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.reconciliation_sessions s WHERE s.id = session_id AND s.is_public = true));

-- Receipt pages (each page = one إذن)
CREATE TABLE public.receipt_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.reconciliation_sessions(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.receipt_documents(id) ON DELETE CASCADE,
  page_index INT NOT NULL,
  receipt_code TEXT NOT NULL, -- e.g. "5-02"
  image_path TEXT NOT NULL,
  branch TEXT,
  receipt_date DATE,
  supplier TEXT,
  invoice_number TEXT,
  review_status TEXT NOT NULL DEFAULT 'pending', -- pending | confirmed | needs_review | corrected
  reviewer_note TEXT,
  extraction_status TEXT NOT NULL DEFAULT 'queued', -- queued | processing | done | failed
  extraction_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(document_id, page_index)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.receipt_pages TO authenticated;
GRANT SELECT ON public.receipt_pages TO anon;
GRANT ALL ON public.receipt_pages TO service_role;
ALTER TABLE public.receipt_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners manage receipt_pages" ON public.receipt_pages
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.reconciliation_sessions s WHERE s.id = session_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.reconciliation_sessions s WHERE s.id = session_id AND s.owner_id = auth.uid()));
CREATE POLICY "public read receipt_pages" ON public.receipt_pages
  FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.reconciliation_sessions s WHERE s.id = session_id AND s.is_public = true));

-- Receipt items (extracted line items)
CREATE TABLE public.receipt_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.reconciliation_sessions(id) ON DELETE CASCADE,
  page_id UUID NOT NULL REFERENCES public.receipt_pages(id) ON DELETE CASCADE,
  item_index INT NOT NULL,
  item_code TEXT NOT NULL, -- e.g. "4-12-01"
  description TEXT NOT NULL,
  unit TEXT,
  quantity NUMERIC,
  unit_price NUMERIC,
  total NUMERIC,
  match_status TEXT NOT NULL DEFAULT 'unmatched', -- confirmed | partial | needs_review | not_in_receipt | unmatched
  matched_excel_row JSONB,
  match_score NUMERIC,
  reviewer_note TEXT,
  corrected_description TEXT,
  ai_raw JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(page_id, item_index)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.receipt_items TO authenticated;
GRANT SELECT ON public.receipt_items TO anon;
GRANT ALL ON public.receipt_items TO service_role;
ALTER TABLE public.receipt_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners manage receipt_items" ON public.receipt_items
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.reconciliation_sessions s WHERE s.id = session_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.reconciliation_sessions s WHERE s.id = session_id AND s.owner_id = auth.uid()));
CREATE POLICY "public read receipt_items" ON public.receipt_items
  FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.reconciliation_sessions s WHERE s.id = session_id AND s.is_public = true));

-- Excel snapshots (uploaded Excel per session)
CREATE TABLE public.excel_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.reconciliation_sessions(id) ON DELETE CASCADE,
  original_filename TEXT NOT NULL,
  storage_path TEXT,
  rows JSONB NOT NULL DEFAULT '[]'::jsonb,
  columns JSONB NOT NULL DEFAULT '[]'::jsonb,
  row_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.excel_snapshots TO authenticated;
GRANT SELECT ON public.excel_snapshots TO anon;
GRANT ALL ON public.excel_snapshots TO service_role;
ALTER TABLE public.excel_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners manage excel_snapshots" ON public.excel_snapshots
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.reconciliation_sessions s WHERE s.id = session_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.reconciliation_sessions s WHERE s.id = session_id AND s.owner_id = auth.uid()));
CREATE POLICY "public read excel_snapshots" ON public.excel_snapshots
  FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.reconciliation_sessions s WHERE s.id = session_id AND s.is_public = true));

-- updated_at triggers
CREATE TRIGGER trg_recon_sessions_updated
  BEFORE UPDATE ON public.reconciliation_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_receipt_pages_updated
  BEFORE UPDATE ON public.receipt_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_receipt_items_updated
  BEFORE UPDATE ON public.receipt_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_receipt_pages_session ON public.receipt_pages(session_id);
CREATE INDEX idx_receipt_items_session ON public.receipt_items(session_id);
CREATE INDEX idx_receipt_items_page ON public.receipt_items(page_id);
CREATE INDEX idx_recon_share_token ON public.reconciliation_sessions(share_token) WHERE is_public = true;
