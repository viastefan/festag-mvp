import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://xsdkoepwuvpuroijjain.supabase.co'

/**
 * Auto-Migration: erstellt alle Relations-Tabellen falls sie nicht existieren.
 * Nutzt den Service Role Key um RLS zu umgehen.
 *
 * Strategie:
 * 1. Pruefen ob Tabellen bereits existieren (via Service Role Select)
 * 2. Falls nicht: SQL ueber den Supabase SQL HTTP Endpoint ausfuehren
 */
export async function POST() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY nicht konfiguriert' },
      { status: 500 }
    )
  }

  const sb = createClient(SUPABASE_URL, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  try {
    // Pruefen ob alle Tabellen existieren
    const checks = await checkAllTables(sb)

    if (checks.allExist) {
      return NextResponse.json({ status: 'ready', message: 'Alle Tabellen vorhanden' })
    }

    // Migration ausfuehren
    const migrationSql = buildMigrationSql(checks)
    const result = await executeSql(migrationSql, serviceKey)

    if (!result.success) {
      return NextResponse.json(
        { status: 'error', message: 'Migration fehlgeschlagen', error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({ status: 'ready', message: 'Migration erfolgreich ausgefuehrt' })
  } catch (err) {
    console.error('[relations/setup] Fehler:', err)
    return NextResponse.json(
      { error: 'Setup fehlgeschlagen', details: String(err) },
      { status: 500 }
    )
  }
}

interface TableChecks {
  allExist: boolean
  rel_projects: boolean
  rel_project_members: boolean
  rel_messages: boolean
  rel_documents: boolean
  rel_quotes: boolean
}

async function checkAllTables(sb: ReturnType<typeof createClient>): Promise<TableChecks> {
  const tableNames = [
    'rel_projects',
    'rel_project_members',
    'rel_messages',
    'rel_documents',
    'rel_quotes',
  ] as const

  const results: Record<string, boolean> = {}

  for (const table of tableNames) {
    // Service Role umgeht RLS, also sollte ein Select funktionieren
    // auch wenn die Tabelle leer ist. Fehler = Tabelle existiert nicht.
    const { error } = await sb.from(table).select('id').limit(1)
    results[table] = !error
  }

  return {
    allExist: Object.values(results).every(Boolean),
    rel_projects: results.rel_projects,
    rel_project_members: results.rel_project_members,
    rel_messages: results.rel_messages,
    rel_documents: results.rel_documents,
    rel_quotes: results.rel_quotes,
  }
}

/**
 * Fuehrt SQL ueber verschiedene Methoden aus:
 * 1. Supabase /sql Endpoint (verfuegbar seit 2024)
 * 2. Fallback: pg-meta Endpoint
 * 3. Fallback: Einzelne Statements ueber fetch
 */
async function executeSql(
  sql: string,
  serviceKey: string
): Promise<{ success: boolean; error?: string }> {
  // Methode 1: Supabase SQL Endpoint (/sql)
  // Verfuegbar in hosted Supabase seit Mitte 2024
  try {
    const res = await fetch(`${SUPABASE_URL}/sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ query: sql }),
    })

    if (res.ok) {
      return { success: true }
    }

    const text = await res.text()
    // Wenn der Endpoint nicht existiert, versuche Fallback
    if (res.status === 404 || res.status === 400) {
      console.log('[relations/setup] /sql Endpoint nicht verfuegbar, versuche Fallback...')
    } else {
      return { success: false, error: `SQL Endpoint Fehler (${res.status}): ${text}` }
    }
  } catch (err) {
    console.log('[relations/setup] /sql Endpoint Fehler:', err)
  }

  // Methode 2: pg-meta query Endpoint
  try {
    const projectRef = SUPABASE_URL.replace('https://', '').replace('.supabase.co', '')
    const res = await fetch(`https://${projectRef}.supabase.co/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ query: sql }),
    })

    if (res.ok) {
      return { success: true }
    }
  } catch (err) {
    console.log('[relations/setup] RPC Fallback Fehler:', err)
  }

  // Methode 3: Einzelne SQL-Bloecke ueber /sql versuchen
  // Falls das gesamte SQL zu gross war, versuche es in Bloecken
  const blocks = sql.split('\n\n-- ===').filter((b) => b.trim())
  let lastError = ''

  for (const block of blocks) {
    const cleanBlock = block.startsWith(' ') ? '-- ===' + block : block
    try {
      const res = await fetch(`${SUPABASE_URL}/sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ query: cleanBlock }),
      })

      if (!res.ok) {
        const text = await res.text()
        lastError = text
        // Ignoriere "already exists" Fehler
        if (!text.includes('already exists') && !text.includes('duplicate')) {
          console.warn(`[relations/setup] Block-Fehler: ${text}`)
        }
      }
    } catch (err) {
      lastError = String(err)
    }
  }

  // Wenn wir hier ankommen, konnten wir das SQL nicht ausfuehren
  return {
    success: false,
    error: `Kein SQL-Ausfuehrungsmethode verfuegbar. Bitte erstelle eine "exec_sql" Funktion im Supabase SQL Editor:
CREATE OR REPLACE FUNCTION exec_sql(query text) RETURNS void AS $$ BEGIN EXECUTE query; END; $$ LANGUAGE plpgsql SECURITY DEFINER;
Letzter Fehler: ${lastError}`,
  }
}

function buildMigrationSql(checks: TableChecks): string {
  // Immer alle Enums und Tabellen einschliessen (IF NOT EXISTS macht es idempotent)
  return `
-- === ENUMS ===
DO $$ BEGIN CREATE TYPE rel_project_status AS ENUM ('draft', 'active', 'paused', 'completed', 'archived'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE rel_member_role AS ENUM ('owner', 'admin', 'member', 'viewer'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE rel_invite_status AS ENUM ('pending', 'accepted', 'declined'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE rel_message_type AS ENUM ('text', 'file', 'system'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE rel_document_category AS ENUM ('invoice', 'quote', 'contract', 'other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE rel_quote_status AS ENUM ('draft', 'sent', 'accepted', 'rejected', 'expired'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- === TABELLEN ===
CREATE TABLE IF NOT EXISTS rel_projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  status      rel_project_status NOT NULL DEFAULT 'draft',
  budget_min  NUMERIC(12,2),
  budget_max  NUMERIC(12,2),
  currency    TEXT DEFAULT 'EUR',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rel_project_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES rel_projects(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  role          rel_member_role NOT NULL DEFAULT 'member',
  invited_email TEXT,
  status        rel_invite_status NOT NULL DEFAULT 'pending',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rel_messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID NOT NULL REFERENCES rel_projects(id) ON DELETE CASCADE,
  sender_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content      TEXT NOT NULL,
  message_type rel_message_type NOT NULL DEFAULT 'text',
  file_url     TEXT,
  file_name    TEXT,
  read_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rel_documents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID NOT NULL REFERENCES rel_projects(id) ON DELETE CASCADE,
  uploaded_by  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  file_url     TEXT NOT NULL,
  file_type    TEXT NOT NULL,
  file_size    BIGINT NOT NULL DEFAULT 0,
  category     rel_document_category NOT NULL DEFAULT 'other',
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rel_quotes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES rel_projects(id) ON DELETE CASCADE,
  created_by  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  items       JSONB NOT NULL DEFAULT '[]',
  subtotal    NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax_rate    NUMERIC(5,2)  NOT NULL DEFAULT 19.00,
  tax_amount  NUMERIC(10,2) NOT NULL DEFAULT 0,
  total       NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency    TEXT NOT NULL DEFAULT 'EUR',
  status      rel_quote_status NOT NULL DEFAULT 'draft',
  valid_until TIMESTAMPTZ,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- === INDEXES ===
CREATE INDEX IF NOT EXISTS idx_rel_projects_user_id ON rel_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_rel_project_members_project ON rel_project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_rel_project_members_user ON rel_project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_rel_messages_project_created ON rel_messages(project_id, created_at);
CREATE INDEX IF NOT EXISTS idx_rel_messages_sender ON rel_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_rel_documents_project ON rel_documents(project_id);
CREATE INDEX IF NOT EXISTS idx_rel_documents_category ON rel_documents(project_id, category);
CREATE INDEX IF NOT EXISTS idx_rel_quotes_project ON rel_quotes(project_id);
CREATE INDEX IF NOT EXISTS idx_rel_quotes_status ON rel_quotes(status);

-- === TRIGGER FUNCTIONS ===
CREATE OR REPLACE FUNCTION update_rel_projects_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION update_rel_quotes_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_rel_projects_updated_at') THEN
    CREATE TRIGGER trg_rel_projects_updated_at BEFORE UPDATE ON rel_projects FOR EACH ROW EXECUTE FUNCTION update_rel_projects_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_rel_quotes_updated_at') THEN
    CREATE TRIGGER trg_rel_quotes_updated_at BEFORE UPDATE ON rel_quotes FOR EACH ROW EXECUTE FUNCTION update_rel_quotes_updated_at();
  END IF;
END $$;

-- === RLS ===
ALTER TABLE rel_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE rel_project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE rel_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE rel_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE rel_quotes ENABLE ROW LEVEL SECURITY;

-- === RLS POLICIES ===
-- rel_projects
DO $$ BEGIN CREATE POLICY "Users can view own projects" ON rel_projects FOR SELECT USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Members can view projects" ON rel_projects FOR SELECT USING (EXISTS (SELECT 1 FROM rel_project_members WHERE rel_project_members.project_id = rel_projects.id AND rel_project_members.user_id = auth.uid() AND rel_project_members.status = 'accepted')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can create projects" ON rel_projects FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can update own projects" ON rel_projects FOR UPDATE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can delete own projects" ON rel_projects FOR DELETE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- rel_project_members
DO $$ BEGIN CREATE POLICY "Project owner can manage members" ON rel_project_members FOR ALL USING (EXISTS (SELECT 1 FROM rel_projects WHERE rel_projects.id = rel_project_members.project_id AND rel_projects.user_id = auth.uid())); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Members can view own membership" ON rel_project_members FOR SELECT USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- rel_messages
DO $$ BEGIN CREATE POLICY "Project members can view messages" ON rel_messages FOR SELECT USING (EXISTS (SELECT 1 FROM rel_projects WHERE rel_projects.id = rel_messages.project_id AND rel_projects.user_id = auth.uid()) OR EXISTS (SELECT 1 FROM rel_project_members WHERE rel_project_members.project_id = rel_messages.project_id AND rel_project_members.user_id = auth.uid() AND rel_project_members.status = 'accepted')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Project members can send messages" ON rel_messages FOR INSERT WITH CHECK (auth.uid() = sender_id AND (EXISTS (SELECT 1 FROM rel_projects WHERE rel_projects.id = rel_messages.project_id AND rel_projects.user_id = auth.uid()) OR EXISTS (SELECT 1 FROM rel_project_members WHERE rel_project_members.project_id = rel_messages.project_id AND rel_project_members.user_id = auth.uid() AND rel_project_members.status = 'accepted'))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Members can update messages in their projects" ON rel_messages FOR UPDATE USING (EXISTS (SELECT 1 FROM rel_projects WHERE rel_projects.id = rel_messages.project_id AND rel_projects.user_id = auth.uid()) OR EXISTS (SELECT 1 FROM rel_project_members WHERE rel_project_members.project_id = rel_messages.project_id AND rel_project_members.user_id = auth.uid() AND rel_project_members.status = 'accepted')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- rel_documents
DO $$ BEGIN CREATE POLICY "Project members can view documents" ON rel_documents FOR SELECT USING (EXISTS (SELECT 1 FROM rel_projects WHERE rel_projects.id = rel_documents.project_id AND rel_projects.user_id = auth.uid()) OR EXISTS (SELECT 1 FROM rel_project_members WHERE rel_project_members.project_id = rel_documents.project_id AND rel_project_members.user_id = auth.uid() AND rel_project_members.status = 'accepted')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Project members can upload documents" ON rel_documents FOR INSERT WITH CHECK (auth.uid() = uploaded_by AND (EXISTS (SELECT 1 FROM rel_projects WHERE rel_projects.id = rel_documents.project_id AND rel_projects.user_id = auth.uid()) OR EXISTS (SELECT 1 FROM rel_project_members WHERE rel_project_members.project_id = rel_documents.project_id AND rel_project_members.user_id = auth.uid() AND rel_project_members.status = 'accepted'))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Project owners can delete documents" ON rel_documents FOR DELETE USING (EXISTS (SELECT 1 FROM rel_projects WHERE rel_projects.id = rel_documents.project_id AND rel_projects.user_id = auth.uid()) OR auth.uid() = uploaded_by); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- rel_quotes
DO $$ BEGIN CREATE POLICY "quotes_select" ON rel_quotes FOR SELECT USING (created_by = auth.uid() OR project_id IN (SELECT project_id FROM rel_project_members WHERE user_id = auth.uid()) OR project_id IN (SELECT id FROM rel_projects WHERE user_id = auth.uid())); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "quotes_insert" ON rel_quotes FOR INSERT WITH CHECK (created_by = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "quotes_update" ON rel_quotes FOR UPDATE USING (created_by = auth.uid() OR project_id IN (SELECT id FROM rel_projects WHERE user_id = auth.uid())); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "quotes_delete" ON rel_quotes FOR DELETE USING (created_by = auth.uid() OR project_id IN (SELECT id FROM rel_projects WHERE user_id = auth.uid())); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- === REALTIME ===
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE rel_messages; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
`.trim()
}
