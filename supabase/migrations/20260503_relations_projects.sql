-- Relations: Projects & Project Members
-- Phase 2 of Relations Panel

-- Status enum for relation projects
CREATE TYPE rel_project_status AS ENUM ('draft', 'active', 'paused', 'completed', 'archived');

-- Member role enum
CREATE TYPE rel_member_role AS ENUM ('owner', 'admin', 'member', 'viewer');

-- Member invite status
CREATE TYPE rel_invite_status AS ENUM ('pending', 'accepted', 'declined');

-- ═══ rel_projects ═══
CREATE TABLE rel_projects (
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

-- Index for fast user lookups
CREATE INDEX idx_rel_projects_user_id ON rel_projects(user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_rel_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_rel_projects_updated_at
  BEFORE UPDATE ON rel_projects
  FOR EACH ROW
  EXECUTE FUNCTION update_rel_projects_updated_at();

-- ═══ rel_project_members ═══
CREATE TABLE rel_project_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES rel_projects(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  role          rel_member_role NOT NULL DEFAULT 'member',
  invited_email TEXT,
  status        rel_invite_status NOT NULL DEFAULT 'pending',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rel_project_members_project ON rel_project_members(project_id);
CREATE INDEX idx_rel_project_members_user    ON rel_project_members(user_id);

-- ═══ RLS Policies ═══
ALTER TABLE rel_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE rel_project_members ENABLE ROW LEVEL SECURITY;

-- Users can see their own projects
CREATE POLICY "Users can view own projects"
  ON rel_projects FOR SELECT
  USING (auth.uid() = user_id);

-- Users can see projects where they are a member
CREATE POLICY "Members can view projects"
  ON rel_projects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM rel_project_members
      WHERE rel_project_members.project_id = rel_projects.id
        AND rel_project_members.user_id = auth.uid()
        AND rel_project_members.status = 'accepted'
    )
  );

-- Users can insert their own projects
CREATE POLICY "Users can create projects"
  ON rel_projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own projects
CREATE POLICY "Users can update own projects"
  ON rel_projects FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own projects
CREATE POLICY "Users can delete own projects"
  ON rel_projects FOR DELETE
  USING (auth.uid() = user_id);

-- Members: project owner can manage members
CREATE POLICY "Project owner can manage members"
  ON rel_project_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM rel_projects
      WHERE rel_projects.id = rel_project_members.project_id
        AND rel_projects.user_id = auth.uid()
    )
  );

-- Members can view their own membership
CREATE POLICY "Members can view own membership"
  ON rel_project_members FOR SELECT
  USING (auth.uid() = user_id);
