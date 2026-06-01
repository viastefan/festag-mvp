-- Link-first invites ("Per Link einladen") carry no email — the host shares
-- the link themselves (kein PIN, keine Pflicht-Mail). The legacy NOT NULL on
-- team_invites.email blocked /api/invites/create for these, so creating a
-- share link failed. Drop the constraint so link-first invites can be created.
alter table team_invites alter column email drop not null;
