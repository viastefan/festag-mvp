export const OS_DASHBOARD_CSS = `
  .fos-root {
    --fos-bg: var(--bg, #FBF7EE);
    --fos-surface: var(--surface, #FFFFFF);
    --fos-text: var(--text, #1E1E20);
    --fos-muted: var(--text-muted, #8891a0);
    --fos-soft: var(--text-secondary, #5c5c62);
    --fos-border: var(--border, rgba(15,15,18,0.08));
    --fos-accent: #D4A853;
    --fos-accent-soft: rgba(212,168,83,0.12);
    --fos-risk-red: #C94444;
    --fos-risk-soft: rgba(201,68,68,0.10);
    --fos-green: #34A853;
    --fos-green-soft: rgba(52,168,83,0.10);
    --fos-cta-bg: #2D2E2C;
    --fos-cta-text: #FAFAFA;
    --fos-radius: 16px;
    --fos-font: var(--font-aeonik, 'Aeonik', 'Inter', -apple-system, sans-serif);

    width: 100%;
    min-height: 100vh;
    min-height: 100dvh;
    background: var(--fos-bg);
    color: var(--fos-text);
    font-family: var(--fos-font);
    font-weight: 400;
    letter-spacing: 0;
    overflow-x: hidden;
    position: relative;
  }

  /* ── Desktop Layout ── */
  .fos-desktop {
    display: grid;
    grid-template-columns: 1fr 1.4fr 1fr;
    gap: 0;
    min-height: 100vh;
    min-height: 100dvh;
    padding: 0;
  }
  .fos-left {
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 80px 48px 80px 64px;
    max-width: 480px;
  }
  .fos-center {
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    min-height: 600px;
  }
  .fos-right {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-start;
    padding: 80px 64px 80px 48px;
    gap: 24px;
  }

  /* ── Mobile Layout ── */
  .fos-mobile {
    display: none;
    flex-direction: column;
    min-height: 100vh;
    min-height: 100dvh;
    padding: 0;
  }
  .fos-m-graph-area {
    position: relative;
    width: 100%;
    height: 340px;
    flex-shrink: 0;
  }
  .fos-m-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 28px 24px 120px;
    gap: 24px;
  }
  .fos-m-dock {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: space-around;
    height: 72px;
    padding: 0 24px;
    padding-bottom: env(safe-area-inset-bottom, 0);
    background: rgba(251,247,238,0.92);
    backdrop-filter: blur(20px) saturate(1.8);
    -webkit-backdrop-filter: blur(20px) saturate(1.8);
    border-top: 1px solid rgba(15,15,18,0.06);
  }
  .fos-m-dock-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    border: 0;
    background: transparent;
    color: var(--fos-muted);
    font: inherit;
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.02em;
    padding: 6px 12px;
    transition: color 0.2s ease;
  }
  .fos-m-dock-item.active {
    color: var(--fos-text);
  }
  .fos-m-dock-orb {
    width: 52px;
    height: 52px;
    border-radius: 50%;
    background: var(--fos-cta-bg);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: -20px;
    box-shadow: 0 4px 20px rgba(45,46,44,0.25);
  }

  @media (max-width: 1024px) {
    .fos-desktop { display: none; }
    .fos-mobile { display: flex; }
  }

  /* ── Greeting ── */
  .fos-greeting h1 {
    font-size: clamp(28px, 4vw, 38px);
    font-weight: 500;
    letter-spacing: -0.02em;
    line-height: 1.15;
    margin: 0 0 20px;
    color: var(--fos-text);
  }
  .fos-greeting p {
    font-size: 16px;
    line-height: 1.6;
    color: var(--fos-soft);
    margin: 0 0 8px;
    max-width: 380px;
  }

  /* ── Action Items ── */
  .fos-actions {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 28px;
  }
  .fos-action-card {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 18px;
    background: var(--fos-surface);
    border-radius: 14px;
    border: 1px solid var(--fos-border);
    transition: all 0.2s ease;
    font: inherit;
    text-align: left;
    width: 100%;
    color: var(--fos-text);
  }
  .fos-action-card:hover {
    border-color: rgba(15,15,18,0.14);
    box-shadow: 0 2px 12px rgba(15,15,18,0.06);
    transform: translateY(-1px);
  }
  .fos-action-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .fos-action-dot.amber {
    background: var(--fos-accent);
    box-shadow: 0 0 0 3px var(--fos-accent-soft);
  }
  .fos-action-dot.red {
    background: var(--fos-risk-red);
    box-shadow: 0 0 0 3px var(--fos-risk-soft);
  }
  .fos-action-copy {
    flex: 1;
    min-width: 0;
  }
  .fos-action-title {
    font-size: 14px;
    font-weight: 500;
    margin: 0;
    letter-spacing: -0.01em;
  }
  .fos-action-sub {
    font-size: 12px;
    color: var(--fos-muted);
    margin: 2px 0 0;
  }
  .fos-action-badge {
    display: inline-flex;
    align-items: center;
    padding: 3px 8px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.02em;
    text-transform: uppercase;
  }
  .fos-action-badge.amber {
    background: var(--fos-accent-soft);
    color: #A07D30;
  }
  .fos-action-badge.red {
    background: var(--fos-risk-soft);
    color: #A03030;
  }
  .fos-action-badge.green {
    background: var(--fos-green-soft);
    color: #2A7A3E;
  }
  .fos-action-chevron {
    color: var(--fos-muted);
    flex-shrink: 0;
    transition: transform 0.2s ease;
  }
  .fos-action-card:hover .fos-action-chevron {
    transform: translateX(2px);
  }

  /* ── CTA Buttons ── */
  .fos-cta-row {
    display: flex;
    gap: 10px;
    margin-top: 28px;
    flex-wrap: wrap;
  }
  .fos-btn-primary {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 44px;
    padding: 0 20px;
    border-radius: 12px;
    background: var(--fos-cta-bg);
    color: var(--fos-cta-text);
    border: 0;
    font: inherit;
    font-size: 14px;
    font-weight: 500;
    letter-spacing: -0.01em;
    transition: all 0.2s ease;
    box-shadow: 0 2px 8px rgba(45,46,44,0.12);
  }
  .fos-btn-primary:hover {
    background: #1a1a1a;
    box-shadow: 0 4px 16px rgba(45,46,44,0.18);
    transform: translateY(-1px);
  }
  .fos-btn-secondary {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 44px;
    padding: 0 20px;
    border-radius: 12px;
    background: transparent;
    color: var(--fos-text);
    border: 1px solid var(--fos-border);
    font: inherit;
    font-size: 14px;
    font-weight: 500;
    letter-spacing: -0.01em;
    transition: all 0.2s ease;
  }
  .fos-btn-secondary:hover {
    background: rgba(15,15,18,0.03);
    border-color: rgba(15,15,18,0.14);
  }

  /* ── Filter ── */
  .fos-filter {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    border-radius: 10px;
    border: 1px solid var(--fos-border);
    background: transparent;
    color: var(--fos-soft);
    font: inherit;
    font-size: 13px;
    font-weight: 400;
    margin-top: 16px;
    transition: all 0.15s ease;
  }
  .fos-filter:hover {
    border-color: rgba(15,15,18,0.14);
    color: var(--fos-text);
  }

  /* ── Right Panel Cards ── */
  .fos-panel-card {
    width: 100%;
    max-width: 280px;
    padding: 20px;
    background: var(--fos-surface);
    border-radius: 14px;
    border: 1px solid var(--fos-border);
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .fos-panel-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .fos-panel-title {
    font-size: 15px;
    font-weight: 500;
    letter-spacing: -0.01em;
    margin: 0;
  }
  .fos-panel-count {
    font-size: 12px;
    color: var(--fos-muted);
  }
  .fos-panel-rows {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .fos-panel-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 0;
  }
  .fos-panel-row-left {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .fos-panel-row-label {
    font-size: 13px;
    color: var(--fos-soft);
  }
  .fos-panel-row-count {
    font-size: 13px;
    font-weight: 500;
    color: var(--fos-text);
    min-width: 20px;
    text-align: right;
  }
  .fos-panel-link {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 0 0;
    border-top: 1px solid var(--fos-border);
    font-size: 13px;
    color: var(--fos-soft);
    border-bottom: 0;
    border-left: 0;
    border-right: 0;
    background: transparent;
    width: 100%;
    text-align: left;
    font: inherit;
    transition: color 0.15s ease;
  }
  .fos-panel-link:hover {
    color: var(--fos-text);
  }

  /* ── Chat Input ── */
  .fos-chat-input-wrap {
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 40;
    display: flex;
    align-items: center;
    gap: 8px;
    width: 320px;
    height: 48px;
    padding: 0 8px 0 18px;
    background: var(--fos-surface);
    border-radius: 14px;
    border: 1px solid var(--fos-border);
    box-shadow: 0 4px 24px rgba(15,15,18,0.08);
  }
  .fos-chat-input {
    flex: 1;
    border: 0;
    background: transparent;
    font: inherit;
    font-size: 14px;
    color: var(--fos-text);
    outline: none;
  }
  .fos-chat-input::placeholder {
    color: var(--fos-muted);
  }
  .fos-chat-send {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: var(--fos-cta-bg);
    border: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    flex-shrink: 0;
    transition: background 0.15s ease;
  }
  .fos-chat-send:hover {
    background: #1a1a1a;
  }

  @media (max-width: 1024px) {
    .fos-chat-input-wrap {
      bottom: 84px;
      left: 16px;
      right: 16px;
      width: auto;
    }
  }

  /* ── Bottom Sheet ── */
  .fos-sheet-backdrop {
    position: fixed;
    inset: 0;
    z-index: 100;
    background: rgba(251,247,238,0.6);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }
  .fos-sheet {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 101;
    max-height: 85vh;
    background: var(--fos-surface);
    border-radius: 20px 20px 0 0;
    box-shadow: 0 -8px 40px rgba(15,15,18,0.12);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .fos-sheet-handle {
    width: 36px;
    height: 4px;
    border-radius: 2px;
    background: rgba(15,15,18,0.12);
    margin: 10px auto 0;
    flex-shrink: 0;
  }
  .fos-sheet-content {
    flex: 1;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 20px 24px 40px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  /* ── Desktop Floating Panel ── */
  .fos-float-panel {
    position: fixed;
    z-index: 100;
    width: 420px;
    max-height: 70vh;
    background: var(--fos-surface);
    border-radius: 18px;
    border: 1px solid var(--fos-border);
    box-shadow:
      0 8px 32px rgba(15,15,18,0.10),
      0 24px 64px -12px rgba(15,15,18,0.14);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .fos-float-content {
    flex: 1;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  /* ── Progress Line ── */
  .fos-progress {
    display: flex;
    align-items: center;
    gap: 0;
    padding: 0 4px;
    margin-bottom: 20px;
  }
  .fos-progress-dot {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
  }
  .fos-progress-dot.active {
    background: var(--fos-accent);
    box-shadow: 0 0 0 4px var(--fos-accent-soft);
  }
  .fos-progress-dot.done {
    background: var(--fos-accent);
  }
  .fos-progress-dot.pending {
    background: rgba(15,15,18,0.08);
  }
  .fos-progress-line {
    flex: 1;
    height: 2px;
    background: rgba(15,15,18,0.08);
    transition: background 0.3s ease;
  }
  .fos-progress-line.done {
    background: var(--fos-accent);
  }

  /* risk variant */
  .fos-progress-dot.active.risk {
    background: var(--fos-green);
    box-shadow: 0 0 0 4px var(--fos-green-soft);
  }
  .fos-progress-dot.done.risk {
    background: var(--fos-green);
  }
  .fos-progress-line.done.risk {
    background: var(--fos-green);
  }

  /* ── Decision Content ── */
  .fos-dec-counter {
    font-size: 13px;
    color: var(--fos-accent);
    font-weight: 500;
    letter-spacing: 0.01em;
  }
  .fos-dec-title {
    font-size: 26px;
    font-weight: 500;
    letter-spacing: -0.02em;
    line-height: 1.2;
    margin: 4px 0 0;
  }
  .fos-dec-subtitle {
    font-size: 15px;
    color: var(--fos-soft);
    line-height: 1.5;
    margin: 6px 0 0;
  }
  .fos-dec-tagro-rec {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    background: var(--fos-accent-soft);
    border-radius: 10px;
    font-size: 14px;
    font-weight: 500;
    color: var(--fos-text);
  }
  .fos-dec-tagro-star {
    color: var(--fos-accent);
    flex-shrink: 0;
  }

  /* ── Options ── */
  .fos-options {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .fos-option {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 16px 18px;
    border-radius: 14px;
    border: 1.5px solid transparent;
    background: rgba(15,15,18,0.03);
    transition: all 0.2s ease;
    font: inherit;
    text-align: left;
    width: 100%;
    color: var(--fos-text);
  }
  .fos-option:hover {
    background: rgba(15,15,18,0.05);
  }
  .fos-option.selected {
    background: var(--fos-accent-soft);
    border-color: var(--fos-accent);
  }
  .fos-option-radio {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 2px solid rgba(15,15,18,0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: all 0.2s ease;
  }
  .fos-option.selected .fos-option-radio {
    border-color: var(--fos-accent);
    background: var(--fos-accent);
  }
  .fos-option-radio-inner {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #fff;
    opacity: 0;
    transition: opacity 0.2s ease;
  }
  .fos-option.selected .fos-option-radio-inner {
    opacity: 1;
  }
  .fos-option-label {
    font-size: 15px;
    font-weight: 500;
    letter-spacing: -0.01em;
  }

  /* risk option variant */
  .fos-option.selected.risk {
    background: var(--fos-green-soft);
    border-color: var(--fos-green);
  }
  .fos-option.selected.risk .fos-option-radio {
    border-color: var(--fos-green);
    background: var(--fos-green);
  }

  /* ── Tagro Bottom Sheet ── */
  .fos-tagro-sheet {
    background: var(--fos-cta-bg);
    color: var(--fos-cta-text);
    border-radius: 18px;
    padding: 22px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .fos-tagro-head {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .fos-tagro-name {
    font-size: 18px;
    font-weight: 500;
    letter-spacing: -0.01em;
  }
  .fos-tagro-why {
    font-size: 13px;
    color: rgba(255,255,255,0.6);
  }
  .fos-tagro-reasons {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .fos-tagro-reason {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    font-size: 14px;
    line-height: 1.45;
  }
  .fos-tagro-check {
    color: var(--fos-accent);
    flex-shrink: 0;
    margin-top: 2px;
  }
  .fos-tagro-accept {
    height: 48px;
    border-radius: 12px;
    background: var(--fos-accent);
    color: #fff;
    border: 0;
    font: inherit;
    font-size: 15px;
    font-weight: 500;
    letter-spacing: -0.01em;
    transition: all 0.2s ease;
    margin-top: 4px;
  }
  .fos-tagro-accept:hover {
    background: #C49A48;
    transform: translateY(-1px);
  }
  .fos-tagro-accept.risk {
    background: var(--fos-green);
  }
  .fos-tagro-accept.risk:hover {
    background: #2A8A48;
  }

  /* ── Transfer Animation ── */
  .fos-transfer-overlay {
    position: fixed;
    inset: 0;
    z-index: 200;
    background: var(--fos-bg);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 24px;
  }
  .fos-transfer-text {
    font-size: 18px;
    font-weight: 500;
    color: var(--fos-text);
    letter-spacing: -0.01em;
    text-align: center;
  }
  .fos-transfer-sub {
    font-size: 14px;
    color: var(--fos-muted);
    text-align: center;
  }
  .fos-transfer-undo {
    height: 40px;
    padding: 0 20px;
    border-radius: 10px;
    background: transparent;
    border: 1px solid var(--fos-border);
    color: var(--fos-soft);
    font: inherit;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s ease;
    margin-top: 8px;
  }
  .fos-transfer-undo:hover {
    border-color: rgba(15,15,18,0.2);
    color: var(--fos-text);
  }
  .fos-transfer-confirm {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    font-size: 13px;
    color: var(--fos-muted);
    margin-top: 8px;
  }

  /* ── Success Screen ── */
  .fos-success-overlay {
    position: fixed;
    inset: 0;
    z-index: 200;
    background: var(--fos-bg);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
  }
  .fos-success-check {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: var(--fos-accent-soft);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--fos-accent);
  }
  .fos-success-check.risk {
    background: var(--fos-green-soft);
    color: var(--fos-green);
  }
  .fos-success-title {
    font-size: 22px;
    font-weight: 500;
    letter-spacing: -0.02em;
    margin: 8px 0 0;
  }
  .fos-success-sub {
    font-size: 14px;
    color: var(--fos-muted);
    max-width: 300px;
    text-align: center;
    line-height: 1.5;
  }

  /* ── Continue Screen ── */
  .fos-continue-overlay {
    position: fixed;
    inset: 0;
    z-index: 200;
    background: var(--fos-bg);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
  }
  .fos-continue-star {
    color: var(--fos-accent);
    margin-bottom: 4px;
  }
  .fos-continue-star.risk {
    color: var(--fos-green);
  }
  .fos-continue-title {
    font-size: 24px;
    font-weight: 500;
    letter-spacing: -0.02em;
  }
  .fos-continue-sub {
    font-size: 14px;
    color: var(--fos-muted);
    max-width: 300px;
    text-align: center;
    line-height: 1.5;
  }

  /* ── Risk-specific ── */
  .fos-risk-detail {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .fos-risk-name {
    font-size: 16px;
    font-weight: 500;
    letter-spacing: -0.01em;
  }
  .fos-risk-desc {
    font-size: 14px;
    color: var(--fos-soft);
    line-height: 1.5;
  }
  .fos-risk-levels {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .fos-risk-level-label {
    font-size: 13px;
    font-weight: 500;
    color: var(--fos-soft);
    margin: 0 0 6px;
  }
  .fos-risk-level-options {
    display: flex;
    gap: 6px;
  }
  .fos-risk-level-btn {
    flex: 1;
    height: 38px;
    border-radius: 10px;
    border: 1.5px solid var(--fos-border);
    background: transparent;
    font: inherit;
    font-size: 13px;
    font-weight: 500;
    color: var(--fos-soft);
    transition: all 0.2s ease;
  }
  .fos-risk-level-btn:hover {
    border-color: rgba(15,15,18,0.2);
    color: var(--fos-text);
  }
  .fos-risk-level-btn.active {
    border-color: var(--fos-cta-bg);
    background: rgba(45,46,44,0.06);
    color: var(--fos-text);
    font-weight: 500;
  }

  /* ── Graph ── */
  .fos-graph-svg {
    width: 100%;
    height: 100%;
    overflow: visible;
  }
  .fos-graph-wrap {
    width: 100%;
    height: 100%;
    position: relative;
  }

  /* ── Node hover ── */
  .fos-node-group {
    transition: transform 0.3s ease;
  }
  .fos-node-group:hover {
    transform: scale(1.04);
  }
  .fos-node-label {
    font-family: var(--fos-font);
    font-size: 13px;
    font-weight: 500;
    fill: var(--fos-text);
    letter-spacing: -0.01em;
    pointer-events: none;
  }
  .fos-node-sublabel {
    font-family: var(--fos-font);
    font-size: 11px;
    fill: var(--fos-muted);
    font-weight: 400;
    pointer-events: none;
  }
  .fos-node-badge {
    font-family: var(--fos-font);
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.02em;
    pointer-events: none;
  }
`
