/** Scoped styles for Phase 2 Workspace Creation wizard. */

export const WORKSPACE_CREATE_WIZARD_CSS = `
.wc-wizard {
  width: 100%;
  max-width: 440px;
  margin: 0 auto;
}

.wc-hero-title {
  margin: 0;
  font-family: var(--al-font, Aeonik, system-ui, sans-serif);
  font-size: clamp(28px, 4.2vw, 36px);
  font-weight: 400;
  letter-spacing: -0.025em;
  line-height: 1.18;
  color: var(--al-text, rgba(245, 245, 247, 0.96));
}

.wc-hero-support {
  margin: 14px 0 0;
  font-size: 15.5px;
  line-height: 1.55;
  color: var(--al-text-muted, rgba(245, 245, 247, 0.55));
  max-width: 36ch;
}

.wc-field-label {
  display: block;
  margin: 28px 0 10px;
  font-size: 13px;
  letter-spacing: 0.01em;
  color: var(--al-text-muted, rgba(245, 245, 247, 0.55));
}

.wc-subdomain {
  display: block;
  margin-top: 10px;
  font-size: 13.5px;
  letter-spacing: -0.01em;
  color: rgba(245, 245, 247, 0.42);
  font-variant-numeric: tabular-nums;
  transition: color 160ms ease;
}

.wc-subdomain.is-ready {
  color: rgba(245, 245, 247, 0.62);
}

.wc-use-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 28px;
}

.wc-use-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  width: 100%;
  text-align: left;
  padding: 16px 18px;
  border-radius: 10px;
  background: rgba(186, 194, 210, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
  color: rgba(245, 245, 247, 0.88);
  cursor: pointer;
  transition: background 140ms ease, border-color 140ms ease, transform 140ms ease;
}

.wc-use-card:hover {
  background: rgba(186, 194, 210, 0.09);
  border-color: rgba(255, 255, 255, 0.09);
}

.wc-use-card:active {
  transform: scale(0.992);
}

.wc-use-card.is-selected {
  background: rgba(235, 232, 227, 0.1);
  border-color: rgba(235, 232, 227, 0.28);
}

.wc-use-card-title {
  font-size: 16px;
  font-weight: 500;
  letter-spacing: -0.015em;
  line-height: 1.25;
  color: rgba(245, 245, 247, 0.94);
}

.wc-use-card-body {
  font-size: 13.5px;
  line-height: 1.45;
  color: rgba(245, 245, 247, 0.52);
}

.wc-footnote {
  margin: 18px 0 0;
  font-size: 13px;
  line-height: 1.5;
  color: rgba(245, 245, 247, 0.42);
}

.wc-actions {
  margin-top: 28px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.wc-creating {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 28px;
  min-height: 220px;
  justify-content: center;
}

.wc-creating-lines {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.wc-creating-line {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 15px;
  letter-spacing: -0.01em;
  color: rgba(245, 245, 247, 0.38);
  opacity: 0;
  transform: translateY(8px);
  transition: opacity 320ms ease, transform 320ms ease, color 320ms ease;
}

.wc-creating-line.is-on {
  opacity: 1;
  transform: translateY(0);
  color: rgba(245, 245, 247, 0.88);
}

.wc-creating-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(235, 232, 227, 0.85);
  flex-shrink: 0;
}

.wc-welcome {
  min-height: 220px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 10px;
  animation: wcWelcomeIn 480ms ease both;
}

@keyframes wcWelcomeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.wc-welcome-title {
  margin: 0;
  font-size: clamp(28px, 4.2vw, 36px);
  font-weight: 400;
  letter-spacing: -0.025em;
  line-height: 1.18;
  color: rgba(245, 245, 247, 0.96);
}

.wc-plan {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: 36ch;
}

.wc-plan-title {
  margin: 0;
  font-size: clamp(26px, 3.8vw, 32px);
  font-weight: 400;
  letter-spacing: -0.025em;
  line-height: 1.2;
  color: rgba(245, 245, 247, 0.96);
}

.wc-plan-body {
  margin: 0;
  font-size: 15.5px;
  line-height: 1.55;
  color: rgba(245, 245, 247, 0.55);
}

@media (max-width: 768px) {
  .wc-wizard { max-width: none; }
  .wc-hero-title,
  .wc-welcome-title,
  .wc-plan-title { font-size: 28px; }
  .wc-use-card { padding: 15px 16px; }
}
`
