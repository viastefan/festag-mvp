-- Festag — Notizen v2: Pin, Note-Type, Backlinks, Note-Mentions
--
-- Phase 2 der Notizen: das Surface bekommt Linear/Notion-typische Ergonomie.
--
--   1. pinned + pinned_at    → "Anheften" sortiert Pinned-Items immer nach oben
--   2. note_type             → 4 Modi (journal | brief | meeting | research),
--                              die Veyra anders interpretiert (z.B. "brief"
--                              spawnt aggressiver Tasks, "journal" eher Themen).
--   3. is_daily + daily_date → "Daily Note" Sonderform — ein Eintrag pro Tag.
--                              Der UI-Today-Quick-Capture findet/erstellt diesen
--                              Datensatz idempotent.
--   4. notes_mentions        → Backlink-Index für [[Note Title]]-Syntax.
--                              Der Editor schreibt diese Tabelle beim Save mit,
--                              die View „Erwähnungen" zeigt sie pro Notiz.
--
-- Compatible mit 20260523_notes_workspace.sql — keine destruktiven Operationen.

-- ── notes: neue Spalten ──────────────────────────────────────
alter table notes add column if not exists pinned boolean not null default false;
alter table notes add column if not exists pinned_at timestamptz;
alter table notes add column if not exists note_type text not null default 'journal';
alter table notes add column if not exists is_daily boolean not null default false;
alter table notes add column if not exists daily_date date;

-- Constraint: note_type aus 4 erlaubten Werten
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'notes_type_chk') then
    alter table notes
      add constraint notes_type_chk
      check (note_type in ('journal','brief','meeting','research'));
  end if;
end $$;

-- Constraint: Daily-Eintrag braucht ein Datum + ist nur einmal pro User/Tag
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'notes_daily_date_chk') then
    alter table notes
      add constraint notes_daily_date_chk
      check ((is_daily = false) or (daily_date is not null));
  end if;
end $$;

create unique index if not exists uq_notes_daily
  on notes(user_id, daily_date)
  where is_daily = true;

-- Sort-Index: pinned zuerst, dann updated
create index if not exists idx_notes_pin_sort
  on notes(user_id, pinned desc, pinned_at desc nulls last, updated_at desc);

-- Quick-Lookup auf note_type
create index if not exists idx_notes_type
  on notes(user_id, note_type, updated_at desc);

-- pinned_at automatisch setzen wenn pinned=true gesetzt wird
create or replace function touch_notes_pin()
returns trigger language plpgsql as $$
begin
  if new.pinned = true and (old.pinned = false or old.pinned is null) then
    new.pinned_at := now();
  elsif new.pinned = false then
    new.pinned_at := null;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_notes_pin on notes;
create trigger trg_notes_pin
  before update on notes
  for each row execute function touch_notes_pin();

-- ── notes_mentions — Backlink-Graph ──────────────────────────
-- Eine Zeile pro [[Mention]] in einer Notiz. source_note erwähnt target_note.
-- Wird bei jedem PATCH /api/notes/:id neu aufgebaut (delete-then-insert).
create table if not exists notes_mentions (
  source_note_id uuid not null references notes(id) on delete cascade,
  target_note_id uuid not null references notes(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (source_note_id, target_note_id)
);
create index if not exists idx_nm_target on notes_mentions(target_note_id);
create index if not exists idx_nm_source on notes_mentions(source_note_id);

alter table notes_mentions enable row level security;
drop policy if exists nm_read on notes_mentions;
create policy nm_read on notes_mentions
  for select using (
    exists (
      select 1 from notes n
       where n.id = notes_mentions.source_note_id
         and (n.user_id = auth.uid() or auth.uid() = any(n.shared_with))
    )
    or exists (
      select 1 from notes n
       where n.id = notes_mentions.target_note_id
         and (n.user_id = auth.uid() or auth.uid() = any(n.shared_with))
    )
    or exists (select 1 from profiles where id = auth.uid() and role in ('admin','project_owner'))
  );
drop policy if exists nm_write on notes_mentions;
create policy nm_write on notes_mentions
  for all using (
    exists (
      select 1 from notes n
       where n.id = notes_mentions.source_note_id
         and n.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from notes n
       where n.id = notes_mentions.source_note_id
         and n.user_id = auth.uid()
    )
  );
