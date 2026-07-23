/**
 * Canonical Festag auth chrome tokens — login, register, onboarding, Dev login.
 * Light = white CTAs + cool gray inputs. Dark = quieter slate CTAs + solid field fills
 * (never near-canvas #0f1011 — that made filled/autofill fields disappear on blur).
 */

/** CSS custom properties for light auth surfaces (.al-root / .dl-root default). */
export const AUTH_CHROME_VARS_LIGHT = `
  --festag-btn-dark-bg:#ffffff;
  --festag-btn-dark-bg-hover:#fafafa;
  --festag-btn-dark-bg-active:#f4f4f5;
  --festag-btn-dark-fg:#1e1e20;
  --festag-btn-dark-fg-hover:#1e1e20;
  --festag-btn-dark-fg-active:#1e1e20;
  --festag-btn-dark-border:rgba(30, 30, 32, 0.08);
  --festag-btn-dark-border-hover:rgba(30, 30, 32, 0.12);
  --festag-btn-dark-border-active:rgba(30, 30, 32, 0.12);
  --festag-btn-dark-shadow:0 1px 2px rgba(0, 0, 0, 0.04);
  --festag-btn-dark-shadow-hover:0 1px 2px rgba(0, 0, 0, 0.06);
  --festag-btn-dark-shadow-active:0 1px 1px rgba(0, 0, 0, 0.03);
  --festag-input-fill:#EEEEF0;
  --festag-input-fill-focus:#E4E4E9;
  /* Placeholder — readable like Apple/Linear secondary, not near-invisible. */
  --festag-input-placeholder:#8e95a3;
`

/**
 * Dark auth — slightly denser/sleeker CTAs than the old 0.18 lift.
 * Input fills are opaque slate so idle, filled, and autofill stay visible on OLED.
 */
export const AUTH_CHROME_VARS_DARK = `
  --festag-btn-dark-bg:rgba(186,194,210,0.08);
  --festag-btn-dark-bg-hover:rgba(186,194,210,0.16);
  --festag-btn-dark-bg-active:rgba(186,194,210,0.22);
  --festag-btn-dark-fg:rgba(245,245,247,0.88);
  --festag-btn-dark-fg-hover:rgba(245,245,247,0.96);
  --festag-btn-dark-fg-active:#f5f5f7;
  --festag-btn-dark-border:rgba(255,255,255,0.06);
  --festag-btn-dark-border-hover:rgba(255,255,255,0.09);
  --festag-btn-dark-border-active:rgba(255,255,255,0.07);
  --festag-btn-dark-shadow:0 1px 2px rgba(0, 0, 0, 0.12);
  --festag-btn-dark-shadow-hover:0 1px 2px rgba(0, 0, 0, 0.16);
  --festag-btn-dark-shadow-active:0 1px 1px rgba(0, 0, 0, 0.1);
  --festag-btn-dark-ready-bg:rgba(186,194,210,0.28);
  --festag-btn-dark-ready-bg-hover:rgba(186,194,210,0.36);
  --festag-btn-dark-ready-bg-active:rgba(186,194,210,0.42);
  --festag-input-fill:#1c1d22;
  --festag-input-fill-focus:#24262c;
  /* Focus hairline — quiet white edge while typing. */
  --festag-input-border-focus:rgba(255,255,255,0.28);
  /* Soft slate type — a touch brighter than 0.90 for readability, still below button white. */
  --festag-input-fg:rgba(232,236,242,0.94);
  --festag-input-caret:rgba(198,206,222,0.78);
  --festag-input-placeholder:rgba(245,245,247,0.32);
`

/** Solid hex mirrors for autofill inset paint (Chrome ignores translucent fills). */
export const AUTH_INPUT_FILL_LIGHT = '#EEEEF0'
export const AUTH_INPUT_FILL_LIGHT_FOCUS = '#E4E4E9'
export const AUTH_INPUT_FILL_DARK = '#1c1d22'
export const AUTH_INPUT_FILL_DARK_FOCUS = '#24262c'
/** Soft slate typed text on dark fields — quieter than #f5f5f7 button white. */
export const AUTH_INPUT_FG_DARK = 'rgba(232,236,242,0.94)'
export const AUTH_INPUT_CARET_DARK = 'rgba(198,206,222,0.78)'
export const AUTH_INPUT_PLACEHOLDER_DARK = 'rgba(245,245,247,0.32)'
/** Light placeholder — secondary gray, clearly visible on cool field fills. */
export const AUTH_INPUT_PLACEHOLDER_LIGHT = '#8e95a3'
