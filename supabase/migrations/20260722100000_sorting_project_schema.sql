-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Document Embeddings Table
CREATE TABLE IF NOT EXISTS public.document_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.receipt_documents(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES public.reconciliation_sessions(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding vector(3072), -- text-embedding-3-large default dimension is 3072
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Item Embeddings Table
CREATE TABLE IF NOT EXISTS public.item_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES public.receipt_items(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES public.reconciliation_sessions(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding vector(3072),
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS and Permissions
GRANT ALL ON public.document_embeddings TO authenticated;
GRANT ALL ON public.document_embeddings TO service_role;
GRANT ALL ON public.item_embeddings TO authenticated;
GRANT ALL ON public.item_embeddings TO service_role;

ALTER TABLE public.document_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners manage document_embeddings" ON public.document_embeddings
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.reconciliation_sessions s WHERE s.id = session_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.reconciliation_sessions s WHERE s.id = session_id AND s.owner_id = auth.uid()));

CREATE POLICY "owners manage item_embeddings" ON public.item_embeddings
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.reconciliation_sessions s WHERE s.id = session_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.reconciliation_sessions s WHERE s.id = session_id AND s.owner_id = auth.uid()));

-- HNSW Indexes for Vector Search
CREATE INDEX ON public.document_embeddings USING hnsw (embedding vector_cosine_ops);
CREATE INDEX ON public.item_embeddings USING hnsw (embedding vector_cosine_ops);
