import {
  FESTAG_CONTENT_HEAD_CSS,
  FESTAG_MOBILE_HEAD_CSS,
  FESTAG_SCROLL_FADE_CSS,
} from '@/components/mobile/mobile-codex-list-styles'

export const PROJECT_SUBPAGE_CSS = `
${FESTAG_CONTENT_HEAD_CSS}
${FESTAG_MOBILE_HEAD_CSS}
${FESTAG_SCROLL_FADE_CSS}

  .pj-sub.dec-os {
    --pj-sub-soft: var(--portal-muted, #8f93a4);
    --pj-sub-text: var(--portal-text, #0f0f10);
    --pj-sub-card: var(--portal-card, #f7f7f8);
    width: 100%;
    height: 100%;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    color: var(--pj-sub-text);
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    font-weight: 400;
  }

  [data-theme="dark"] .pj-sub.dec-os,
  [data-theme="classic-dark"] .pj-sub.dec-os {
    --pj-sub-soft: var(--portal-muted, #9aa0ac);
    --pj-sub-text: var(--portal-text, #f4f4f4);
    --pj-sub-card: var(--festag-black-content, #0c0c0e);
  }

  .pj-sub-shell {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    max-width: var(--festag-content-max, 720px);
    width: 100%;
    margin: 0 auto;
    padding: clamp(48px, 6vh, 72px) var(--festag-content-pad-x, 56px) calc(100px + env(safe-area-inset-bottom, 0px));
    box-sizing: border-box;
    overflow-y: auto;
  }

  .pj-sub-back {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 20px;
    color: var(--pj-sub-soft);
    text-decoration: none;
    font-size: 13px;
    font-weight: 500;
    transition: color .12s;
  }
  .pj-sub-back:hover { color: var(--pj-sub-text); }

  .pj-sub-lead {
    margin: 0 0 24px;
    font-size: 15px;
    line-height: 1.55;
    color: var(--pj-sub-soft);
    max-width: 560px;
  }

  .pj-sub-total {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 16px;
    padding: 14px 16px;
    border-radius: 12px;
    background: color-mix(in srgb, var(--pj-sub-card) 88%, transparent);
    border: 1px solid color-mix(in srgb, var(--border) 55%, transparent);
  }
  .pj-sub-total strong {
    font-size: 22px;
    font-weight: 500;
    letter-spacing: -.01em;
    font-variant-numeric: tabular-nums;
  }
  .pj-sub-total span { font-size: 12px; color: var(--pj-sub-soft); }

  .pj-sub-cards {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .pj-sub-card {
    padding: 16px 18px;
    border-radius: 14px;
    background: var(--pj-sub-card);
    border: 1px solid color-mix(in srgb, var(--border) 55%, transparent);
    box-shadow: 0 2px 6px rgba(144, 149, 159, 0.06);
  }

  [data-theme="dark"] .pj-sub-card,
  [data-theme="classic-dark"] .pj-sub-card {
    box-shadow: inset 0 1px 0 rgba(255,255,255,.06), 0 2px 8px rgba(0,0,0,.35);
  }

  .pj-sub-card-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 8px;
  }
  .pj-sub-card-head h3 {
    margin: 0;
    font-size: 15px;
    font-weight: 500;
    color: var(--pj-sub-text);
  }
  .pj-sub-amount {
    font-size: 18px;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
    color: var(--pj-sub-text);
  }
  .pj-sub-meta {
    font-size: 12.5px;
    color: var(--pj-sub-soft);
    line-height: 1.5;
  }
  .pj-sub-pay-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 12px;
  }
  .pj-sub-pay {
    flex: 1 1 auto;
    min-width: 88px;
    height: 38px;
    border-radius: 10px;
    border: 0;
    background: var(--btn-prim, #5b647d);
    color: var(--btn-prim-text, #fff);
    font: inherit;
    font-size: 12.5px;
    font-weight: 500;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }
  .pj-sub-pay.ghost {
    background: color-mix(in srgb, var(--surface-2) 70%, transparent);
    color: var(--pj-sub-text);
    border: 1px solid var(--border);
  }
  .pj-sub-pay:disabled { opacity: .5; cursor: not-allowed; }

  .pj-sub-confirm {
    width: 100%;
    height: 48px;
    margin-top: 16px;
    border-radius: 12px;
    border: 0;
    background: var(--btn-prim, #5b647d);
    color: var(--btn-prim-text, #fff);
    font: inherit;
    font-size: 15px;
    font-weight: 500;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
  .pj-sub-confirm:disabled { opacity: .55; cursor: not-allowed; }

  .pj-sub-empty {
    padding: 32px 0;
    color: var(--pj-sub-soft);
    font-size: 14px;
    line-height: 1.55;
  }

  @media (max-width: 768px) {
    .pj-sub-shell {
      padding: 0 16px calc(120px + env(safe-area-inset-bottom, 0px));
    }
    .pj-sub-back { display: none; }
  }
`
