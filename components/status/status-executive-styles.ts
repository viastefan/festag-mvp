export const STATUS_EXECUTIVE_CSS = `
.st-ex {
  --st-ex-surface: var(--festag-glass-bg-soft, rgba(255, 255, 255, 0.42));
  --st-ex-surface-hover: var(--festag-glass-bg, rgba(255, 255, 255, 0.58));
  --st-ex-pad-x: clamp(24px, 10vw, 164px);
  position: relative;
  height: 100%;
  min-height: 0;
  overflow: auto;
  overflow-x: hidden;
  padding: 0 var(--st-ex-pad-x) clamp(48px, 6vw, 80px);
  box-sizing: border-box;
  -webkit-overflow-scrolling: touch;
  font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
  font-weight: 500;
  letter-spacing: 0.007em;
  color: #0f0f10;
  background: transparent;
}

.st-ex-hero {
  position: sticky;
  top: 0;
  z-index: 50;
  width: 100%;
  margin: 0 0 clamp(28px, 4vw, 40px);
  padding: clamp(64px, 7vh, 88px) 0 0;
  background: color-mix(in srgb, var(--festag-glass-bg, rgba(255, 255, 255, 0.58)) 88%, transparent);
  backdrop-filter: var(--festag-glass-blur, blur(18px) saturate(155%));
  -webkit-backdrop-filter: var(--festag-glass-blur, blur(18px) saturate(155%));
  isolation: isolate;
  box-sizing: border-box;
}
.st-ex-hero::before {
  content: '';
  pointer-events: none;
  position: absolute;
  left: 0;
  right: 0;
  bottom: 100%;
  height: 100vh;
  z-index: -1;
  background: var(--festag-scroll-fade-bg, transparent);
}
.st-ex-hero-inner {
  width: 100%;
  margin: 0;
  padding: 0 0 28px;
  box-sizing: border-box;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
}
.st-ex-hero-copy {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
  position: relative;
  z-index: 2;
}
.st-ex-title {
  display: flex;
  flex-direction: column;
  margin: 0;
  font-size: 28px;
  font-weight: 400;
  line-height: 1;
  letter-spacing: -0.1px;
  color: #000;
}
.st-ex-title-muted {
  display: block;
  margin-top: 0;
  color: #959da0;
}
.st-ex-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
}
.st-ex-tool-wrap {
  position: relative;
}
.st-ex-tool-menu {
  z-index: 60;
}
.st-ex-tool-menu-label {
  margin: 6px 10px 4px;
  font-size: 11px;
  font-weight: 400;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--portal-muted, #86868b);
}
.st-ex-tool-menu-divider {
  height: 1px;
  margin: 4px 6px;
  background: color-mix(in srgb, var(--border, rgba(15, 23, 42, 0.08)) 80%, transparent);
}
.st-ex-tool {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
  border-radius: 32px;
  border: 1px solid rgba(241, 242, 246, 0.4);
  background: #fff;
  color: #0f0f10;
  box-shadow:
    0 2px 4px rgba(15, 15, 16, 0.05),
    0 1.5px 1px rgba(46, 47, 51, 0.1);
  cursor: pointer;
  transition: background 0.15s ease, box-shadow 0.15s ease;
}
.st-ex-tool:hover {
  background: var(--st-ex-surface);
}
.st-ex-tool.on {
  background: var(--st-ex-surface);
  box-shadow:
    0 2px 6px rgba(15, 15, 16, 0.08),
    0 1.5px 1px rgba(46, 47, 51, 0.12);
}
.st-ex-tool:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.st-ex-tool-icon--lightning {
  width: 15px;
  height: 15px;
  color: #b0b8c0;
  opacity: 0.92;
}
.st-ex-tool:hover .st-ex-tool-icon--lightning {
  color: #8d98a6;
}
.st-ex-cta {
  position: relative;
  z-index: 2;
  flex-shrink: 0;
  align-self: flex-end;
  margin-top: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 40px;
  padding: 0 24px;
  border: none;
  border-radius: 32px;
  background: #5b647d;
  color: #fff;
  font: inherit;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.007em;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(200, 169, 91, 0.14);
  white-space: nowrap;
  transition: background 0.15s ease, transform 0.15s ease;
}
.st-ex-cta:hover {
  background: color-mix(in srgb, #5b647d 92%, #fff);
}

.st-ex-block {
  margin-bottom: clamp(32px, 4vw, 48px);
  min-width: 0;
  position: relative;
  z-index: 0;
}
.st-ex-block:last-child {
  margin-bottom: 0;
}
.st-ex-block-title {
  margin: 0 0 24px;
  font-size: 20px;
  font-weight: 500;
  letter-spacing: -0.005em;
  line-height: 1.2;
  color: #0f0f10;
}

/* Horizontal card slider — Figma 359:128, always scroll + right fade */
.st-ex-row-wrap {
  position: relative;
  width: 100%;
  min-width: 0;
  overflow: hidden;
}
.st-ex-row {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  gap: 16px;
  overflow-x: auto;
  overflow-y: hidden;
  padding-bottom: 2px;
  scroll-behavior: smooth;
  scroll-snap-type: x proximity;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.st-ex-row::-webkit-scrollbar { display: none; }
.st-ex-row-fade {
  pointer-events: none;
  position: absolute;
  top: 0;
  right: 0;
  width: 183px;
  height: 300px;
  z-index: 2;
  opacity: 0;
  transition: opacity 0.2s ease;
  background: linear-gradient(
    270deg,
    var(--portal-card, #ffffff) 0%,
    rgba(255, 255, 255, 0) 100%
  );
}
.st-ex-row-fade.on {
  opacity: 1;
}

/* Apple-style row controls — dotnav, play/pause, paddlenav */
.st-ex-row-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 20px;
  min-height: 36px;
}
@media (min-width: 769px) {
  .st-ex-row-controls {
    margin-top: 24px;
    min-height: 56px;
  }
  .st-ex-dotnav {
    height: 56px;
    padding: 0 20px;
    gap: 10px;
  }
  .st-ex-dotnav-item.on {
    width: 48px;
    height: 8px;
  }
  .st-ex-dotnav-item:not(.on) {
    width: 8px;
    height: 8px;
  }
  .st-ex-play {
    width: 56px;
    height: 56px;
  }
}
.st-ex-row-controls-start {
  display: flex;
  align-items: center;
  gap: 8px;
}
.st-ex-dotnav {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  padding: 0 14px;
  border-radius: 999px;
  isolation: isolate;
}
.st-ex-dotnav-bg {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: var(--st-ex-surface);
  z-index: 0;
}
.st-ex-dotnav-item {
  position: relative;
  z-index: 1;
  flex-shrink: 0;
  width: 6px;
  height: 6px;
  padding: 0;
  border: none;
  border-radius: 999px;
  background: rgba(15, 15, 16, 0.32);
  cursor: pointer;
  transition: width 0.25s ease, background 0.2s ease;
}
.st-ex-dotnav-item.on {
  width: 36px;
  height: 6px;
  background: rgba(15, 15, 16, 0.12);
  overflow: hidden;
}
.st-ex-dotnav-progress {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: inherit;
  background: rgba(15, 15, 16, 0.72);
  transform-origin: left center;
  transform: scaleX(1);
}
.st-ex-play {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: var(--st-ex-surface);
  color: #0f0f10;
  cursor: pointer;
  transition: background 0.15s ease, transform 0.15s ease;
}
.st-ex-play:hover {
  background: var(--st-ex-surface-hover);
}
.st-ex-paddlenav {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.st-ex-paddle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: var(--st-ex-surface);
  color: rgba(15, 15, 16, 0.34);
  cursor: default;
  transition: background 0.15s ease, color 0.15s ease, transform 0.15s ease;
}
.st-ex-paddle:not(:disabled) {
  background: var(--st-ex-surface);
  color: rgba(15, 15, 16, 0.88);
  cursor: pointer;
}
.st-ex-paddle:not(:disabled):hover {
  transform: scale(1.04);
  background: var(--st-ex-surface-hover);
}
.st-ex-paddle:disabled {
  opacity: 1;
}

.st-ex-card {
  position: relative;
  z-index: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: flex-start;
  gap: 0;
  flex: 0 0 292px;
  width: 292px;
  height: 300px;
  min-height: 300px;
  scroll-snap-align: start;
  padding: 24px;
  border-radius: 20px;
  border: 1px solid var(--festag-glass-border, rgba(255, 255, 255, 0.62));
  background: var(--st-ex-surface);
  box-shadow: var(--festag-glass-shadow-soft);
  backdrop-filter: var(--festag-glass-blur, blur(18px) saturate(155%));
  -webkit-backdrop-filter: var(--festag-glass-blur, blur(18px) saturate(155%));
  text-decoration: none;
  color: inherit;
  text-align: left;
  cursor: pointer;
  box-sizing: border-box;
  overflow: hidden;
  transition: background 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
}
.st-ex-card:hover {
  background: var(--st-ex-surface-hover);
  transform: translateY(-1px);
}
.st-ex-card:focus-visible {
  outline: 2px solid color-mix(in srgb, #5b647d 55%, transparent);
  outline-offset: 2px;
}
.st-ex-card-copy {
  position: relative;
  z-index: 1;
  width: 100%;
}
.st-ex-card-art {
  position: absolute;
  left: 50%;
  top: 20px;
  transform: translateX(-50%);
  width: 118px;
  height: 86px;
  color: #2e2e31;
  opacity: 1;
  pointer-events: none;
}
.st-ex-card-art svg {
  display: block;
  width: 100%;
  height: 100%;
}

/* Cinematic + Tagro demos — float in card, no inner frame */
.st-ex-card-art--tagro-demo,
.st-ex-card-art--cinematic {
  top: 14px;
  width: 228px;
  height: 158px;
  border-radius: 0;
  overflow: visible;
  background: transparent;
  box-shadow: none;
}
.st-ex-card--enter {
  opacity: 0;
  animation: stExCardEnter 0.72s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}
@keyframes stExCardEnter {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Cinematic card scenes */
.st-ex-cine {
  position: relative;
  width: 100%;
  height: 100%;
  background: transparent;
  overflow: visible;
}
.st-ex-cine-rim {
  display: none;
}

/* Gesamtbericht — mini briefing player + typewriter lines */
.st-ex-cine--brief {
  display: flex;
  flex-direction: column;
  gap: 10px;
  color: #3a3a40;
}
.st-ex-brief-mini {
  flex: 0 0 auto;
  display: flex;
  justify-content: center;
  padding: 0 6px;
}
.st-ex-brief-mini-card {
  position: relative;
  width: 100%;
  max-width: 196px;
  border-radius: 14px;
  background:
    radial-gradient(90% 55% at 50% 0%, color-mix(in srgb, #fff 14%, #f5f5f7), transparent 52%),
    #f5f5f7;
  border: 0.5px solid rgba(0, 0, 0, 0.04);
  padding: 12px 14px 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.55);
  overflow: hidden;
}
.st-ex-brief-mini-card::before {
  content: '';
  position: absolute;
  inset: 20% 16% auto;
  height: 48%;
  border-radius: 999px;
  background: radial-gradient(ellipse at center, color-mix(in srgb, #fff 16%, #f5f5f7), transparent 70%);
  pointer-events: none;
  opacity: 0.32;
}
.st-ex-brief-mini-wave {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 2px;
  height: 28px;
  width: 100%;
}
.st-ex-brief-mini-wave span {
  display: block;
  width: 2px;
  border-radius: 999px;
  background: color-mix(in srgb, #5b647d 88%, #18181b);
  height: 8px;
  opacity: 0.38;
  transform-origin: center bottom;
  animation: stExBriefWave 1.55s ease-in-out infinite;
  animation-play-state: paused;
}
.st-ex-brief-mini-wave.is-playing span {
  animation-play-state: running;
  opacity: 0.72;
}
.st-ex-brief-mini-wave span:nth-child(1) { height: 6px; }
.st-ex-brief-mini-wave span:nth-child(2) { height: 10px; }
.st-ex-brief-mini-wave span:nth-child(3) { height: 16px; }
.st-ex-brief-mini-wave span:nth-child(4) { height: 22px; }
.st-ex-brief-mini-wave span:nth-child(5) { height: 18px; }
.st-ex-brief-mini-wave span:nth-child(6) { height: 13px; }
.st-ex-brief-mini-wave span:nth-child(7) { height: 20px; }
.st-ex-brief-mini-wave span:nth-child(8) { height: 14px; }
.st-ex-brief-mini-wave span:nth-child(9) { height: 9px; }
.st-ex-brief-mini-wave span:nth-child(10) { height: 15px; }
@keyframes stExBriefWave {
  0%, 100% { transform: scaleY(0.22); opacity: 0.38; }
  50% { transform: scaleY(1); opacity: 1; }
}
.st-ex-brief-mini-dur {
  position: relative;
  z-index: 1;
  font-size: 8px;
  font-weight: 400;
  letter-spacing: 0.02em;
  color: rgba(15, 15, 16, 0.48);
}
.st-ex-brief-type-stage {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: stretch;
  padding: 0 8px 2px;
  overflow: hidden;
  -webkit-mask-image: linear-gradient(180deg, transparent 0%, #000 28%, #000 100%);
  mask-image: linear-gradient(180deg, transparent 0%, #000 28%, #000 100%);
}
.st-ex-brief-type-line {
  margin: 0;
  font-size: 9.5px;
  line-height: 1.35;
  font-weight: 500;
  letter-spacing: -0.01em;
  color: rgba(15, 15, 16, 0.72);
  text-align: center;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.st-ex-brief-type-line.is-active {
  color: #0f0f10;
  font-weight: 600;
}
.st-ex-brief-type-line.is-exit {
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: 2px;
  color: rgba(15, 15, 16, 0.42);
  animation: stExBriefTypeExit 0.72s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  pointer-events: none;
}
@keyframes stExBriefTypeExit {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(-22px);
  }
}
.st-ex-brief-caret {
  display: inline-block;
  width: 1px;
  height: 0.95em;
  margin-left: 1px;
  vertical-align: -0.08em;
  background: currentColor;
  opacity: 0.72;
  animation: stExBriefCaret 0.9s step-end infinite;
}
@keyframes stExBriefCaret {
  0%, 100% { opacity: 0; }
  50% { opacity: 0.72; }
}

/* Letzte 24h — liquid wave */
.st-ex-cine--wave {
  background: transparent;
}
.st-ex-cine-wave-svg {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 72%;
}
.st-ex-cine-wave {
  fill: rgba(91, 100, 125, 0.12);
}
.st-ex-cine-wave--back {
  opacity: 0.45;
  animation: stExWaveDrift 7.5s ease-in-out infinite;
}
.st-ex-cine-wave--mid {
  fill: rgba(91, 100, 125, 0.18);
  animation: stExWaveDrift 5.8s ease-in-out infinite reverse;
}
.st-ex-cine-wave--front {
  fill: rgba(91, 100, 125, 0.24);
  animation: stExWaveDrift 4.6s ease-in-out infinite;
}
@keyframes stExWaveDrift {
  0%, 100% { transform: translateX(0) scaleY(1); }
  50% { transform: translateX(-4%) scaleY(1.06); }
}
.st-ex-cine-particle {
  position: absolute;
  bottom: 28%;
  width: 3px;
  height: 3px;
  border-radius: 999px;
  background: rgba(91, 100, 125, 0.42);
  animation-name: stExParticleFloat;
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
}
@keyframes stExParticleFloat {
  0%, 100% { transform: translateY(0); opacity: 0.2; }
  50% { transform: translateY(-16px); opacity: 0.75; }
}

/* Projektbericht filtern — floating nodes */
.st-ex-cine--nodes {
  background: transparent;
}
.st-ex-cine-nodes-svg {
  position: absolute;
  inset: 8px 6px;
  width: calc(100% - 12px);
  height: calc(100% - 16px);
}
.st-ex-cine-node-link {
  stroke: rgba(15, 15, 16, 0.14);
  stroke-width: 0.7;
  vector-effect: non-scaling-stroke;
}
.st-ex-cine-node {
  transform-box: fill-box;
  transform-origin: center;
  animation-name: stExNodeOrbit;
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
}
.st-ex-cine-node-glow {
  fill: rgba(91, 100, 125, 0.1);
  filter: blur(0.4px);
}
.st-ex-cine-node-core {
  fill: rgba(15, 15, 16, 0.72);
  stroke: rgba(255, 255, 255, 0.75);
  stroke-width: 0.6;
  vector-effect: non-scaling-stroke;
}
.st-ex-cine-node:nth-child(3) .st-ex-cine-node-core {
  fill: rgba(91, 100, 125, 0.88);
}
@keyframes stExNodeOrbit {
  0%, 100% { transform: translate(0, 0); }
  33% { transform: translate(1.5px, -2px); }
  66% { transform: translate(-1px, 1.5px); }
}
.st-ex-cine-24h-labels {
  position: absolute;
  top: 8px;
  left: 8px;
  right: 8px;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 5px;
  pointer-events: none;
}
.st-ex-cine-24h-label {
  margin: 0;
  font-size: 9px;
  line-height: 1.3;
  font-weight: 500;
  letter-spacing: -0.01em;
  color: rgba(15, 15, 16, 0.52);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.st-ex-cine-node-label {
  font-size: 4.5px;
  font-weight: 500;
  fill: rgba(15, 15, 16, 0.58);
  letter-spacing: -0.02em;
}
.st-ex-card-art-live {
  position: absolute;
  left: 0;
  right: 0;
  top: 2px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 0 2px;
  pointer-events: none;
}
.st-ex-card-art-live-line {
  margin: 0;
  font-size: 9px;
  line-height: 1.25;
  font-weight: 500;
  letter-spacing: -0.01em;
  color: rgba(15, 15, 16, 0.5);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: center;
}

@media (min-width: 769px) {
  .st-ex-card-art--tagro-demo,
  .st-ex-card-art--cinematic {
    width: 236px;
    height: 164px;
  }
  .st-ex-brief-type-line {
    font-size: 10px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .st-ex-card--enter,
  .st-ex-cine-wave,
  .st-ex-cine-particle,
  .st-ex-cine-node,
  .st-ex-brief-mini-wave span,
  .st-ex-brief-type-line.is-exit,
  .st-ex-brief-caret {
    animation: none !important;
  }
  .st-ex-card--enter {
    opacity: 1;
  }
}
[data-theme="dark"] .st-ex-card-art--cinematic,
[data-theme="classic-dark"] .st-ex-card-art--cinematic {
  background: transparent;
  box-shadow: none;
}
[data-theme="dark"] .st-ex-cine,
[data-theme="classic-dark"] .st-ex-cine {
  background: transparent;
}
[data-theme="dark"] .st-ex-brief-mini-card,
[data-theme="classic-dark"] .st-ex-brief-mini-card {
  background:
    radial-gradient(90% 50% at 50% 0%, color-mix(in srgb, #fff 5%, #121214), transparent 48%),
    #121214;
  border-color: rgba(255, 255, 255, 0.05);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
}
[data-theme="dark"] .st-ex-brief-mini-card::before,
[data-theme="classic-dark"] .st-ex-brief-mini-card::before {
  background: radial-gradient(ellipse at center, color-mix(in srgb, #fff 6%, #121214), transparent 68%);
  opacity: 0.14;
}
[data-theme="dark"] .st-ex-brief-mini-wave span,
[data-theme="classic-dark"] .st-ex-brief-mini-wave span {
  background: color-mix(in srgb, #8b93a8 88%, #fff);
}
[data-theme="dark"] .st-ex-brief-mini-dur,
[data-theme="classic-dark"] .st-ex-brief-mini-dur {
  color: rgba(255, 255, 255, 0.42);
}
[data-theme="dark"] .st-ex-brief-type-line,
[data-theme="classic-dark"] .st-ex-brief-type-line {
  color: rgba(255, 255, 255, 0.52);
}
[data-theme="dark"] .st-ex-brief-type-line.is-active,
[data-theme="classic-dark"] .st-ex-brief-type-line.is-active {
  color: #ffffff;
  text-shadow: 0 0 18px rgba(255, 255, 255, 0.12);
}
[data-theme="dark"] .st-ex-brief-type-line.is-exit,
[data-theme="classic-dark"] .st-ex-brief-type-line.is-exit {
  color: rgba(255, 255, 255, 0.32);
}
[data-theme="dark"] .st-ex-cine-node-core,
[data-theme="classic-dark"] .st-ex-cine-node-core {
  fill: rgba(255, 255, 255, 0.82);
}

.st-ex-card-art--tagro-demo {
  background: transparent;
}
.st-ex-tagro-demo {
  position: relative;
  width: 100%;
  height: 100%;
  transform: scale(0.88);
  transform-origin: center top;
}
.st-ex-tagro-demo-scene {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: transparent;
}
.st-ex-tagro-demo-glow {
  display: none;
}
.st-ex-tagro-demo-portrait {
  position: absolute;
  left: 50%;
  top: 4px;
  width: 62px;
  height: 76px;
  transform: translateX(-50%);
  border-radius: 46% 46% 40% 40%;
  background:
    radial-gradient(ellipse at 50% 34%, #f0e8df 0%, #dccfbf 58%, #c8b8a8 100%);
  box-shadow:
    inset 0 -8px 18px rgba(120, 96, 72, 0.12),
    0 10px 24px rgba(72, 58, 44, 0.08);
}
.st-ex-tagro-demo-portrait::before,
.st-ex-tagro-demo-portrait::after {
  content: '';
  position: absolute;
  border-radius: 999px;
  background: rgba(72, 58, 44, 0.14);
}
.st-ex-tagro-demo-portrait::before {
  top: 38px;
  left: 22px;
  width: 10px;
  height: 4px;
  transform: rotate(-8deg);
}
.st-ex-tagro-demo-portrait::after {
  top: 38px;
  right: 22px;
  width: 10px;
  height: 4px;
  transform: rotate(8deg);
}
.st-ex-tagro-demo-composer {
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: 6px;
  padding: 8px 8px 6px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 6px 18px rgba(15, 15, 16, 0.08);
  border: 1px solid transparent;
  cursor: default;
  text-align: left;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.st-ex-tagro-demo-composer.is-ready {
  cursor: pointer;
  border-color: rgba(91, 100, 125, 0.14);
}
.st-ex-tagro-demo-composer.is-ready:hover {
  box-shadow: 0 8px 22px rgba(15, 15, 16, 0.12);
}
.st-ex-tagro-demo-composer.is-ready:focus-visible {
  outline: 2px solid color-mix(in srgb, #5b647d 55%, transparent);
  outline-offset: 2px;
}
.st-ex-tagro-demo-text {
  margin: 0 0 6px;
  min-height: 28px;
  font-size: 9.5px;
  line-height: 1.35;
  font-weight: 500;
  letter-spacing: -0.01em;
  color: #1d1d1f;
}
.st-ex-tagro-demo-caret {
  display: inline-block;
  width: 1px;
  height: 11px;
  margin-left: 1px;
  vertical-align: -1px;
  background: #5b647d;
  opacity: 0;
}
.st-ex-tagro-demo-caret.on {
  opacity: 1;
}
.st-ex-tagro-demo-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.st-ex-tagro-demo-tools {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: #8d98a6;
}
.st-ex-tagro-demo-divider {
  width: 1px;
  height: 12px;
  background: rgba(15, 15, 16, 0.1);
}
.st-ex-tagro-demo-send {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  min-width: 26px;
  min-height: 26px;
  padding: 0;
  border: 1px solid var(--festag-elev-border, rgba(0, 0, 0, 0.08));
  border-radius: 999px;
  background: var(--festag-elev-bg, #fff);
  color: #0f0f10;
  flex-shrink: 0;
  box-shadow: var(--festag-elev-shadow, 0 4px 14px rgba(15, 23, 42, 0.1));
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}
.st-ex-tagro-demo-send[aria-disabled='true'] {
  opacity: 0.42;
  cursor: default;
  box-shadow: none;
  pointer-events: none;
}
.st-ex-tagro-demo-send.ready {
  transform: scale(1.02);
  background: #0f0f10;
  color: #fff;
  border-color: #0f0f10;
}
.st-ex-tagro-demo-send.ready:hover {
  transform: scale(1.06);
  box-shadow: 0 6px 18px rgba(15, 15, 16, 0.2);
}
@media (min-width: 769px) {
  .st-ex-tagro-demo-text {
    font-size: 11px;
    min-height: 36px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .st-ex-tagro-demo-caret {
    opacity: 1;
  }
}
[data-theme="dark"] .st-ex-card-art--tagro-demo,
[data-theme="classic-dark"] .st-ex-card-art--tagro-demo {
  background: transparent;
  box-shadow: none;
}
[data-theme="dark"] .st-ex-tagro-demo-scene,
[data-theme="classic-dark"] .st-ex-tagro-demo-scene {
  background: transparent;
}
[data-theme="dark"] .st-ex-tagro-demo-portrait,
[data-theme="classic-dark"] .st-ex-tagro-demo-portrait {
  background:
    radial-gradient(ellipse at 50% 34%, #3a3a40 0%, #2a2a30 58%, #1a1a1e 100%);
}
[data-theme="dark"] .st-ex-tagro-demo-composer,
[data-theme="classic-dark"] .st-ex-tagro-demo-composer {
  background: #121214;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.35);
}
[data-theme="dark"] .st-ex-tagro-demo-text,
[data-theme="classic-dark"] .st-ex-tagro-demo-text {
  color: #f5f5f7;
}
[data-theme="dark"] .st-ex-tagro-demo-tools,
[data-theme="classic-dark"] .st-ex-tagro-demo-tools {
  color: #8d98a6;
}
[data-theme="dark"] .st-ex-tagro-demo-send,
[data-theme="classic-dark"] .st-ex-tagro-demo-send {
  background: #f5f5f7;
  color: #0f0f10;
}

.st-ex-art-fill {
  fill: color-mix(in srgb, currentColor 5%, transparent);
  stroke: none;
}
.st-ex-art-stroke {
  stroke: currentColor;
  stroke-width: 1;
  fill: none;
  stroke-linejoin: round;
  stroke-linecap: round;
  vector-effect: non-scaling-stroke;
  opacity: 0.78;
}
.st-ex-art-stroke--soft {
  opacity: 0.42;
}
.st-ex-art-stroke--hair {
  opacity: 0.55;
  stroke-width: 0.85;
}
.st-ex-art-ghost {
  opacity: 0.2;
}
.st-ex-art-ghost .st-ex-art-stroke {
  opacity: 1;
}
.st-ex-art-ghost--reflect {
  transform: translateY(6px);
}
@keyframes stExArtFloat {
  0%, 100% { transform: translateY(0); opacity: 0.92; }
  50% { transform: translateY(-3px); opacity: 1; }
}
@keyframes stExArtLift {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}
@keyframes stExArtSecond {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
.st-ex-art-layer {
  transform-box: fill-box;
  transform-origin: center;
}
.st-ex-art-layer--1 { animation: stExArtFloat 5.2s ease-in-out infinite; }
.st-ex-art-layer--2 { animation: stExArtFloat 5.2s ease-in-out infinite 0.18s; }
.st-ex-art-layer--3 { animation: stExArtFloat 5.2s ease-in-out infinite 0.36s; }
.st-ex-art-lift {
  animation: stExArtLift 4.8s ease-in-out infinite;
  transform-box: fill-box;
  transform-origin: center;
}
.st-ex-art-second {
  animation: stExArtSecond 12s linear infinite;
  transform-origin: 70px 48px;
}
.st-ex-card:hover .st-ex-art-lift {
  animation-duration: 3.6s;
}
@media (prefers-reduced-motion: reduce) {
  .st-ex-art-layer--1,
  .st-ex-art-layer--2,
  .st-ex-art-layer--3,
  .st-ex-art-lift,
  .st-ex-art-second,
  .st-ex-art-cube {
    animation: none !important;
  }
}
.st-ex-card-badge {
  position: absolute;
  top: 22px;
  right: 22px;
  padding: 4px 8px;
  border-radius: 999px;
  background: #fff;
  color: #5b647d;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: -0.005em;
}
.st-ex-card-title {
  margin: 0;
  font-size: 20px;
  font-weight: 500;
  letter-spacing: -0.005em;
  line-height: 1.2;
  color: #0f0f10;
}
.st-ex-card-sub {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  line-height: 18px;
  color: #696e70;
  letter-spacing: 0.007em;
}

.st-ex-fab-desktop {
  display: none;
}

.st-ex-mobile-head {
  display: none;
}
@media (max-width: 1400px) {
  .st-ex-hero {
    padding-top: clamp(56px, 6.5vh, 72px);
  }
}

@media (max-width: 1100px) {
  .st-ex-hero {
    padding-top: clamp(52px, 6vh, 64px);
  }
}

@media (max-width: 768px) {
  .st-ex {
    padding: 0 16px 96px;
    background: transparent;
  }
  .st-ex-card {
    flex: 0 0 min(260px, 78vw);
    width: min(260px, 78vw);
  }
  .st-ex-row-fade {
    width: 72px;
  }
  .st-ex-mobile-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    padding: 16px 0 8px;
    position: sticky;
    top: 0;
    z-index: 4;
    background: var(--portal-card, var(--surface, #fff));
  }
  .st-ex-hero { display: none; }
  .st-ex-fab-desktop { display: none !important; }
}

[data-theme="dark"] .st-ex,
[data-theme="classic-dark"] .st-ex {
  --st-ex-surface: rgba(255, 255, 255, 0.06);
  --st-ex-surface-hover: rgba(255, 255, 255, 0.09);
  color: #f5f5f7;
  background: var(--portal-card, #0c0c0e);
}
[data-theme="dark"] .st-ex-hero,
[data-theme="classic-dark"] .st-ex-hero {
  background: var(--portal-card, #0c0c0e);
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  --festag-scroll-fade-bg: var(--portal-card, #0c0c0e);
}
[data-theme="dark"] .st-ex-hero::before,
[data-theme="classic-dark"] .st-ex-hero::before {
  background: var(--festag-scroll-fade-bg, var(--portal-card, #0c0c0e));
}
[data-theme="dark"] .st-ex-title,
[data-theme="classic-dark"] .st-ex-title,
[data-theme="dark"] .st-ex-block-title,
[data-theme="classic-dark"] .st-ex-block-title,
[data-theme="dark"] .st-ex-card-title,
[data-theme="classic-dark"] .st-ex-card-title {
  color: #f5f5f7;
}
[data-theme="dark"] .st-ex-title-muted,
[data-theme="classic-dark"] .st-ex-title-muted {
  color: #8d98a6;
}
[data-theme="dark"] .st-ex-tool,
[data-theme="classic-dark"] .st-ex-tool {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.1);
  color: #9aa0ac;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.07),
    0 2px 6px -2px rgba(0, 0, 0, 0.28),
    0 6px 14px -6px rgba(0, 0, 0, 0.24);
}
[data-theme="dark"] .st-ex-tool:hover,
[data-theme="classic-dark"] .st-ex-tool:hover {
  background: rgba(255, 255, 255, 0.09);
  color: #f4f4f4;
  border-color: rgba(255, 255, 255, 0.14);
}
[data-theme="dark"] .st-ex-cta,
[data-theme="classic-dark"] .st-ex-cta {
  background: #5b647d;
  color: #fff;
  box-shadow: none;
}
[data-theme="dark"] .st-ex-cta:hover,
[data-theme="classic-dark"] .st-ex-cta:hover {
  background: color-mix(in srgb, #5b647d 92%, #fff);
}
[data-theme="dark"] .st-ex-tool-icon--lightning,
[data-theme="classic-dark"] .st-ex-tool-icon--lightning {
  color: #6e7681;
}
[data-theme="dark"] .st-ex-tool:hover .st-ex-tool-icon--lightning,
[data-theme="classic-dark"] .st-ex-tool:hover .st-ex-tool-icon--lightning {
  color: #8d98a6;
}
[data-theme="dark"] .st-ex-card,
[data-theme="classic-dark"] .st-ex-card {
  background: var(--st-ex-surface);
  border-color: transparent;
  box-shadow: none;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}
[data-theme="dark"] .st-ex-card:hover,
[data-theme="classic-dark"] .st-ex-card:hover {
  background: var(--st-ex-surface-hover);
}
[data-theme="dark"] .st-ex-card-art,
[data-theme="classic-dark"] .st-ex-card-art {
  color: #c8c8cd;
}
[data-theme="dark"] .st-ex-card-sub,
[data-theme="classic-dark"] .st-ex-card-sub {
  color: #a1a1aa;
}
[data-theme="dark"] .st-ex-card-badge,
[data-theme="classic-dark"] .st-ex-card-badge {
  background: #121214;
  color: #c7c7cc;
}
[data-theme="dark"] .st-ex-row-fade,
[data-theme="classic-dark"] .st-ex-row-fade {
  background: linear-gradient(
    270deg,
    var(--portal-card, #0c0c0e) 0%,
    rgba(12, 12, 14, 0) 100%
  );
}
[data-theme="dark"] .st-ex-dotnav-bg,
[data-theme="classic-dark"] .st-ex-dotnav-bg,
[data-theme="dark"] .st-ex-play,
[data-theme="classic-dark"] .st-ex-play,
[data-theme="dark"] .st-ex-paddle,
[data-theme="classic-dark"] .st-ex-paddle {
  background: var(--st-ex-surface);
  color: #f5f5f7;
}
[data-theme="dark"] .st-ex-play:hover,
[data-theme="classic-dark"] .st-ex-play:hover,
[data-theme="dark"] .st-ex-paddle:not(:disabled):hover,
[data-theme="classic-dark"] .st-ex-paddle:not(:disabled):hover {
  background: var(--st-ex-surface-hover);
}
[data-theme="dark"] .st-ex-paddle,
[data-theme="classic-dark"] .st-ex-paddle {
  color: rgba(255, 255, 255, 0.38);
}
[data-theme="dark"] .st-ex-paddle:not(:disabled),
[data-theme="classic-dark"] .st-ex-paddle:not(:disabled) {
  color: #f5f5f7;
}
[data-theme="dark"] .st-ex-dotnav-item,
[data-theme="classic-dark"] .st-ex-dotnav-item {
  background: rgba(255, 255, 255, 0.28);
}
[data-theme="dark"] .st-ex-dotnav-item.on,
[data-theme="classic-dark"] .st-ex-dotnav-item.on {
  background: rgba(255, 255, 255, 0.12);
}
[data-theme="dark"] .st-ex-cine-24h-label,
[data-theme="classic-dark"] .st-ex-cine-24h-label,
[data-theme="dark"] .st-ex-card-art-live-line,
[data-theme="classic-dark"] .st-ex-card-art-live-line {
  color: rgba(255, 255, 255, 0.52);
}
[data-theme="dark"] .st-ex-cine-node-label,
[data-theme="classic-dark"] .st-ex-cine-node-label {
  fill: rgba(255, 255, 255, 0.58);
}
[data-theme="dark"] .st-ex-dotnav-progress,
[data-theme="classic-dark"] .st-ex-dotnav-progress {
  background: rgba(255, 255, 255, 0.82);
}
`
