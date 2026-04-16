-- Task 24 — pgvector for semantic search
--
-- FIX-08 (P1): the original task spec used vector(384) for the
-- `all-MiniLM-L6-v2` model, which is English-only. For a bilingual
-- Arabic/English researcher directory we go with `intfloat/multilingual-e5-base`
-- (768 dim, ★★★★ multilingual quality, ~1.1 GB on disk).
--
-- If you later switch to `BAAI/bge-m3` (1024 dim) you must:
--   1. ALTER TABLE researchers DROP COLUMN bio_embedding;
--   2. ALTER TABLE researchers ADD COLUMN bio_embedding vector(1024);
--   3. Drop and recreate the IVFFlat / HNSW index.
--   4. Re-run the embedding pipeline (pipelines/jobs/embed_researchers.py).

CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE public.researchers
  ADD COLUMN IF NOT EXISTS bio_embedding vector(768);

-- HNSW gives sub-linear ANN with no training step (unlike IVFFlat).
-- m=16, ef_construction=64 is the pgvector default that balances build time vs recall.
-- Cosine distance matches the e5 model's normalised output.
CREATE INDEX IF NOT EXISTS idx_researchers_bio_embedding_hnsw
  ON public.researchers
  USING hnsw (bio_embedding vector_cosine_ops);
