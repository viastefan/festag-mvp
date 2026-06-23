export const STATUS_EXECUTIVE_CSS = `
.st-ex {
  position: relative;
  height: 100%;
  min-height: 0;
  overflow: auto;
  padding: clamp(40px, 6vw, 80px) clamp(24px, 10vw, 164px) clamp(48px, 6vw, 80px);
  box-sizing: border-box;
  -webkit-overflow-scrolling: touch;
  font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
  font-weight: 500;
  letter-spacing: 0.007em;
  color: #0f0f10;
  background: var(--portal-card, #fff);
}

.st-ex-hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: clamp(36px, 5vw, 48px);
}
.st-ex-hero-copy {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
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
  background: #f7f8f8;
}
.st-ex-cta {
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
  height: 194px;
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
  background: rgba(15, 15, 16, 0.06);
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
  background: rgba(15, 15, 16, 0.06);
  color: #0f0f10;
  cursor: pointer;
  transition: background 0.15s ease, transform 0.15s ease;
}
.st-ex-play:hover {
  background: rgba(15, 15, 16, 0.1);
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
  background: rgba(15, 15, 16, 0.12);
  color: rgba(245, 245, 247, 0.45);
  cursor: default;
  transition: background 0.15s ease, color 0.15s ease, transform 0.15s ease;
}
.st-ex-paddle:not(:disabled) {
  background: rgba(210, 210, 215, 0.95);
  color: rgba(15, 15, 16, 0.88);
  cursor: pointer;
}
.st-ex-paddle:not(:disabled):hover {
  transform: scale(1.04);
  background: rgba(220, 220, 225, 1);
}
.st-ex-paddle:disabled {
  opacity: 1;
}

.st-ex-card {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: flex-start;
  gap: 0;
  flex: 0 0 292px;
  width: 292px;
  min-height: 194px;
  scroll-snap-align: start;
  padding: 24px;
  border-radius: 16px;
  border: none;
  background: #f7f8f8;
  text-decoration: none;
  color: inherit;
  text-align: left;
  cursor: pointer;
  box-sizing: border-box;
  overflow: hidden;
  transition: background 0.15s ease, transform 0.15s ease;
}
.st-ex-card:hover {
  background: #f0f1f2;
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
  top: 22px;
  transform: translateX(-50%);
  width: 132px;
  height: 96px;
  color: #2e2e31;
  opacity: 1;
  pointer-events: none;
}
.st-ex-card-art svg {
  display: block;
  width: 100%;
  height: 100%;
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
  line-height: 1.45;
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
  color: #f5f5f7;
  background: var(--portal-card, #0c0c0e);
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
  background: #121214;
  border-color: rgba(255, 255, 255, 0.08);
  color: #f5f5f7;
  box-shadow: none;
}
[data-theme="dark"] .st-ex-card,
[data-theme="classic-dark"] .st-ex-card {
  background: rgba(255, 255, 255, 0.05);
}
[data-theme="dark"] .st-ex-card:hover,
[data-theme="classic-dark"] .st-ex-card:hover {
  background: rgba(255, 255, 255, 0.08);
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
[data-theme="classic-dark"] .st-ex-play {
  background: rgba(255, 255, 255, 0.08);
}
[data-theme="dark"] .st-ex-play,
[data-theme="classic-dark"] .st-ex-play {
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
[data-theme="dark"] .st-ex-dotnav-progress,
[data-theme="classic-dark"] .st-ex-dotnav-progress {
  background: rgba(255, 255, 255, 0.82);
}
[data-theme="dark"] .st-ex-paddle,
[data-theme="classic-dark"] .st-ex-paddle {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.28);
}
[data-theme="dark"] .st-ex-paddle:not(:disabled),
[data-theme="classic-dark"] .st-ex-paddle:not(:disabled) {
  background: rgba(255, 255, 255, 0.92);
  color: #0f0f10;
}
`
