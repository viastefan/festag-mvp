-- Avatar-Farbe für Initialen-Avatare (kein Bild-Upload).
-- Wird automatisch beim ersten Login gehasht (clientseitig), kann
-- vom User über das Design-Popup überschrieben werden.

alter table public.profiles
  add column if not exists avatar_color text;

comment on column public.profiles.avatar_color
  is 'Hex-Farbe für Initialen-Avatar. NULL = wird clientseitig aus user.id gehasht.';
