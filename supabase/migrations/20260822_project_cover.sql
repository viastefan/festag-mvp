-- Festag — Projekt-Titelbild
--
-- Ein Projekt darf ein Gesicht haben. In einer Liste aus zwanzig Zeilen findet
-- das Auge ein Bild schneller als einen Namen, und ein Projekt ist für die
-- meisten Menschen ein *Ding*, kein Datensatz.
--
-- WARUM EINE SPALTE UND KEIN project_assets-EINTRAG
-- project_assets ist die Produktionstabelle: Kategorie, Sichtbarkeit,
-- Analyseergebnis, Task-Verknüpfung. Ein Titelbild ist nichts davon — es ist
-- Projekt-Identität, so wie der Titel. Läge es dort, tauchte es in jeder
-- Asset-Liste als „hochgeladene Datei" auf, bräuchte eine Kategorie, die nicht
-- passt, und ein Löschen des Covers wäre das Löschen eines Assets.
--
-- WARUM TROTZDEM DERSELBE BUCKET
-- Die Datei liegt unter project-assets/<projectId>/cover/… — damit greifen die
-- bestehenden Storage-Policies aus 20260516_project_assets.sql unverändert:
-- lesen und schreiben darf, wer Zugriff auf das Projekt hat, weil das erste
-- Ordnersegment die projectId ist. Keine neue Policy, keine zweite Regel, die
-- irgendwann von der ersten abweicht.
--
-- Der Bucket ist privat. Es wird nie eine öffentliche URL gespeichert, nur der
-- Pfad — die Anwendung reicht signierte Links aus.

alter table projects
  add column if not exists cover_path text,
  add column if not exists cover_updated_at timestamptz,
  add column if not exists cover_by uuid references auth.users(id) on delete set null;

comment on column projects.cover_path is
  'Storage-Pfad im Bucket project-assets, Form: <projectId>/cover/<datei>. Nie eine öffentliche URL — der Bucket ist privat, Links werden signiert ausgegeben.';
comment on column projects.cover_updated_at is
  'Wann das Titelbild zuletzt gesetzt wurde. Treibt das Cache-Busting der signierten URL.';
comment on column projects.cover_by is
  'Wer es gesetzt hat. Steht in der Aktivität und beantwortet „wer war das".';
