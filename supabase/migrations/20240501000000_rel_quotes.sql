-- ============================================================
-- Relations: Quotes / Angebote
-- ============================================================

-- Status-Enum
DO $$ BEGIN
  CREATE TYPE rel_quote_status AS ENUM ('draft','sent','accepted','rejected','expired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Tabelle
CREATE TABLE IF NOT EXISTS rel_quotes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES rel_projects(id) ON DELETE CASCADE,
  created_by  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       text NOT NULL,
  description text,
  items       jsonb NOT NULL DEFAULT '[]',
  subtotal    numeric(10,2) NOT NULL DEFAULT 0,
  tax_rate    numeric(5,2)  NOT NULL DEFAULT 19.00,
  tax_amount  numeric(10,2) NOT NULL DEFAULT 0,
  total       numeric(10,2) NOT NULL DEFAULT 0,
  currency    text NOT NULL DEFAULT 'EUR',
  status      rel_quote_status NOT NULL DEFAULT 'draft',
  valid_until timestamptz,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_rel_quotes_project ON rel_quotes(project_id);
CREATE INDEX IF NOT EXISTS idx_rel_quotes_status  ON rel_quotes(status);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_rel_quotes_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rel_quotes_updated_at ON rel_quotes;
CREATE TRIGGER trg_rel_quotes_updated_at
  BEFORE UPDATE ON rel_quotes
  FOR EACH ROW EXECUTE FUNCTION update_rel_quotes_updated_at();

-- RLS
ALTER TABLE rel_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quotes_select" ON rel_quotes FOR SELECT USING (
  created_by = auth.uid()
  OR project_id IN (
    SELECT project_id FROM rel_project_members WHERE user_id = auth.uid()
  )
  OR project_id IN (
    SELECT id FROM rel_projects WHERE user_id = auth.uid()
  )
);

CREATE POLICY "quotes_insert" ON rel_quotes FOR INSERT WITH CHECK (
  created_by = auth.uid()
);

CREATE POLICY "quotes_update" ON rel_quotes FOR UPDATE USING (
  created_by = auth.uid()
  OR project_id IN (
    SELECT id FROM rel_projects WHERE user_id = auth.uid()
  )
);

CREATE POLICY "quotes_delete" ON rel_quotes FOR DELETE USING (
  created_by = auth.uid()
  OR project_id IN (
    SELECT id FROM rel_projects WHERE user_id = auth.uid()
  )
);
