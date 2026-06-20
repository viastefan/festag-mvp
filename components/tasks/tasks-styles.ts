import { MOBILE_CODEX_LIST_CSS, FESTAG_CONTENT_HEAD_CSS, FESTAG_LIST_ROW_HOVER_CSS } from '@/components/mobile/mobile-codex-list-styles'

export const TASKS_FESTAG_CSS = `
${FESTAG_CONTENT_HEAD_CSS}
${FESTAG_LIST_ROW_HOVER_CSS}

.task-os {
  --task-dark: #2A3032;
  --task-soft: #90959F;
  --task-page-bg: #FCFCFC;
}

.task-os .task-festag-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 0 18px 20px;
  border-bottom: 1px solid color-mix(in srgb, var(--border) 55%, transparent);
}

.task-os .task-festag-head-copy {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.task-os .task-festag-title {
  margin: 0;
  font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif) !important;
  font-weight: 400 !important;
  font-size: 29px !important;
  letter-spacing: -1px !important;
  line-height: 1.02 !important;
  color: var(--task-dark);
}

.task-os .task-festag-lead {
  margin: 0;
  font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
  font-size: 17px;
  font-weight: 400;
  line-height: 1.35;
  color: var(--task-soft);
}

.task-os .task-festag-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  padding-top: 4px;
}

@media (max-width: 768px) {
  .task-os .task-festag-head {
    display: none !important;
  }
  .task-os .task-m-head h1 {
    margin: 0;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif) !important;
    font-weight: 400 !important;
    font-size: 29px !important;
    letter-spacing: -1px !important;
    line-height: 1.02 !important;
    color: var(--task-dark) !important;
  }
  .task-os .task-m-head .mcl-page-sub {
    margin: 4px 0 0;
    font-size: 17px;
    font-weight: 400;
    line-height: 1.35;
    color: var(--task-soft) !important;
    letter-spacing: 0 !important;
  }
  .task-os .task-m-head .mcl-m {
    color: inherit !important;
    letter-spacing: inherit !important;
  }
}
`

export const TASKS_PAGE_CSS = `
        .task-os {
          --task-soft-text:#4E5567;
          --task-header-text: color-mix(in srgb, #4E5567 62%, transparent);
          width:100%;
          max-width:var(--festag-content-max, 1080px);
          margin-left:auto;
          margin-right:auto;
          height:100%;
          min-height:0;
          color:var(--text);
          padding:0;
          display:flex;
          flex-direction:column;
          overflow:hidden;
          /* Figma-style breathing room across every text inside the page */
          letter-spacing: .012em;
          box-sizing:border-box;
        }
        .task-os strong { letter-spacing: .012em; }
        [data-theme="dark"] .task-os,
        [data-theme="classic-dark"] .task-os,
        [data-theme="read"] .task-os {
          --task-soft-text:var(--text-secondary);
        }
        .task-static-top {
          flex:0 0 auto;
          position:relative;
          z-index:8;
        }
        .task-m-shell {
          display:flex;
          flex-direction:column;
          flex:1 1 auto;
          min-height:0;
        }
        .task-scroll-body {
          flex:1 1 auto;
          min-height:0;
          overflow-y:auto;
          overflow-x:hidden;
          padding:0 0 76px;
          scrollbar-gutter:stable;
          overscroll-behavior:contain;
        }
        .task-top {
          display:flex;
          align-items:center;
          justify-content:space-between;
          min-height:34px;
          border-bottom:1px solid color-mix(in srgb, var(--border) 60%, transparent);
          padding:0 18px 12px;
          margin-bottom:0;
        }
        .task-top-left {
          display:flex; align-items:center; gap:12px; min-width:0;
        }
        .task-title {
          margin:0;
          font-size:14.5px;
          font-weight:500;
          letter-spacing:0;
        }

        /* Project scope dropdown — mirrors the dashboard's
           dc-scope pattern so users know the gesture. */
        .task-scope { position:relative; }
        .task-scope-trigger {
          display:inline-flex; align-items:center; gap:7px;
          max-width:240px;
          height:28px; padding:0 11px 0 12px;
          border-radius:32px;
          border:1px solid color-mix(in srgb, var(--border) 70%, transparent);
          background:color-mix(in srgb, var(--surface-2) 30%, transparent);
          color:var(--text); font:inherit; font-size:12px;
          font-weight:500; letter-spacing:.012em;
          cursor:pointer; transition:background .12s, border-color .12s;
        }
        .task-scope-trigger:hover {
          background:color-mix(in srgb, var(--surface-2) 65%, transparent);
          border-color:var(--border);
        }
        .task-scope-trigger span {
          overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
        }
        .task-scope-trigger svg { color:var(--text-muted); flex-shrink:0; }

        .task-scope-backdrop {
          position:fixed; inset:0; z-index:14;
          background:transparent; border:0; padding:0; cursor:default;
        }
        .task-scope-menu {
          position:absolute; top:calc(100% + 6px); left:0; z-index:15;
          min-width:260px; max-width:320px;
          max-height:340px; overflow-y:auto;
          padding:6px;
          background:var(--card);
          border:1px solid color-mix(in srgb, var(--border) 70%, transparent);
          border-radius:8px;
          box-shadow:0 1px 2px rgba(15,23,42,.06), 0 20px 50px rgba(15,23,42,.14);
          display:flex; flex-direction:column; gap:2px;
          animation:scopeIn .14s cubic-bezier(.16,1,.3,1) both;
        }
        [data-theme="dark"] .task-scope-menu,
        [data-theme="classic-dark"] .task-scope-menu {
          background:color-mix(in srgb, var(--card) 95%, #fff 5%);
          box-shadow:0 1px 2px rgba(0,0,0,.4), 0 24px 60px rgba(0,0,0,.45);
        }
        @keyframes scopeIn { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:none; } }

        .task-scope-opt {
          display:grid; grid-template-columns:8px 1fr auto;
          gap:10px; align-items:center;
          width:100%; padding:10px 12px;
          border:0; background:transparent;
          border-radius:8px !important;
          color:var(--text); font:inherit; font-size:12.5px;
          font-weight:500; letter-spacing:.012em;
          cursor:pointer; text-align:left;
          transition:background .1s;
        }
        .task-scope-opt:hover {
          background:color-mix(in srgb, var(--surface-2) 55%, transparent);
        }
        .task-scope-opt.on {
          background:color-mix(in srgb, var(--surface-2) 75%, transparent);
        }
        .task-scope-dot {
          width:8px; height:8px; border-radius:50%;
          background:var(--text-muted);
        }
        .task-scope-main {
          min-width:0; display:flex; flex-direction:column; gap:1px;
        }
        .task-scope-main strong {
          font-size:12.5px; font-weight:500;
          overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
        }
        .task-scope-main small {
          font-size:10.5px; color:var(--text-muted);
          font-weight:500; letter-spacing:.012em;
          overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
        }
        .task-scope-divider {
          display:none;
        }
        .task-plus {
          width:28px;
          height:28px;
          border:0;
          background:transparent;
          color:var(--task-soft-text);
          cursor:pointer;
          border-radius:999px;
          font:inherit;
          font-size:20px;
          line-height:1;
        }
        .task-plus:hover { background:var(--surface-2); color:var(--text); }
        .task-toolbar {
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:10px;
          padding:14px 18px 12px;
        }
        .task-filters {
          display:flex;
          align-items:center;
          gap:6px;
          min-width:0;
          overflow:visible;
          flex-wrap:wrap;
        }
        .task-filter {
          height:27px;
          padding:0 9px;
          border:1px solid var(--border);
          border-radius:999px;
          background:transparent;
          color:var(--task-soft-text);
          font:inherit;
          font-size:11.5px;
          font-weight:500;
          white-space:nowrap;
          cursor:pointer;
          letter-spacing:.02em;
        }
        .task-filter.on {
          background:var(--surface-2);
          color:var(--text);
          border-color:var(--border);
        }
        .task-tools {
          display:flex;
          align-items:center;
          gap:8px;
          flex-shrink:0;
        }
        .task-create {
          height:30px;
          padding:0 9px 0 12px;
          border:1px solid transparent;
          border-radius:32px;
          background:transparent;
          color:var(--task-soft-text);
          display:flex;
          align-items:center;
          gap:8px;
          font:inherit;
          font-size:12px;
          font-weight:500;
          cursor:pointer;
        }
        .task-create:hover { background:var(--surface-2); color:var(--text); }
        .task-create:focus,
        .task-create:focus-visible,
        .task-create:active {
          outline:none !important;
          box-shadow:none !important;
          border-color:transparent !important;
        }
        .task-create-plus {
          width:14px;
          height:14px;
          display:inline-flex;
          align-items:center;
          justify-content:center;
          flex-shrink:0;
          color:currentColor;
          font-size:15px;
          line-height:1;
          transform:translateY(-.5px);
        }
        .task-create:disabled {
          opacity:.46;
          color:var(--task-soft-text);
        }
        .task-create svg { flex-shrink:0; }
        .task-tool-wrap { position:relative; }
        .task-tool {
          width:34px;
          height:34px;
          border:0;
          border-radius:999px;
          background:#fff;
          color:var(--task-soft-text);
          display:flex;
          align-items:center;
          justify-content:center;
          cursor:pointer;
          box-shadow:0 1px 2px rgba(15,23,42,.08), 0 2px 6px rgba(15,23,42,.05);
          transition:background .12s ease, color .12s ease, box-shadow .12s ease, transform .12s ease;
        }
        .task-tool:focus,
        .task-tool:focus-visible,
        .task-tool:active {
          outline:none !important;
          border:0 !important;
          background:#fff;
          color:var(--text);
          box-shadow:0 1px 2px rgba(15,23,42,.10), 0 3px 9px rgba(15,23,42,.07) !important;
          transform:none;
        }
        .task-tool:hover, .task-tool.on {
          background:#fff;
          color:var(--text);
          box-shadow:0 1px 2px rgba(15,23,42,.10), 0 3px 9px rgba(15,23,42,.07);
          transform:none;
        }
        [data-theme="dark"] .task-tool,
        [data-theme="classic-dark"] .task-tool {
          background:color-mix(in srgb, var(--surface) 92%, #fff 8%);
          box-shadow:0 1px 2px rgba(0,0,0,.28), 0 2px 7px rgba(0,0,0,.16);
        }
        [data-theme="dark"] .task-tool:hover,
        [data-theme="dark"] .task-tool.on,
        [data-theme="dark"] .task-tool:focus,
        [data-theme="dark"] .task-tool:focus-visible,
        [data-theme="dark"] .task-tool:active,
        [data-theme="classic-dark"] .task-tool:hover,
        [data-theme="classic-dark"] .task-tool.on,
        [data-theme="classic-dark"] .task-tool:focus,
        [data-theme="classic-dark"] .task-tool:focus-visible,
        [data-theme="classic-dark"] .task-tool:active {
          background:color-mix(in srgb, var(--surface) 88%, #fff 12%);
          box-shadow:0 1px 2px rgba(0,0,0,.32), 0 3px 9px rgba(0,0,0,.2) !important;
        }
        .task-menu {
          position:absolute;
          top:38px;
          right:0;
          width:190px;
          z-index:20;
          border:0;
          border-radius:8px !important;
          background:var(--surface);
          box-shadow:0 18px 44px rgba(0,0,0,.16);
          padding:6px;
        }
        .task-menu button {
          width:100%;
          height:30px;
          border-radius:8px !important;
          display:flex;
          align-items:center;
          justify-content:space-between;
          padding:0 9px;
          color:var(--task-soft-text);
          font:inherit;
          font-size:12px;
          font-weight:500;
          cursor:pointer;
        }
        .task-menu button:focus,
        .task-menu button:focus-visible {
          outline:none !important;
          box-shadow:none !important;
        }
        .task-menu button:hover, .task-menu button.on { background:var(--surface-2); color:var(--text); }
        .task-table {
          width:100%;
          max-width:100%;
          margin-left:0;
          margin-right:0;
          padding-right:0;
          box-sizing:border-box;
          overflow:visible;
        }
        .task-head,
        .task-row {
          display:grid;
          grid-template-columns:42px minmax(185px,1.7fr) minmax(132px,.95fr) minmax(62px,.42fr) minmax(96px,.58fr) minmax(74px,.48fr) minmax(64px,.42fr) minmax(68px,.42fr);
          align-items:center;
          gap:8px;
          margin:0;
          padding:0 12px 0 0;
          box-sizing:border-box;
        }
        .task-head {
          position:sticky;
          top:0;
          z-index:5;
          min-height:36px;
          color:var(--task-soft-text);
          font-size:11.5px;
          font-weight:500;
          border-bottom:0;
          background:var(--surface);
          letter-spacing:.02em;
        }
        .task-head > *,
        .task-row > * {
          min-width:0;
        }
        .task-row {
          min-height:50px;
          border-bottom:0;
          color:var(--task-soft-text);
          font-size:12px;
          border-radius:8px !important;
          cursor:pointer;
          overflow:visible;
          position:relative;
          background:transparent;
          transition:background .12s ease;
        }
        .task-row.state-open {
          z-index:80;
        }
        .task-row:hover {
          background:color-mix(in srgb, var(--surface-2) 60%, transparent);
          border-radius:8px !important;
        }
        .task-category-section {
          margin:10px 0 16px;
          animation:taskGroupIn .22s cubic-bezier(.16,1,.3,1) both;
          animation-delay:calc(var(--section-index, 0) * 34ms);
        }
        .task-category-head {
          min-height:34px;
          display:grid;
          grid-template-columns:42px minmax(0,1fr) auto;
          align-items:center;
          gap:8px;
          padding:0 12px 0 0;
          color:var(--task-soft-text);
          font-size:12px;
          font-weight:500;
          letter-spacing:.02em;
        }
        .task-category-icon {
          width:24px;
          height:24px;
          border-radius:8px;
          display:inline-flex;
          align-items:center;
          justify-content:center;
          justify-self:center;
          background:color-mix(in srgb, var(--task-group-color, var(--task-soft-text)) 15%, transparent);
          color:color-mix(in srgb, var(--task-group-color, var(--task-soft-text)) 78%, var(--text));
        }
        .task-category-head em {
          font-style:normal;
          color:color-mix(in srgb, var(--task-soft-text) 82%, transparent);
        }
        .task-project-section {
          margin:5px 0 8px;
          animation:taskGroupIn .22s cubic-bezier(.16,1,.3,1) both;
          animation-delay:calc(var(--section-index, 0) * 34ms);
        }
        @keyframes taskGroupIn {
          from { opacity:0; transform:translateY(7px); }
          to { opacity:1; transform:none; }
        }
        .task-project-row {
          width:100%;
          min-height:40px;
          display:grid;
          grid-template-columns:42px minmax(185px,1.7fr) minmax(132px,.95fr) minmax(62px,.42fr) minmax(96px,.58fr) minmax(74px,.48fr) minmax(64px,.42fr) minmax(68px,.42fr);
          align-items:center;
          gap:8px;
          margin:0;
          padding:0 12px 0 0;
          box-sizing:border-box;
          border:0;
          border-radius:8px !important;
          background:transparent;
          color:var(--task-soft-text);
          font:inherit;
          text-align:left;
          cursor:pointer;
        }
        .task-project-row:focus,
        .task-project-row:focus-visible {
          outline:none !important;
          box-shadow:none !important;
        }
        .task-project-row:active {
          background:transparent;
        }
        .task-project-row:hover {
          background:color-mix(in srgb, var(--surface-2) 60%, transparent);
          color:var(--text);
        }
        .task-project-section.open .task-project-row {
          background:transparent;
        }
        .task-project-dot {
          width:12px;
          height:12px;
          border-radius:999px;
          border:2px solid var(--project-color, var(--task-soft-text));
          background:transparent;
          justify-self:center;
        }
        .task-project-title {
          display:flex;
          align-items:center;
          gap:9px;
          min-width:0;
          grid-column:2 / 4;
          color:var(--text);
          font-size:12.5px;
          font-weight:500;
        }
        .task-project-title span {
          overflow:hidden;
          text-overflow:ellipsis;
          white-space:nowrap;
        }
        .task-project-count {
          color:var(--task-soft-text);
          font-size:11.5px;
          font-weight:500;
        }
        .task-project-meta {
          grid-column:6 / 8;
          color:var(--task-soft-text);
          font-size:11.5px;
          font-weight:500;
          text-align:right;
          overflow:hidden;
          text-overflow:ellipsis;
          white-space:nowrap;
        }
        .task-project-chevron {
          grid-column:8;
          justify-self:center;
          color:var(--task-soft-text);
          transform:rotate(90deg);
          transition:transform .2s cubic-bezier(.16,1,.3,1), color .12s ease;
        }
        .task-project-section:not(.open) .task-project-chevron {
          transform:rotate(0deg);
        }
        .task-project-tasks {
          display:grid;
          grid-template-rows:0fr;
          overflow:hidden;
          transition:grid-template-rows .28s cubic-bezier(.16,1,.3,1);
        }
        .task-project-section.open .task-project-tasks {
          grid-template-rows:1fr;
          overflow:visible;
        }
        .task-project-tasks-inner {
          min-height:0;
          overflow:visible;
          padding-top:6px;
        }
        .task-project-section.open .task-row,
        .task-row-flat {
          animation:taskRowSlideIn .12s cubic-bezier(.16,1,.3,1) both;
          animation-delay:calc(var(--row-index, 0) * 8ms);
        }
        /* Flat rows live directly inside .task-table (no project section
           wrapper), so they don't inherit the slide-in default rules. */
        .task-row-flat { cursor:pointer; }
        @keyframes taskRowSlideIn {
          from { opacity:0; transform:translateY(-5px); }
          to { opacity:1; transform:none; }
        }
        .task-composer {
          border:1px solid var(--border);
          border-radius:16px;
          background:var(--card);
          box-shadow:0 24px 60px -20px rgba(0,0,0,.28), 0 2px 6px rgba(0,0,0,.06);
          margin:6px 0 26px;
          overflow:hidden;
          animation:taskComposerIn .18s cubic-bezier(.16,1,.3,1) both;
        }
        .task-composer-title {
          display:flex;
          align-items:baseline;
          flex-wrap:wrap;
          gap:6px;
          min-width:0;
        }
        .task-composer-title strong {
          color:var(--text);
          font-size:13px;
          font-weight:500;
          letter-spacing:.02em;
        }
        .task-composer-title span {
          color:var(--task-soft-text);
          font-size:12px;
          font-weight:500;
        }
        [data-theme="dark"] .task-composer {
          background:var(--card);
          box-shadow:0 28px 70px -22px rgba(0,0,0,.6), 0 2px 6px rgba(0,0,0,.3);
        }
        @keyframes taskComposerIn {
          from { opacity:0; transform:translateY(-6px); }
          to { opacity:1; transform:none; }
        }
        .task-composer-top {
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          padding:13px 16px 10px;
          border-bottom:0;
        }
        .task-project-select {
          display:inline-flex;
          align-items:center;
          gap:7px;
          min-width:0;
          height:30px;
          padding:0 10px;
          border-radius:8px;
          border:1px solid var(--border);
          background:color-mix(in srgb, var(--surface-2) 60%, transparent);
          color:var(--text);
          cursor:pointer;
          transition:background .12s, border-color .12s;
        }
        .task-project-select:hover {
          background:var(--surface-2);
          border-color:var(--border-strong, color-mix(in srgb, var(--text) 16%, var(--border)));
        }
        .task-project-select select { cursor:pointer; }
        .task-project-ring {
          position:relative;
          width:12px;
          height:12px;
          border-radius:999px;
          border:2px solid var(--project-ring, var(--task-soft-text));
          background:transparent;
          flex-shrink:0;
          display:inline-flex;
        }
        .task-project-ring input {
          position:absolute;
          inset:-7px;
          width:26px;
          height:26px;
          opacity:0;
          padding:0;
          border:0;
        }
        .task-project-select select,
        .task-composer-field,
        .task-chip-field {
          border:0;
          outline:0;
          background:transparent;
          color:inherit;
          font:inherit;
          font-weight:500;
        }
        .task-project-select select { max-width:280px; font-size:12.5px; font-weight:500; }
        .task-composer-body { padding:13px 16px 12px; }
        .task-mode-tabs { display:flex; gap:7px; margin-bottom:10px; }
        .task-mode-tabs button {
          min-height:32px;
          padding:0 12px;
          border-radius:8px;
          border:1px solid var(--border);
          background:transparent;
          color:var(--task-soft-text);
          font:inherit;
          font-size:12px;
          font-weight:500;
          cursor:pointer;
        }
        .task-mode-tabs button.on {
          background:color-mix(in srgb, var(--surface-2) 62%, transparent);
          color:var(--text);
        }
        .task-tagro-note {
          padding:8px 11px;
          border-radius:8px;
          border:0;
          background:color-mix(in srgb, var(--surface-2) 34%, transparent);
          color:var(--task-soft-text);
          font-size:12px;
          line-height:1.45;
          margin-bottom:12px;
        }
        .task-preview {
          display:grid;
          grid-template-columns:26px minmax(0, 1fr);
          gap:10px;
          padding:12px 13px;
          border:1px solid color-mix(in srgb, var(--border) 80%, transparent);
          border-radius:12px;
          background:color-mix(in srgb, var(--surface-2) 38%, transparent);
          margin:0 0 14px;
        }
        .task-preview-avatar {
          width:26px;
          height:26px;
          border-radius:8px;
          display:flex;
          align-items:center;
          justify-content:center;
          background:color-mix(in srgb, var(--accent-primary, #6a738c) 14%, transparent);
          color:var(--accent-primary, #6a738c);
          font-size:11px;
          font-weight:700;
        }
        .task-preview-bubble {
          min-width:0;
          display:grid;
          gap:7px;
        }
        .task-preview-kicker {
          color:var(--task-soft-text);
          font-size:11px;
        }
        .task-preview strong {
          color:var(--text);
          font-size:12.5px;
          font-weight:500;
        }
        .task-preview p,
        .task-preview li {
          color:var(--task-soft-text);
          font-size:12px;
          line-height:1.5;
          margin:0;
        }
        .task-preview ul {
          display:grid;
          gap:4px;
          padding-left:16px;
          margin:0;
        }
        .task-preview-actions {
          display:flex;
          flex-wrap:wrap;
          gap:6px;
          margin-top:2px;
        }
        .task-preview-actions button {
          min-height:28px;
          padding:0 10px;
          border-radius:8px;
          border:1px solid var(--border);
          background:transparent;
          color:var(--task-soft-text);
          font:inherit;
          font-size:11.5px;
          cursor:pointer;
        }
        .task-preview-actions button:hover:not(:disabled) {
          background:var(--surface-2);
          color:var(--text);
        }
        .task-preview-actions button.primary {
          background:var(--btn-prim);
          border-color:var(--btn-prim);
          color:var(--btn-prim-text);
        }
        .task-preview-actions button:disabled {
          opacity:.5;
          cursor:not-allowed;
        }
        .task-notice {
          padding:10px 12px;
          border:1px solid color-mix(in srgb, var(--amber) 28%, var(--border));
          border-radius:10px;
          background:color-mix(in srgb, var(--amber-bg) 72%, transparent);
          color:var(--task-soft-text);
          font-size:12px;
          line-height:1.45;
          margin:0 0 12px;
        }
        .task-composer-field.title {
          width:100%;
          display:block;
          font-size:18px;
          font-weight:500;
          letter-spacing:0;
          margin:0 0 7px;
        }
        .task-composer-field.description {
          width:100%;
          min-height:72px;
          resize:vertical;
          color:var(--task-soft-text);
          font-size:13px;
          line-height:1.55;
          font-weight:500;
        }
        .task-composer-field::placeholder,
        .task-chip-field::placeholder {
          color:var(--task-soft-text);
          opacity:1;
        }
        .task-chip-row {
          display:flex;
          align-items:center;
          flex-wrap:wrap;
          gap:7px;
          padding:10px 16px 11px;
          border-top:0;
        }
        .task-composer-chip {
          height:28px;
          display:inline-flex;
          align-items:center;
          gap:7px;
          border:1px solid var(--border);
          border-radius:8px;
          padding:0 10px;
          background:transparent;
          color:var(--task-soft-text);
          font-size:12px;
          font-weight:500;
          cursor:pointer;
          transition:background .12s, border-color .12s;
        }
        .task-composer-chip:hover {
          background:var(--surface-2);
          border-color:var(--border-strong, color-mix(in srgb, var(--text) 16%, var(--border)));
        }
        .task-composer-chip select,
        .task-composer-chip input { cursor:pointer; }
        .task-composer-chip.has-value { color:var(--text); }
        .task-composer-chip input[type="date"] { color-scheme:inherit; max-width:124px; }
        .task-composer-footer {
          min-height:42px;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          padding:8px 16px;
          border-top:0;
          color:var(--task-soft-text);
          font-size:11.5px;
          font-weight:500;
        }
        .task-composer-actions { display:flex; align-items:center; gap:8px; }
        .task-composer-actions button {
          min-height:34px;
          padding:0 13px;
          border-radius:999px;
          border:1px solid var(--border);
          background:transparent;
          color:var(--task-soft-text);
          font:inherit;
          font-size:12px;
          font-weight:500;
          cursor:pointer;
        }
        .task-composer-actions button.primary {
          background:color-mix(in srgb, var(--surface-2) 74%, transparent);
          color:var(--text);
          border-color:var(--border);
        }
        .task-composer-actions button:disabled {
          opacity:.48;
          cursor:not-allowed;
        }
        .task-group-cell {
          display:flex;
          align-items:center;
          justify-content:center;
          min-width:0;
        }
        .task-group-icon {
          width:24px;
          height:24px;
          border-radius:8px;
          display:flex;
          align-items:center;
          justify-content:center;
          background:color-mix(in srgb, var(--task-group-color, var(--surface-2)) 13%, transparent);
          color:color-mix(in srgb, var(--task-group-color, var(--task-soft-text)) 72%, var(--task-soft-text));
          border:0;
        }
        .task-name {
          display:flex;
          align-items:center;
          gap:10px;
          min-width:0;
        }
        .task-state-wrap {
          position:relative;
          flex:0 0 auto;
          display:inline-flex;
          align-items:center;
          justify-content:center;
          z-index:3;
        }
        .task-state-mark {
          width:16px;
          height:16px;
          border-radius:50%;
          border:1px solid color-mix(in srgb, var(--task-soft-text) 30%, var(--border));
          color:var(--btn-prim-text);
          display:flex;
          align-items:center;
          justify-content:center;
          flex-shrink:0;
          background:transparent;
          padding:0;
          transition:border-color .12s ease, background .12s ease;
        }
        .task-state-wrap:hover .task-state-mark,
        .task-state-wrap.is-open .task-state-mark {
          border-color:color-mix(in srgb, var(--task-soft-text) 64%, var(--border));
        }
        .task-state-mark:focus,
        .task-state-mark:focus-visible {
          outline:none !important;
          box-shadow:none !important;
        }
        .task-state-mark.done {
          border-color:var(--btn-prim);
          background:var(--btn-prim);
        }
        .task-state-popover {
          position:fixed;
          left:var(--state-popover-left, 0);
          top:var(--state-popover-top, 50%);
          width:min(276px, calc(100vw - 48px));
          max-width:calc(100vw - 48px);
          max-height:260px;
          transform:translateY(-50%) scale(.985);
          opacity:0;
          visibility:hidden;
          pointer-events:none;
          z-index:90;
          padding:12px 14px;
          border-radius:12px;
          border:1px solid color-mix(in srgb, var(--border) 82%, transparent);
          background:color-mix(in srgb, var(--card) 98%, var(--surface-2) 2%);
          box-shadow:0 10px 26px rgba(15,23,42,.10), 0 0 0 1px color-mix(in srgb, var(--accent-primary, #6a738c) 5%, transparent);
          color:var(--task-soft-text);
          font-size:12px;
          line-height:1.5;
          letter-spacing:0;
          white-space:normal;
          overflow:auto;
          transition:opacity .14s ease, visibility .14s ease, transform .14s ease;
        }
        .task-state-popover::before {
          content:"";
          position:absolute;
          left:-5px;
          top:50%;
          width:9px;
          height:9px;
          transform:translateY(-50%) rotate(45deg);
          background:inherit;
          border-left:1px solid color-mix(in srgb, var(--border) 82%, transparent);
          border-bottom:1px solid color-mix(in srgb, var(--border) 82%, transparent);
        }
        [data-theme="dark"] .task-state-popover,
        [data-theme="classic-dark"] .task-state-popover {
          background:color-mix(in srgb, var(--surface-2) 72%, var(--card) 28%);
          border-color:color-mix(in srgb, var(--border-strong) 58%, transparent);
          box-shadow:0 12px 28px rgba(0,0,0,.22), 0 1px 0 rgba(255,255,255,.035) inset;
        }
        .task-state-popover strong {
          display:block;
          margin-bottom:5px;
          color:var(--text);
          font-size:12px;
          line-height:1.35;
          font-weight:500;
        }
        .task-state-popover.is-open {
          opacity:1;
          visibility:visible;
          transform:translateY(-50%);
          pointer-events:auto;
        }
        .task-state-popover span {
          display:block;
          color:var(--task-soft-text);
          font-size:12px;
          line-height:1.5;
        }
        .task-name-text {
          min-width:0;
        }
        .task-name-text strong {
          display:block;
          color:var(--text);
          font-size:12.5px;
          font-weight:500;
          overflow:hidden;
          text-overflow:ellipsis;
          white-space:nowrap;
        }
        .task-health {
          display:flex;
          align-items:center;
          gap:0;
          min-width:0;
          color:var(--task-soft-text);
          font-weight:500;
          font-size:12px;
        }
        .task-health.done { color:var(--green); }
        .task-health.active { color:var(--amber); }
        .task-health.decision { color:var(--amber); }
        .task-health.review { color:#6a738c; }
        .task-progress {
          display:flex;
          align-items:center;
          gap:8px;
          justify-content:flex-start;
          min-width:0;
          white-space:nowrap;
          color:var(--task-soft-text);
          font-weight:500;
          font-size:12px;
        }
        .task-progress span:last-child {
          overflow:hidden;
          text-overflow:ellipsis;
        }
        .task-progress-dot {
          width:11px;
          height:11px;
          border-radius:50%;
          border:2px dotted var(--amber);
        }
        .task-health.review ~ .task-progress .task-progress-dot,
        .task-progress-dot.review {
          border-color:#6a738c;
        }
        .task-health.decision ~ .task-progress .task-progress-dot,
        .task-progress-dot.decision {
          border-color:var(--amber);
        }
        .task-progress-dot.done {
          border-style:solid;
          border-color:var(--green);
          background:var(--green);
        }
        .task-lead-avatar {
          width:22px;
          height:22px;
          border-radius:50%;
          display:flex;
          align-items:center;
          justify-content:center;
          background:var(--surface-2);
          border:1px solid var(--border);
          color:var(--task-soft-text);
          font-size:10px;
          font-weight:600;
          flex-shrink:0;
        }
        .task-empty {
          padding:44px 12px;
          text-align:center;
          color:var(--task-soft-text);
          border-bottom:1px solid color-mix(in srgb, var(--border) 24%, transparent);
          font-size:12px;
          font-weight:500;
          letter-spacing:.02em;
        }
        .task-empty.projectless {
          max-width:430px;
          margin:44px auto;
          padding:28px 24px;
          border:1px solid color-mix(in srgb, var(--border) 72%, transparent);
          border-radius:12px;
          background:color-mix(in srgb, var(--surface) 88%, transparent);
        }
        .task-empty.projectless h2 {
          margin:0 0 8px;
          color:var(--text);
          font-size:18px;
          font-weight:500;
          letter-spacing:.02em;
        }
        .task-empty.projectless p {
          margin:0;
          color:var(--task-soft-text);
          font-size:13px;
          line-height:1.5;
        }
        .task-empty-actions {
          display:flex;
          justify-content:center;
          gap:8px;
          flex-wrap:wrap;
          margin-top:18px;
        }
        .task-empty-actions a {
          min-height:44px;
          display:inline-flex;
          align-items:center;
          justify-content:center;
          padding:0 14px;
          border:1px solid var(--border);
          border-radius:10px;
          color:var(--text);
          text-decoration:none;
          background:var(--surface-2);
          font-size:12.5px;
          font-weight:500;
        }
        .task-count-summary {
          color:var(--task-soft-text);
          font-size:11.5px;
          font-weight:500;
          padding-left:4px;
          letter-spacing:.02em;
          white-space:nowrap;
        }
        /* Tighten layout instead of forcing horizontal scroll on narrow widths.
           The grid cells already use min-width:0 internally so text truncates. */
        @media(max-width:1180px) {
          .task-head,
          .task-row {
            grid-template-columns:36px minmax(160px,1.6fr) minmax(112px,.8fr) 66px 86px 70px 46px 70px;
            gap:7px;
          }
          .task-project-row {
            grid-template-columns:36px minmax(160px,1.6fr) minmax(112px,.8fr) 66px 86px 70px 46px 70px;
            gap:7px;
          }
        }
        @media(max-width:960px) {
          .task-os { padding:0; }
          .task-top { padding-left:4px; padding-right:4px; }
          .task-toolbar { padding-left:4px; padding-right:4px; }
          .task-head,
          .task-row {
            grid-template-columns:32px minmax(150px,1.8fr) minmax(108px,.85fr) 60px 74px 62px 42px 62px;
            gap:6px;
          }
          .task-project-row {
            grid-template-columns:32px minmax(150px,1.8fr) minmax(108px,.85fr) 60px 74px 62px 42px 62px;
          }
          .task-project-meta {
            display:none;
          }
          .task-head { font-size:10.5px; }
          .task-row { font-size:11.5px; }
          .task-count-summary { flex-basis:100%; padding-left:0; }
        }
        @media(max-width:760px) {
          :global(.mcd) { display: none !important; }
          .task-legacy-mph, .task-legacy-mph .mph { display: none !important; }
          .task-m-shell {
            flex: 1 1 auto !important;
            min-height: 0 !important;
            overflow-y: auto !important;
            overflow-x: hidden !important;
            padding: calc(20px + env(safe-area-inset-top, 0px)) 20px 160px !important;
            box-sizing: border-box !important;
          }
          .task-static-top { padding: 0 !important; position: relative !important; }
          .task-os { background: #FCFCFC !important; max-width: none !important; }
          [data-theme="dark"] .task-os,
          [data-theme="classic-dark"] .task-os { background: var(--portal-bg, #0d0d0f) !important; }
          .task-os { padding:0; overflow:hidden; }
          .task-scroll-body { padding-bottom: 0; overflow: visible !important; }
          /* Mobile uses the new Linear-style MobilePageHeader above; hide
             the desktop title row entirely on phones. */
          .task-top { display: none !important; }
          .task-toolbar { display: none !important; }
          .task-m-actions { position: relative !important; }
          .task-filters {
            display:grid;
            grid-template-columns:repeat(2, minmax(0, 1fr));
            gap:6px;
            width:100%;
          }
          .task-filter {
            width:100%;
            justify-content:center;
            height:29px;
            padding:0 8px;
            font-size:11px;
          }
          .task-count-summary {
            grid-column:1 / -1;
            white-space:normal;
            line-height:1.35;
            padding:2px 2px 0;
          }
          .task-tools {
            width:100%;
            justify-content:space-between;
            gap:7px;
          }
          .task-create {
            min-height:44px;
            padding:0 10px;
            font-size:11.5px;
            gap:5px;
          }
          .task-tool {
            width:30px;
            height:30px;
          }
          .task-table {
            width:100%;
            margin-left:0;
            margin-right:0;
            padding-top:4px;
            display:flex;
            flex-direction:column;
            gap:12px;
          }
          .task-head {
            display:none;
          }
          .task-project-section {
            margin:7px 0 9px;
          }
          .task-project-row {
            grid-template-columns:24px minmax(0,1fr) 22px;
            min-height:38px;
            padding:0 10px;
          }
          .task-project-title,
          .task-project-chevron {
            grid-column:auto;
          }
          .task-project-dot {
            justify-self:start;
          }
          .task-project-title {
            font-size:12.5px;
          }
          .task-project-count {
            margin-left:auto;
          }
          .task-row {
            display:grid;
            grid-template-columns:minmax(0, 1fr) auto;
            grid-template-rows:auto auto;
            gap:6px 10px;
            min-height:auto;
            padding:16px 14px;
            margin-bottom:0;
            border:var(--mcl-white-border, 1px solid rgba(0,0,0,0.07));
            border-radius:14px !important;
            background:#FFFFFF;
            box-shadow:var(--mcl-white-elev);
            -webkit-tap-highlight-color:transparent;
          }
          [data-theme="dark"] .task-row,
          [data-theme="classic-dark"] .task-row {
            background:rgba(255,255,255,0.06);
            border:var(--mcl-white-border);
            box-shadow:var(--mcl-white-elev);
          }
          .task-row:active {
            transform:scale(0.995);
            background:#FAFAFA;
          }
          [data-theme="dark"] .task-row:active,
          [data-theme="classic-dark"] .task-row:active {
            background:rgba(255,255,255,0.09);
          }
          .task-row:hover {
            background:#FFFFFF;
            border-radius:14px !important;
          }
          .task-group-cell {
            display:none;
          }
          .task-name {
            gap:10px;
            grid-column:1 / -1;
            align-items:flex-start;
          }
          .task-state-mark {
            width:20px;
            height:20px;
            margin-top:2px;
            flex-shrink:0;
          }
          .task-state-popover {
            position:fixed;
            left:12px !important;
            right:12px;
            top:auto !important;
            bottom:calc(12px + var(--safe-bottom));
            width:auto !important;
            max-width:none;
            max-height:min(260px, calc(100vh - 24px - var(--safe-bottom)));
            transform:translateY(8px) scale(.985);
          }
          .task-state-popover::before {
            display:none;
          }
          .task-state-popover.is-open {
            transform:none;
          }
          .task-name-text strong {
            font-family:var(--font-aeonik, 'Aeonik', Inter, sans-serif);
            font-size:18px;
            font-weight:500;
            letter-spacing:-0.02em;
            white-space:normal;
            line-height:1.28;
            color:#0F0F10;
          }
          [data-theme="dark"] .task-name-text strong,
          [data-theme="classic-dark"] .task-name-text strong {
            color:#f4f4f4;
          }
          .task-health {
            grid-column:1;
            min-width:0;
            display:flex;
            align-items:center;
            gap:6px;
            color:#90959F;
            font-size:13px;
            font-weight:500;
          }
          .task-health::before { display:none; }
          .task-row > div:nth-child(4) {
            grid-column:2;
            justify-self:end;
            align-self:center;
            min-width:0;
            font-size:12px;
            font-weight:500;
            color:#4E5567;
            padding:4px 10px;
            border-radius:999px;
            background:#F4F4F6;
            white-space:nowrap;
          }
          [data-theme="dark"] .task-row > div:nth-child(4),
          [data-theme="classic-dark"] .task-row > div:nth-child(4) {
            background:rgba(255,255,255,0.1);
            color:rgba(255,255,255,0.78);
          }
          .task-row > div:nth-child(4)::before { display:none; }
          .task-row > div:nth-child(5),
          .task-row > div:nth-child(6),
          .task-row > div:nth-child(7),
          .task-progress {
            display:none !important;
          }
          .task-empty {
            padding:34px 10px;
            font-size:11.5px;
            border-bottom:0;
          }
          .task-composer {
            position:fixed;
            inset:0;
            z-index:240;
            margin:0;
            border-radius:12px 12px 0 0;
            border-left:0;
            border-right:0;
            border-bottom:0;
            display:flex;
            flex-direction:column;
            background:var(--surface);
          }
          .task-composer-body {
            flex:1;
            min-height:0;
            overflow:auto;
            padding:16px 14px;
          }
          .task-chip-row {
            flex-shrink:0;
            overflow-x:auto;
            flex-wrap:nowrap;
            padding:10px 14px;
          }
          .task-composer-footer {
            position:sticky;
            bottom:0;
            padding:10px 14px calc(10px + var(--safe-bottom));
            background:var(--surface);
          }
          .task-composer-top,
          .task-composer-footer { align-items:flex-start; flex-direction:column; }
          .task-composer-actions,
          .task-composer-actions button { width:100%; }
          .task-project-select select { max-width:210px; }
          .task-mode-tabs {
            display:grid;
            grid-template-columns:repeat(2,minmax(0,1fr));
          }
          .task-empty.projectless {
            margin:28px 0;
            padding:22px 18px;
          }
          .task-empty-actions a {
            width:100%;
          }
        }
      `

export const TASK_DRAWER_CSS = `
/* ── Task detail drawer (mirrors decisions) ── */
.task-drawer-overlay {
  position: fixed; inset: 0; z-index: 1200;
  display: flex; justify-content: flex-end;
}
.task-drawer-backdrop {
  flex: 1; border: 0; padding: 0; cursor: pointer;
  background: rgba(8, 10, 14, .42);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}
.task-drawer-panel {
  width: min(720px, 100vw); height: 100%;
  background: var(--bg, #fff); color: var(--text);
  border-left: 1px solid var(--border);
  display: flex; flex-direction: column;
  box-shadow: -24px 0 64px -20px rgba(0, 0, 0, .45);
  animation: taskDrawerIn .22s cubic-bezier(.16, 1, .3, 1) both;
  overflow: hidden;
}
@keyframes taskDrawerIn {
  from { transform: translateX(20px); opacity: 0; }
  to { transform: none; opacity: 1; }
}
.task-drawer-head {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; padding: 14px 18px 10px;
  border-bottom: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
  flex-shrink: 0;
}
.task-drawer-head-meta { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.task-drawer-kicker {
  font-size: 10.5px; letter-spacing: .14em; text-transform: uppercase;
  color: var(--text-muted, #90959F);
}
.task-drawer-title {
  margin: 0; font-size: 16px; font-weight: 500;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.task-drawer-close {
  width: 32px; height: 32px; border: 0; border-radius: 8px;
  background: transparent; color: var(--text-muted);
  display: inline-flex; align-items: center; justify-content: center;
  cursor: pointer; flex-shrink: 0;
}
.task-drawer-close:hover { background: var(--surface-2); color: var(--text); }
.task-drawer-body {
  flex: 1 1 auto; min-height: 0; overflow: hidden;
  display: flex; flex-direction: column;
}
.task-detail-shell.task-detail-drawer {
  height: 100%; min-height: 0; overflow: hidden;
  display: flex; flex-direction: column;
}
.task-detail-shell.task-detail-drawer .task-detail-topbar { display: none !important; }
.task-detail-shell.task-detail-drawer .task-detail-desktop {
  flex: 1 1 auto; min-height: 0; overflow: hidden;
  display: flex; flex-direction: column;
}
.task-detail-shell.task-detail-drawer .task-detail-grid {
  flex: 1 1 auto; min-height: 0; overflow-y: auto;
}
@media (max-width: 768px) {
  .task-drawer-panel { width: 100vw; }
  .task-drawer-head { padding-top: calc(10px + env(safe-area-inset-top, 0px)); }
}
`

export const TASKS_CSS = `${MOBILE_CODEX_LIST_CSS}${TASKS_FESTAG_CSS}${TASKS_PAGE_CSS}${TASK_DRAWER_CSS}`
