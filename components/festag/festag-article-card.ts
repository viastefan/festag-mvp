/**
 * Article card — a tile that carries a picture, then the words.
 *
 * The reference (OpenAI's index) layers two things: a full-bleed canvas, and a
 * smaller artefact resting on it — a phone, a poster, a still. That layering is
 * the whole idea, so the component takes them separately rather than baking one
 * flattened image: the canvas can be a gradient we generate, and the artefact
 * can be a screenshot, a video poster or nothing at all.
 *
 * Constitution 2026-08-22: tile at --fst-radius-lg, artefact one step down at
 * --fst-radius-md, elevation instead of borders, meta at 4.5:1.
 */
export const FESTAG_ARTICLE_CARD_CSS = `
.fac {
  display: flex;
  flex-direction: column;
  gap: 14px;
  text-decoration: none !important;
  color: inherit;
  font-family: 'Aeonik', var(--font-sans, system-ui), sans-serif;
}

/* ── The canvas ── */
.fac-media {
  position: relative;
  aspect-ratio: 4 / 3;
  border-radius: var(--fst-radius-lg, 20px);
  overflow: hidden;
  background: var(--fst-raised, #F1F1F3);
  isolation: isolate;
}
.fac-canvas {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  transform: scale(1.001);
  transition: transform 380ms cubic-bezier(.22,1,.36,1);
  will-change: transform;
}
.fac:hover .fac-canvas { transform: scale(1.04); }

/* Fallback canvases — a card must look composed before anyone shoots art.
   Tones follow the semantic set, not decoration. */
.fac-media[data-tone="dawn"] .fac-canvas {
  background-image: linear-gradient(150deg, #E9C46A 0%, #6E86B8 52%, #22304F 100%);
}
.fac-media[data-tone="tide"] .fac-canvas {
  background-image: linear-gradient(150deg, #7FD8E8 0%, #2E6BFF 58%, #10214A 100%);
}
.fac-media[data-tone="moss"] .fac-canvas {
  background-image: linear-gradient(150deg, #BFE3C4 0%, #3E9B6B 55%, #123528 100%);
}
.fac-media[data-tone="ember"] .fac-canvas {
  background-image: linear-gradient(150deg, #FFC9A8 0%, #E4694A 55%, #4A1B14 100%);
}
.fac-media[data-tone="slate"] .fac-canvas {
  background-image: linear-gradient(150deg, #D7DAE2 0%, #6B7182 55%, #1B1E27 100%);
}

/* ── The artefact resting on it ── */
.fac-art {
  position: absolute;
  left: 12%;
  right: 12%;
  bottom: 0;
  top: 14%;
  border-radius: var(--fst-radius-md, 12px) var(--fst-radius-md, 12px) 0 0;
  overflow: hidden;
  background: var(--fst-card, #fff);
  box-shadow: var(--fst-shadow-lg, 0 12px 32px rgba(15,15,20,.10));
  transition: transform 380ms cubic-bezier(.22,1,.36,1);
}
.fac:hover .fac-art { transform: translateY(-4px); }
.fac-art-img { width: 100%; height: 100%; object-fit: cover; object-position: top center; display: block; }

/* An artefact that is a word, not a picture — the reference does this too. */
.fac-art--type {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;
  inset: 18% 10% auto;
  bottom: auto;
  aspect-ratio: 16 / 7;
  border-radius: var(--fst-radius-md, 12px);
  text-align: center;
  font-size: clamp(18px, 2.4vw, 30px);
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: #16161A;
}

/* ── The words ── */
.fac-title {
  margin: 0;
  font-size: 17px;
  font-weight: 400;
  line-height: 1.35;
  letter-spacing: -0.015em;
  color: var(--fst-text, #0F0F14);
}
.fac-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  font-size: 13px;
  color: var(--fst-text-3, #7C7C88);
}
.fac-cat { color: var(--fst-text-2, #5B5B66); }

@media (prefers-reduced-motion: reduce) {
  .fac-canvas, .fac-art { transition: none; }
  .fac:hover .fac-canvas { transform: none; }
  .fac:hover .fac-art { transform: none; }
}
`.trim()
