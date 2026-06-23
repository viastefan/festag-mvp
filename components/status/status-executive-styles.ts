export const STATUS_EXECUTIVE_CSS = `
.st-ex {
  --st-ex-surface: #f5f5f7;
  --st-ex-surface-hover: #ebebed;
  --st-ex-pad-x: clamp(24px, 10vw, 164px);
  --st-ex-pad-top: clamp(24px, 3.5vw, 48px);
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
  background: var(--portal-card, #fff);
}

.st-ex-hero {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin: 0 calc(-1 * var(--st-ex-pad-x)) clamp(28px, 4vw, 40px);
  padding: var(--st-ex-pad-top) var(--st-ex-pad-x) 28px;
  background: var(--portal-card, #ffffff);
  box-shadow: 0 -64px 0 64px var(--portal-card, #ffffff);
  isolation: isolate;
}
.st-ex-hero::before {
  content: '';
  pointer-events: none;
  position: absolute;
  left: calc(-1 * var(--st-ex-pad-x));
  right: calc(-1 * var(--st-ex-pad-x));
  top: -64px;
  bottom: 0;
  z-index: -1;
  background: var(--portal-card, #ffffff);
}
.st-ex-hero::after {
  content: '';
  pointer-events: none;
  position: absolute;
  left: calc(-1 * var(--st-ex-pad-x));
  right: calc(-1 * var(--st-ex-pad-x));
  bottom: -36px;
  height: 36px;
  z-index: -1;
  background: linear-gradient(
    180deg,
    var(--portal-card, #ffffff) 0%,
    transparent 100%
  );
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
  border-radius: 16px;
  border: none;
  background: var(--st-ex-surface);
  text-decoration: none;
  color: inherit;
  text-align: left;
  cursor: pointer;
  box-sizing: border-box;
  overflow: hidden;
  transition: background 0.15s ease, transform 0.15s ease;
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

/* Gesamtbericht — lyrics stream */
.st-ex-cine--lyrics {
  color: #3a3a40;
}
.st-ex-cine-lyrics-mask {
  position: absolute;
  inset: 0;
  overflow: hidden;
}
.st-ex-cine-lyrics-mask::before,
.st-ex-cine-lyrics-mask::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  height: 28%;
  z-index: 2;
  pointer-events: none;
}
.st-ex-cine-lyrics-mask::before {
  top: 0;
  background: linear-gradient(180deg, var(--st-ex-surface) 12%, transparent);
}
.st-ex-cine-lyrics-mask::after {
  bottom: 0;
  background: linear-gradient(0deg, var(--st-ex-surface) 12%, transparent);
}
.st-ex-cine-lyrics-track {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 36px 8px 28px;
  animation: stExLyricsScroll 16s cubic-bezier(0.45, 0.05, 0.25, 1) infinite;
}
.st-ex-cine-lyrics-line {
  margin: 0;
  font-size: 9.5px;
  line-height: 1.35;
  font-weight: 500;
  letter-spacing: -0.01em;
  color: rgba(15, 15, 16, 0.34);
  white-space: nowrap;
  transition: color 0.35s ease, text-shadow 0.35s ease, opacity 0.35s ease;
}
.st-ex-cine-lyrics-line:nth-child(4n + 3) {
  color: rgba(15, 15, 16, 0.88);
  text-shadow: 0 0 14px rgba(91, 100, 125, 0.22);
}
.st-ex-cine-lyrics-focus {
  pointer-events: none;
  position: absolute;
  left: 6px;
  right: 6px;
  top: 50%;
  height: 14px;
  transform: translateY(-50%);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.28);
  box-shadow: none;
  z-index: 1;
}
@keyframes stExLyricsScroll {
  0% { transform: translateY(0); }
  100% { transform: translateY(-50%); }
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
  .st-ex-cine-lyrics-line {
    font-size: 10px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .st-ex-card--enter,
  .st-ex-cine-lyrics-track,
  .st-ex-cine-wave,
  .st-ex-cine-particle,
  .st-ex-cine-node {
    animation: none !important;
  }
  .st-ex-card--enter {
    opacity: 1;
  }
}
[data-theme="dark"] .st-ex-card-art--cinematic,
[data-theme="classic-dark"] .st-ex-card-art--cinematic {
  background: var(--st-ex-surface, rgba(255, 255, 255, 0.06));
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}
[data-theme="dark"] .st-ex-cine,
[data-theme="classic-dark"] .st-ex-cine {
  background:
    radial-gradient(120% 80% at 50% 0%, rgba(255, 255, 255, 0.06), transparent 58%),
    linear-gradient(180deg, #161618 0%, #101012 100%);
}
[data-theme="dark"] .st-ex-cine-lyrics-line,
[data-theme="classic-dark"] .st-ex-cine-lyrics-line {
  color: rgba(255, 255, 255, 0.28);
}
[data-theme="dark"] .st-ex-cine-lyrics-line:nth-child(4n + 3),
[data-theme="classic-dark"] .st-ex-cine-lyrics-line:nth-child(4n + 3) {
  color: rgba(255, 255, 255, 0.9);
  text-shadow: 0 0 14px rgba(255, 255, 255, 0.12);
}
[data-theme="dark"] .st-ex-cine-lyrics-focus,
[data-theme="classic-dark"] .st-ex-cine-lyrics-focus {
  background: rgba(255, 255, 255, 0.06);
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
  width: 22px;
  height: 22px;
  border-radius: 999px;
  background: rgba(15, 15, 16, 0.88);
  color: #fff;
  flex-shrink: 0;
  transition: transform 0.2s ease, background 0.2s ease;
}
.st-ex-tagro-demo-send.ready {
  transform: scale(1.04);
  background: #0f0f10;
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

.st-ex-fab {
  position: absolute;
  right: clamp(20px, 3vw, 40px);
  bottom: clamp(20px, 3vw, 40px);
  width: 70px;
  height: 70px;
  border: none;
  border-radius: 50%;
  background: #5b647d;
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow:
    0 12px 28px rgba(91, 100, 125, 0.28),
    0 4px 10px rgba(15, 15, 16, 0.08);
  transition: transform 0.15s ease, background 0.15s ease;
  z-index: 2;
}
.st-ex-fab:hover {
  background: color-mix(in srgb, #5b647d 90%, #fff);
  transform: scale(1.03);
}

.st-ex-mobile-head {
  display: none;
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
  .st-ex-fab {
    position: fixed;
    right: 20px;
    bottom: calc(88px + env(safe-area-inset-bottom, 0px));
    margin: 0;
    float: none;
    width: 56px;
    height: 56px;
  }
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
  box-shadow: 0 -64px 0 64px var(--portal-card, #0c0c0e);
}
[data-theme="dark"] .st-ex-hero::before,
[data-theme="classic-dark"] .st-ex-hero::before {
  background: var(--portal-card, #0c0c0e);
}
[data-theme="dark"] .st-ex-hero::after,
[data-theme="classic-dark"] .st-ex-hero::after {
  background: linear-gradient(
    180deg,
    var(--portal-card, #0c0c0e) 0%,
    transparent 100%
  );
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
