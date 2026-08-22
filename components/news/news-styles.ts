import { DECISION_CSS } from '@/components/decisions/decisions-styles'

/**
 * Startseite — nur das, was dieser Seite gehört.
 *
 * Gruppen und Zeilen kommen aus dem gemeinsamen Zeilenwerk
 * (`components/festag/festag-rows.ts`), das über DECISION_CSS auf jeder
 * Portalseite liegt. Hier steht der Rest: die Anrede-Zeile darunter, die
 * Filter und das Werkzeug in der Kopfzeile.
 */
export const NEWS_CSS = `
${DECISION_CSS}

/* Kopfzeilen-Werkzeug — dieselbe Geometrie wie in Aufgaben, ohne das ganze
   Board-Stylesheet mitzuziehen. */
.nws-tool {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: var(--r-chip, 8px);
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: background var(--dur-1, 140ms) var(--ease-out), color var(--dur-1, 140ms) var(--ease-out);
}
.nws-tool:hover { background: color-mix(in srgb, var(--surface-2) 60%, transparent); color: var(--text); }
.nws-spin { animation: nwsSpin .9s linear infinite; }
@keyframes nwsSpin { to { transform: rotate(360deg); } }

.nws {
  --nws-max: 100%;
  --nws-row-bg: color-mix(in srgb, var(--surface-2) 42%, transparent);
  --nws-row-bg-hover: color-mix(in srgb, var(--surface-2) 78%, transparent);
  /* Unter der Kopfzeile liegt ein 52px hoher Verlauf (.dec-static-top::after),
     der scrollende Inhalte auflöst. Der erste Satz der Seite darf dort nicht
     stehen — sonst liest er sich beim Stillstand wie ausgeblendet. */
  padding-top: 34px;
  padding-bottom: 96px;
}

/* ── Anrede-Nachsatz ──
   Unter der Begrüßung steht der eine Satz, der den Stand beschreibt. Er ist
   keine Überschrift: er darf sich jeden Tag ändern, ohne dass die Seite
   ihre Form verliert. */
.nws-head {
  max-width: var(--nws-max);
  padding: 0 0 22px;
}
.nws-digest {
  margin: 0;
  font-size: 17px;
  line-height: 1.5;
  letter-spacing: -0.011em;
  color: var(--text-muted);
  font-weight: 400;
  text-wrap: pretty;
}
.nws-sub {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 7px 0 0;
  font-size: 12.5px;
  color: var(--text-muted);
}
.nws-sub time { font-variant-numeric: tabular-nums; }
.nws-sep { width: 3px; height: 3px; border-radius: var(--r-pill, 999px); background: currentColor; opacity: .5; }

/* ── Filter ── */
.nws-filters {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
  max-width: var(--nws-max);
  margin: 0;
  padding: 0 0 4px;
}
.nws-filter {
  height: 28px;
  padding: 0 11px;
  border: 0;
  border-radius: var(--r-chip, 8px);
  background: transparent;
  color: var(--text-muted);
  font: inherit;
  font-size: 12.5px;
  cursor: pointer;
  transition: background var(--dur-1, 140ms) var(--ease-out), color var(--dur-1, 140ms) var(--ease-out);
  white-space: nowrap;
}
.nws-filter:hover { color: var(--text); background: color-mix(in srgb, var(--surface-2) 45%, transparent); }
.nws-filter.on { color: var(--text); background: color-mix(in srgb, var(--surface-2) 78%, transparent); }
.nws-filter em { font-style: normal; margin-left: 5px; opacity: .6; font-variant-numeric: tabular-nums; }

@media (max-width: 780px) {
  .nws { padding-bottom: 120px; }
  .nws-head { padding-bottom: 18px; }
  .nws-digest { font-size: 15.5px; }
  .nws-filters { overflow-x: auto; flex-wrap: nowrap; scrollbar-width: none; }
  .nws-filters::-webkit-scrollbar { display: none; }
}
`
