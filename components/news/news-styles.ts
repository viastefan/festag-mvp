import { DECISION_CSS } from '@/components/decisions/decisions-styles'

/**
 * Newsroom — editorial chrome.
 *
 * Reads like a page of writing, not a dashboard: one column, generous
 * leading, hierarchy through type size rather than boxes. No cards grid,
 * no metric tiles, no decoration that does not carry meaning.
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
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: background .12s ease, color .12s ease;
}
.nws-tool:hover { background: color-mix(in srgb, var(--surface-2) 60%, transparent); color: var(--text); }
.nws-spin { animation: nwsSpin .9s linear infinite; }
@keyframes nwsSpin { to { transform: rotate(360deg); } }

.nws {
  --nws-max: 720px;
  padding: 0 0 96px;
}

/* ── masthead ── */
.nws-head {
  max-width: var(--nws-max);
  padding: 8px 0 26px;
}
.nws-kicker {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 14px;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.nws-kicker time { font-variant-numeric: tabular-nums; }
.nws-kicker-sep { width: 3px; height: 3px; border-radius: 99px; background: currentColor; opacity: .5; }
.nws-digest {
  margin: 0;
  font-size: clamp(23px, 3.1vw, 31px);
  line-height: 1.28;
  letter-spacing: -0.015em;
  color: var(--text);
  font-weight: 400;
  text-wrap: balance;
}
.nws-digest em {
  font-style: normal;
  color: var(--text-muted);
}

/* ── filters ── */
.nws-filters {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
  max-width: var(--nws-max);
  margin: 0 0 8px;
  padding: 14px 0 0;
  border-top: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
}
.nws-filter {
  height: 28px;
  padding: 0 11px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--text-muted);
  font: inherit;
  font-size: 12.5px;
  cursor: pointer;
  transition: background .14s ease, color .14s ease;
  white-space: nowrap;
}
.nws-filter:hover { color: var(--text); background: color-mix(in srgb, var(--surface-2) 45%, transparent); }
.nws-filter.on { color: var(--text); background: color-mix(in srgb, var(--surface-2) 78%, transparent); }
.nws-filter em { font-style: normal; margin-left: 5px; opacity: .6; font-variant-numeric: tabular-nums; }
.nws-filters-spacer { flex: 1 1 auto; }

/* ── day heading ── */
.nws-day {
  max-width: var(--nws-max);
  margin: 34px 0 2px;
  padding-bottom: 8px;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
  border-bottom: 1px solid color-mix(in srgb, var(--border) 55%, transparent);
}
.nws-day:first-of-type { margin-top: 8px; }

/* ── the fresh marker ── */
.nws-marker {
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: var(--nws-max);
  margin: 22px 0 6px;
  font-size: 11.5px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #5b647d;
}
.nws-marker::after {
  content: '';
  flex: 1;
  height: 1px;
  background: linear-gradient(to right, color-mix(in srgb, #5b647d 40%, transparent), transparent);
}

/* ── story ── */
.nws-story {
  display: block;
  width: 100%;
  max-width: var(--nws-max);
  padding: 17px 12px 18px 0;
  border: 0;
  border-bottom: 1px solid color-mix(in srgb, var(--border) 45%, transparent);
  background: transparent;
  text-align: left;
  font: inherit;
  color: inherit;
  cursor: pointer;
  text-decoration: none;
  transition: background .14s ease;
}
.nws-story:hover { background: color-mix(in srgb, var(--surface-2) 26%, transparent); }
.nws-story-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  font-size: 11.5px;
  color: var(--text-muted);
}
.nws-cat {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--nws-cat, var(--text-muted));
}
.nws-cat-dot { width: 5px; height: 5px; border-radius: 99px; background: currentColor; }
.nws-story-project { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.nws-story-time { margin-left: auto; flex-shrink: 0; font-variant-numeric: tabular-nums; }
.nws-headline {
  margin: 0;
  font-size: 15.5px;
  line-height: 1.42;
  letter-spacing: -0.006em;
  color: var(--text);
  font-weight: 400;
  text-wrap: pretty;
}
.nws-story.is-quiet .nws-headline { color: var(--text-secondary, var(--text-muted)); }
.nws-body {
  margin: 5px 0 0;
  font-size: 13px;
  line-height: 1.58;
  color: var(--text-muted);
  text-wrap: pretty;
}
.nws-action {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 11px;
  height: 30px;
  padding: 0 13px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  font: inherit;
  font-size: 12.5px;
  cursor: pointer;
  text-decoration: none;
  transition: background .14s ease, border-color .14s ease;
}
.nws-action:hover { background: color-mix(in srgb, var(--surface-2) 62%, var(--surface)); }

/* ── lead story ── */
.nws-story.is-lead {
  padding: 22px 12px 24px 0;
  border-bottom-width: 1px;
}
.nws-story.is-lead .nws-headline {
  font-size: clamp(19px, 2.3vw, 23px);
  line-height: 1.3;
  letter-spacing: -0.014em;
}
.nws-story.is-lead .nws-body { font-size: 13.5px; margin-top: 8px; }
.nws-story.is-lead .nws-action {
  background: var(--dec-cta-bg, #5b647d);
  color: var(--dec-cta-text, #fff);
  border-color: transparent;
  height: 34px;
  padding: 0 16px;
}
.nws-story.is-lead .nws-action:hover { filter: brightness(1.08); background: var(--dec-cta-bg, #5b647d); }

/* An open story carries a quiet mark in the gutter — no badge, no shouting. */
.nws-story.is-open { position: relative; }
.nws-story.is-open::before {
  content: '';
  position: absolute;
  left: -14px;
  top: 24px;
  width: 4px;
  height: 4px;
  border-radius: 99px;
  background: var(--nws-cat, #5b647d);
}
.nws-story.is-lead.is-open::before { top: 30px; }

/* ── states ── */
.nws-state {
  max-width: var(--nws-max);
  padding: 60px 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.nws-state strong { font-size: 16px; font-weight: 400; color: var(--text); letter-spacing: -0.01em; }
.nws-state p { margin: 0; font-size: 13.5px; line-height: 1.6; color: var(--text-muted); max-width: 46ch; }
.nws-state-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
.nws-skeleton {
  max-width: var(--nws-max);
  height: 84px;
  border-bottom: 1px solid color-mix(in srgb, var(--border) 45%, transparent);
  background: linear-gradient(90deg,
    color-mix(in srgb, var(--surface-2) 22%, transparent) 25%,
    color-mix(in srgb, var(--surface-2) 46%, transparent) 37%,
    color-mix(in srgb, var(--surface-2) 22%, transparent) 63%);
  background-size: 400% 100%;
  animation: nwsShimmer 1.4s ease infinite;
}
@keyframes nwsShimmer { 0% { background-position: 100% 50%; } 100% { background-position: 0 50%; } }

@media (max-width: 780px) {
  .nws { padding-bottom: 120px; }
  .nws-head { padding: 4px 0 20px; }
  .nws-story { padding-right: 0; }
  .nws-story.is-open::before { left: -9px; }
  .nws-filters { overflow-x: auto; flex-wrap: nowrap; scrollbar-width: none; }
  .nws-filters::-webkit-scrollbar { display: none; }
}
`
