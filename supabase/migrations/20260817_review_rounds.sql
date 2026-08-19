-- ─────────────────────────────────────────────────────────────────────────────
-- Review rounds — the loop between "here is the work" and "this is accepted"
--
-- A client sends a PDF with change requests. The work gets done. The client
-- looks at it and is either happy, not happy, or has a question. If they are
-- not happy, that is not a failure state — it is round two, and it has to carry
-- what specifically was wrong so nobody re-reads the whole PDF.
--
-- Without this model the loop lived in people's heads: a task flipped to done,
-- the client complained somewhere, and someone made a new task by hand with no
-- link to what came before. Rounds make the nesting explicit and countable.
-- ─────────────────────────────────────────────────────────────────────────────

do $$ begin
  create type review_round_status as enum (
    'open',               -- submitted, waiting for the reviewer
    'accepted',           -- reviewer is satisfied; the work is done
    'changes_requested',  -- reviewer found problems; a follow-up round opens
    'question',           -- reviewer needs something clarified first
    'withdrawn'           -- submitter pulled it back before a verdict
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type review_finding_status as enum (
    'open', 'fixed', 'wont_fix', 'deferred'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type review_finding_source as enum (
    'document',   -- extracted from an attached file by Tagro
    'reviewer',   -- written by the person reviewing
    'tagro',      -- noticed by Tagro itself
    'submitter'   -- flagged by whoever handed the work over
  );
exception when duplicate_object then null; end $$;

create table if not exists review_rounds (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  task_id uuid references tasks(id) on delete cascade,

  -- Rounds count up per task, so "third time round" is a fact, not a feeling.
  round_number int not null default 1,
  parent_round_id uuid references review_rounds(id) on delete set null,

  submitted_by uuid references auth.users(id) on delete set null,
  reviewer_id uuid references auth.users(id) on delete set null,

  status review_round_status not null default 'open',
  summary text,                       -- what was handed over, in one sentence
  verdict_note text,                  -- what the reviewer said when closing it

  -- The document that started this round, when there was one.
  source_asset_id uuid references project_assets(id) on delete set null,

  -- The decision that carries this round to the reviewer's board.
  decision_id uuid references decisions(id) on delete set null,

  submitted_at timestamptz not null default now(),
  resolved_at timestamptz,
  due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_review_rounds_task on review_rounds(task_id, round_number desc);
create index if not exists idx_review_rounds_reviewer on review_rounds(reviewer_id, status);
create index if not exists idx_review_rounds_project on review_rounds(project_id, status);

-- One open round per task: a second submission while one is pending would give
-- the reviewer two versions of the truth.
create unique index if not exists uniq_review_round_open_per_task
  on review_rounds(task_id) where status = 'open';

create table if not exists review_findings (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references review_rounds(id) on delete cascade,
  ordinal int not null default 0,

  title text not null,
  detail text,
  status review_finding_status not null default 'open',
  source review_finding_source not null default 'reviewer',

  -- Where it came from in the document, so the dev can find it again.
  asset_id uuid references project_assets(id) on delete set null,
  location_hint text,

  -- A finding can spawn its own task when it is big enough to schedule.
  task_id uuid references tasks(id) on delete set null,

  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  resolution_note text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_review_findings_round on review_findings(round_id, ordinal);
create index if not exists idx_review_findings_open on review_findings(round_id) where status = 'open';

-- ── Row level security ──────────────────────────────────────────────────────
alter table review_rounds enable row level security;
alter table review_findings enable row level security;

drop policy if exists review_rounds_project_read on review_rounds;
create policy review_rounds_project_read on review_rounds for select
  using (exists (
    select 1 from projects p
    where p.id = review_rounds.project_id
      and (p.user_id = auth.uid() or p.client_id = auth.uid() or is_workspace_member(p.workspace_id))
  ));

drop policy if exists review_rounds_participant_write on review_rounds;
create policy review_rounds_participant_write on review_rounds for all
  using (
    submitted_by = auth.uid() or reviewer_id = auth.uid()
    or exists (select 1 from projects p where p.id = review_rounds.project_id and p.user_id = auth.uid())
  )
  with check (
    submitted_by = auth.uid() or reviewer_id = auth.uid()
    or exists (select 1 from projects p where p.id = review_rounds.project_id and p.user_id = auth.uid())
  );

drop policy if exists review_findings_round_read on review_findings;
create policy review_findings_round_read on review_findings for select
  using (exists (
    select 1 from review_rounds r join projects p on p.id = r.project_id
    where r.id = review_findings.round_id
      and (p.user_id = auth.uid() or p.client_id = auth.uid() or is_workspace_member(p.workspace_id))
  ));

drop policy if exists review_findings_participant_write on review_findings;
create policy review_findings_participant_write on review_findings for all
  using (exists (
    select 1 from review_rounds r
    where r.id = review_findings.round_id
      and (r.submitted_by = auth.uid() or r.reviewer_id = auth.uid())
  ))
  with check (exists (
    select 1 from review_rounds r
    where r.id = review_findings.round_id
      and (r.submitted_by = auth.uid() or r.reviewer_id = auth.uid())
  ));

-- ── Keep updated_at honest ──────────────────────────────────────────────────
create or replace function touch_review_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_review_rounds_touch on review_rounds;
create trigger trg_review_rounds_touch before update on review_rounds
  for each row execute function touch_review_updated_at();

drop trigger if exists trg_review_findings_touch on review_findings;
create trigger trg_review_findings_touch before update on review_findings
  for each row execute function touch_review_updated_at();
