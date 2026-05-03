-- Relations: Chat & Documents
-- Phase 3 + Phase 4

-- ═══════════════════════════════════
-- PHASE 3: Chat / Messages
-- ═══════════════════════════════════

-- Message type enum
CREATE TYPE rel_message_type AS ENUM ('text', 'file', 'system');

-- ═══ rel_messages ═══
CREATE TABLE rel_messages (
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

-- Index for fast message loading per project (chronological)
CREATE INDEX idx_rel_messages_project_created ON rel_messages(project_id, created_at);
-- Index for unread messages lookup
CREATE INDEX idx_rel_messages_sender ON rel_messages(sender_id);

-- RLS
ALTER TABLE rel_messages ENABLE ROW LEVEL SECURITY;

-- Members can read messages in their projects
CREATE POLICY "Project members can view messages"
  ON rel_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM rel_projects
      WHERE rel_projects.id = rel_messages.project_id
        AND rel_projects.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM rel_project_members
      WHERE rel_project_members.project_id = rel_messages.project_id
        AND rel_project_members.user_id = auth.uid()
        AND rel_project_members.status = 'accepted'
    )
  );

-- Members can send messages in their projects
CREATE POLICY "Project members can send messages"
  ON rel_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND (
      EXISTS (
        SELECT 1 FROM rel_projects
        WHERE rel_projects.id = rel_messages.project_id
          AND rel_projects.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM rel_project_members
        WHERE rel_project_members.project_id = rel_messages.project_id
          AND rel_project_members.user_id = auth.uid()
          AND rel_project_members.status = 'accepted'
      )
    )
  );

-- Members can update their own messages (e.g. read_at)
CREATE POLICY "Members can update messages in their projects"
  ON rel_messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM rel_projects
      WHERE rel_projects.id = rel_messages.project_id
        AND rel_projects.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM rel_project_members
      WHERE rel_project_members.project_id = rel_messages.project_id
        AND rel_project_members.user_id = auth.uid()
        AND rel_project_members.status = 'accepted'
    )
  );

-- Enable Realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE rel_messages;


-- ═══════════════════════════════════
-- PHASE 4: Documents
-- ═══════════════════════════════════

-- Document category enum
CREATE TYPE rel_document_category AS ENUM ('invoice', 'quote', 'contract', 'other');

-- ═══ rel_documents ═══
CREATE TABLE rel_documents (
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

-- Index for fast document lookup per project
CREATE INDEX idx_rel_documents_project ON rel_documents(project_id);
CREATE INDEX idx_rel_documents_category ON rel_documents(project_id, category);

-- RLS
ALTER TABLE rel_documents ENABLE ROW LEVEL SECURITY;

-- Members can view documents in their projects
CREATE POLICY "Project members can view documents"
  ON rel_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM rel_projects
      WHERE rel_projects.id = rel_documents.project_id
        AND rel_projects.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM rel_project_members
      WHERE rel_project_members.project_id = rel_documents.project_id
        AND rel_project_members.user_id = auth.uid()
        AND rel_project_members.status = 'accepted'
    )
  );

-- Members can upload documents
CREATE POLICY "Project members can upload documents"
  ON rel_documents FOR INSERT
  WITH CHECK (
    auth.uid() = uploaded_by
    AND (
      EXISTS (
        SELECT 1 FROM rel_projects
        WHERE rel_projects.id = rel_documents.project_id
          AND rel_projects.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM rel_project_members
        WHERE rel_project_members.project_id = rel_documents.project_id
          AND rel_project_members.user_id = auth.uid()
          AND rel_project_members.status = 'accepted'
      )
    )
  );

-- Project owners can delete documents
CREATE POLICY "Project owners can delete documents"
  ON rel_documents FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM rel_projects
      WHERE rel_projects.id = rel_documents.project_id
        AND rel_projects.user_id = auth.uid()
    )
    OR auth.uid() = uploaded_by
  );

-- ═══ Storage Bucket ═══
-- NOTE: The storage bucket "relations-documents" must be created manually
-- in the Supabase Dashboard under Storage, or via:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('relations-documents', 'relations-documents', false);
--
-- Storage RLS policies should allow authenticated users to upload/read from their project paths.
