export const WORKSPACE_PAGE_CSS = `
.wsp {
  height: 100%;
  min-height: 0;
  overflow: auto;
  padding: 32px 36px 48px;
  box-sizing: border-box;
}
.wsp-head { margin-bottom: 32px; }
.wsp-title {
  margin: 0;
  font-size: clamp(28px, 3vw, 34px);
  font-weight: 500;
  letter-spacing: 0.012em;
}
.wsp-lead {
  margin: 10px 0 0;
  font-size: 15px;
  color: var(--text-muted);
  max-width: 48ch;
  line-height: 1.55;
}

.wsp-sections {
  display: flex;
  flex-direction: column;
  gap: 36px;
}
.wsp-section-title {
  margin: 0 0 14px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.wsp-goals {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
}
.wsp-goal {
  border-radius: 24px;
  padding: 22px 24px;
  background: color-mix(in srgb, var(--surface-2, #f5f5f7) 60%, transparent);
  border: 1px solid color-mix(in srgb, var(--border) 50%, transparent);
}
.wsp-goal-title {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  letter-spacing: 0.012em;
}
.wsp-goal-meta {
  margin: 8px 0 16px;
  font-size: 13px;
  color: var(--text-muted);
}
.wsp-goal-progress {
  height: 4px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--border) 40%, transparent);
  overflow: hidden;
  margin-bottom: 12px;
}
.wsp-goal-progress > span {
  display: block;
  height: 100%;
  background: #5B647D;
  border-radius: inherit;
}
.wsp-goal-stats {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: var(--text-muted);
}
.wsp-goal-stats strong { color: var(--text); font-weight: 500; }

.wsp-links {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}
.wsp-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 20px;
  border-radius: 20px;
  background: var(--surface, #fff);
  border: 1px solid color-mix(in srgb, var(--border) 55%, transparent);
  text-decoration: none;
  color: inherit;
  font-size: 15px;
  font-weight: 500;
  letter-spacing: 0.012em;
  transition: background 0.15s;
}
.wsp-link:hover {
  background: color-mix(in srgb, var(--surface-2) 50%, var(--surface));
}
.wsp-link span:last-child { opacity: 0.35; }

@media (max-width: 768px) {
  .wsp { padding: 20px 16px 120px; }
  .wsp-mobile-pill { display: flex; }
  .wsp-head .wsp-title,
  .wsp-head .wsp-lead { display: none; }
}
.wsp-mobile-pill { display: none; }
`
