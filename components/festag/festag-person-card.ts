/**
 * Person card — the one way Festag shows a human on an account.
 *
 * Written against the 2026-08-22 constitution: neutral card lifted by elevation
 * rather than a border, one filled primary action, 4.5:1 on every text pair,
 * radius stepped (28 card → 12 controls, never 6 inside 28).
 */
export const FESTAG_PERSON_CARD_CSS = `
.fpc {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border-radius: var(--fst-radius-xl, 28px);
  background: var(--fst-card, #fff);
  box-shadow: var(--fst-shadow-md, 0 4px 16px rgba(15,15,20,.07));
  color: var(--fst-text, #0F0F14);
  font-family: 'Aeonik', var(--font-sans, system-ui), sans-serif;
}

.fpc-avatar {
  position: relative;
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--fst-raised, #F1F1F3);
  color: var(--fst-text-2, #5B5B66);
  font-size: 17px;
  letter-spacing: -0.01em;
  overflow: hidden;
}
.fpc-avatar-img { width: 100%; height: 100%; object-fit: cover; }
.fpc-online {
  position: absolute;
  right: 1px;
  bottom: 1px;
  width: 12px;
  height: 12px;
  border-radius: 999px;
  background: var(--green, #2E9B52);
  box-shadow: 0 0 0 2.5px var(--fst-card, #fff);
}

.fpc-body { flex: 1 1 auto; min-width: 0; }

.fpc-name {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 17px;
  font-weight: 400;
  letter-spacing: -0.015em;
  line-height: 1.25;
}
/* The role is the badge. It is information, so it reads — not a coloured pip. */
.fpc-role {
  flex-shrink: 0;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--fst-raised, #F1F1F3);
  color: var(--fst-text-2, #5B5B66);
  font-size: 12px;
  line-height: 1.5;
  letter-spacing: 0;
}
.fpc[data-role="client"] .fpc-role {
  background: var(--fst-accent-soft, rgba(46,107,255,0.10));
  color: var(--fst-accent, #2E6BFF);
}

.fpc-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 3px 0 0;
  min-width: 0;
  font-size: 13px;
  color: var(--fst-text-3, #7C7C88);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.fpc-handle { flex-shrink: 0; }
.fpc-dot {
  flex-shrink: 0;
  width: 3px;
  height: 3px;
  border-radius: 999px;
  background: currentColor;
  opacity: 0.55;
}
.fpc-line {
  margin: 8px 0 0;
  font-size: 14px;
  line-height: 1.45;
  color: var(--fst-text-2, #5B5B66);
}

.fpc-actions {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}
.fpc-btn {
  height: 38px;
  padding: 0 16px;
  border: 0;
  border-radius: var(--fst-radius-md, 12px);
  font: inherit;
  font-size: 14px;
  letter-spacing: -0.01em;
  cursor: pointer;
  transition: background var(--fst-hover, 130ms ease), color var(--fst-hover, 130ms ease), transform var(--fst-press, 70ms ease);
}
.fpc-btn:active { transform: scale(0.985); }
/* Exactly one filled action per surface. */
.fpc-btn--primary {
  background: var(--fst-text, #0F0F14);
  color: var(--fst-card, #fff);
}
.fpc-btn--primary:hover { background: color-mix(in srgb, var(--fst-text, #0F0F14) 88%, transparent); }
.fpc-btn--quiet {
  background: var(--fst-raised, #F1F1F3);
  color: var(--fst-text, #0F0F14);
}
.fpc-btn--quiet:hover { background: var(--fst-sunken, #E9E9EC); }

@media (prefers-reduced-motion: reduce) {
  .fpc-btn { transition: none; }
}

/* Phone: the action goes full width under the person rather than squeezing the
   name into two lines beside it. */
@media (max-width: 560px) {
  .fpc { flex-wrap: wrap; gap: 14px; }
  .fpc-body { flex: 1 1 60%; }
  .fpc-actions { flex: 1 1 100%; }
  .fpc-btn { flex: 1 1 auto; height: 44px; }
}
`.trim()
