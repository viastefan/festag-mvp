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
  gap: 32px;
  min-width: 0;
}
.st-ex-title {
  margin: 0;
  font-size: clamp(30px, 3.6vw, 40px);
  font-weight: 400;
  line-height: 1;
  letter-spacing: -0.8px;
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

.st-ex-card {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: flex-start;
  gap: 10px;
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
.st-ex-card-icon {
  position: absolute;
  left: 50%;
  top: 58px;
  transform: translateX(-50%);
  color: #0f0f10;
  opacity: 0.92;
  pointer-events: none;
}
.st-ex-card-icon--chevron {
  font-size: 40px;
  font-weight: 500;
  line-height: 1;
  top: 42px;
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
`
