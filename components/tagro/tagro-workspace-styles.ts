export const TAGRO_WORKSPACE_CSS = `
.tgw {
  height: 100%;
  min-height: 0;
  overflow: auto;
  padding: 32px 36px 48px;
  box-sizing: border-box;
}
.tgw-head {
  margin-bottom: 36px;
}
.tgw-kicker {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.tgw-title {
  margin: 0;
  font-size: clamp(28px, 3vw, 34px);
  font-weight: 500;
  letter-spacing: 0.012em;
  line-height: 1.15;
}
.tgw-lead {
  margin: 12px 0 0;
  font-size: 15px;
  line-height: 1.55;
  color: var(--text-muted);
  max-width: 52ch;
}

.tgw-ask {
  border-radius: 28px;
  padding: 6px 6px 6px 20px;
  background: color-mix(in srgb, var(--surface-2, #f5f5f7) 80%, transparent);
  border: 1px solid color-mix(in srgb, var(--border) 50%, transparent);
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 40px;
  max-width: 720px;
}
.tgw-ask input {
  flex: 1;
  border: 0;
  background: transparent;
  font: inherit;
  font-size: 15px;
  font-weight: 500;
  letter-spacing: 0.012em;
  color: var(--text);
  min-width: 0;
  outline: none;
}
.tgw-ask input::placeholder { color: var(--text-muted); }
.tgw-ask-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 0;
  background: var(--portal-btn-primary, #1D1D1F);
  color: var(--portal-btn-primary-text, #fff);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
}

.tgw-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
.tgw-mobile-pill {
  display: none;
}
@media (max-width: 768px) {
  .tgw-mobile-pill { display: flex; }
  .tgw-head .tgw-kicker,
  .tgw-head .tgw-title,
  .tgw-head .tgw-lead { display: none; }
}

.tgw-card {
  border-radius: 28px;
  padding: 24px 26px;
  background: var(--surface, #fff);
  border: 1px solid color-mix(in srgb, var(--border) 55%, transparent);
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 160px;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
  transition: box-shadow 0.18s, transform 0.18s;
}
.tgw-card:hover {
  box-shadow: 0 10px 32px rgba(15, 23, 42, 0.07);
  transform: translateY(-1px);
}
.tgw-card-label {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.tgw-card-title {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
  letter-spacing: 0.012em;
  line-height: 1.35;
}
.tgw-card-body {
  margin: 0;
  font-size: 14px;
  line-height: 1.55;
  color: var(--text-muted);
}
.tgw-card-meta {
  margin-top: auto;
  font-size: 12px;
  color: var(--text-muted);
}
`
