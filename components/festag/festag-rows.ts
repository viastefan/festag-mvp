/**
 * Festag Zeilenwerk — die eine Listenform des Produkts.
 *
 * Jede Seite, die eine Liste zeigt, zeigt sie so: Gruppen mit einer stillen
 * Überschrift, darin Zeilen. Eine Zeile beantwortet vier Fragen in fester
 * Reihenfolge — was ist das (Zustand), worum geht es (Titel), was steht dazu
 * (Vorschau), wo gehört es hin (Kontext + Zeit) — und führt an die Stelle, an
 * der man sie schließt.
 *
 * Warum eine Datei: vorher hatte jede Seite ihr eigenes Kartenraster. Dieselbe
 * Entscheidung sah in Entscheidungen anders aus als in News und wieder anders
 * in Aufgaben, und jede Änderung an der Form musste an acht Stellen passieren.
 * Die Namen sind `fst-*`; `nws-*` läuft als Alias mit, solange News die alten
 * Klassen trägt.
 *
 * Ton (`--fst-tone`) trägt Bedeutung, nie Dekoration:
 *   wait  — wartet auf den Leser        watch — beobachten
 *   good  — erledigt                    quiet — nur Kenntnisnahme
 */
export const FESTAG_ROWS_CSS = `
.fst-rows-scope,
.nws {
  --fst-max: 860px;
  --fst-row-bg: color-mix(in srgb, var(--surface-2) 42%, transparent);
  --fst-row-bg-hover: color-mix(in srgb, var(--surface-2) 78%, transparent);
}

/* ── Gruppe ── */
.fst-group,
.nws-group {
  max-width: var(--fst-max, 860px);
  margin: 26px 0 0;
}
.fst-group:first-of-type,
.nws-group:first-of-type { margin-top: 16px; }
.fst-group-head,
.nws-group-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 0 4px 10px;
}
.fst-group-title,
.nws-group-title {
  margin: 0;
  /* Gruppentitel sind keine Seitentitel — sie bleiben Aeonik Regular und
     leise. Die Editorial-Schrift trägt nur die eine Überschrift ganz oben. */
  font-family: var(--font-ui, var(--font-aeonik));
  font-size: 13.5px;
  font-weight: 400;
  letter-spacing: -0.004em;
  color: var(--text-muted);
}
.fst-group-count,
.nws-group-count {
  font-size: 12px;
  color: var(--text-muted);
  opacity: .62;
  font-variant-numeric: tabular-nums;
}
.fst-rows,
.nws-rows {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

/* ── Zeile ── */
.fst-row,
.nws-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 46px;
  padding: 11px 14px 11px 15px;
  border: 1px solid transparent;
  border-radius: 11px;
  background: var(--fst-row-bg);
  color: inherit;
  font: inherit;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
  transition: background .14s ease, border-color .14s ease;
}
.fst-row:hover,
.nws-row:hover { background: var(--fst-row-bg-hover); }
.fst-row:focus-visible,
.nws-row:focus-visible {
  outline: none;
  border-color: color-mix(in srgb, var(--fst-tone, var(--nws-tone, var(--text-muted))) 60%, transparent);
}
.fst-row.is-static,
.nws-row.is-static { cursor: default; }
.fst-row.is-static:hover,
.nws-row.is-static:hover { background: var(--fst-row-bg); }

.fst-row-dot,
.nws-row-dot {
  flex: 0 0 auto;
  width: 6px;
  height: 6px;
  border-radius: 99px;
  background: var(--fst-tone, var(--nws-tone, var(--text-muted)));
}
.fst-row-status,
.nws-row-status {
  flex: 0 0 auto;
  font-size: 13.5px;
  letter-spacing: -0.004em;
  color: var(--fst-tone, var(--nws-tone, var(--text-muted)));
  white-space: nowrap;
}
/* Der Titel weicht nicht: er ist der Satz, wegen dem jemand die Zeile liest.
   Er hat eine Obergrenze, damit die rechte Spalte immer an ihrem Platz steht —
   was danach kommt, kürzt der Vorschautext weg, nicht der Titel. */
.fst-row-title,
.nws-row-title {
  flex: 0 0 auto;
  max-width: 42ch;
  min-width: 0;
  font-size: 13.5px;
  letter-spacing: -0.004em;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.fst-row.is-quiet .fst-row-title,
.nws-row.is-quiet .nws-row-title { color: var(--text-secondary, var(--text-muted)); }
.fst-row-preview,
.nws-row-preview {
  flex: 1 1 auto;
  flex-shrink: 4;
  min-width: 0;
  font-size: 13px;
  color: var(--text-muted);
  opacity: .78;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.fst-row-context,
.nws-row-context {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
  padding-left: 6px;
  font-size: 12.5px;
  color: var(--text-muted);
}
.fst-row-project,
.nws-row-project {
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.fst-row-time,
.nws-row-time { white-space: nowrap; font-variant-numeric: tabular-nums; }
.fst-row-caret,
.nws-row-caret {
  flex: 0 0 auto;
  color: var(--text-muted);
  opacity: .45;
  transition: opacity .14s ease, transform .14s ease;
}
.fst-row:hover .fst-row-caret,
.nws-row:hover .nws-row-caret { opacity: .9; transform: translateX(1px); }
.fst-row.is-static .fst-row-caret,
.nws-row.is-static .nws-row-caret { visibility: hidden; }

/* Neu seit dem letzten Besuch — ein Ring am Punkt, kein Etikett. */
.fst-row.is-fresh .fst-row-dot,
.nws-row.is-fresh .nws-row-dot {
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--fst-tone, var(--nws-tone, var(--text-muted))) 22%, transparent);
}

@media (max-width: 780px) {
  /* Auf dem Telefon bricht die Zeile in ihre drei Fragen auf: was ist es,
     worum geht es, wo gehört es hin. Der Vorschautext fällt weg — er wäre
     nach vier Wörtern abgeschnitten und trüge nichts mehr. Kein Schrumpfen
     des Desktop-Layouts, sondern eine eigene Ordnung. */
  .fst-row,
  .nws-row {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    grid-template-areas:
      "dot status caret"
      ". title title"
      ". context context";
    align-items: center;
    row-gap: 3px;
    column-gap: 9px;
    padding: 12px 13px;
    min-height: 56px;
  }
  .fst-row-dot, .nws-row-dot { grid-area: dot; }
  .fst-row-status, .nws-row-status { grid-area: status; }
  .fst-row-title, .nws-row-title {
    grid-area: title;
    max-width: none;
    white-space: normal;
    text-wrap: pretty;
    line-height: 1.4;
  }
  .fst-row-context, .nws-row-context { grid-area: context; margin-left: 0; padding-left: 0; }
  .fst-row-caret, .nws-row-caret { grid-area: caret; }
  .fst-row-preview, .nws-row-preview { display: none; }
}
`
