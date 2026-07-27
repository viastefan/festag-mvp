/**
 * Festag atmosphere — directional veils (top / bottom / left / right / center)
 * with distinct patterns per surface so Login, Register, Dev, Onboarding alternate.
 */

export type FestagAmbientSurface =
  | 'login'
  | 'register'
  | 'onboarding'
  | 'enter'
  | 'dev-login'
  | 'dev-onboarding'
  | 'dev-panel'

/** Shared CSS for `.fa-ambient` — injected by FestagAmbient / DevAmbient. */
export const FESTAG_AMBIENT_CSS = `
.fa-ambient {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
  opacity: 0;
  animation: faAmbientReveal 0.85s cubic-bezier(0.22, 1, 0.36, 1) 0.08s forwards;
}

.fa-ambient__top,
.fa-ambient__bottom,
.fa-ambient__left,
.fa-ambient__right,
.fa-ambient__center,
.fa-ambient__drift,
.fa-ambient__grain {
  position: absolute;
  will-change: transform, opacity;
}

.fa-ambient__grain {
  inset: 0;
  opacity: 0.04;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 150px 150px;
  mix-blend-mode: overlay;
  will-change: auto;
}

.fa-ambient__top {
  left: -20%;
  right: -20%;
  top: -18%;
  height: 52%;
}
.fa-ambient__bottom {
  left: -24%;
  right: -24%;
  bottom: -22%;
  height: 58%;
}
.fa-ambient__left {
  top: -15%;
  bottom: -15%;
  left: -22%;
  width: 48%;
}
.fa-ambient__right {
  top: -15%;
  bottom: -15%;
  right: -22%;
  width: 48%;
}
.fa-ambient__center {
  left: 18%;
  right: 18%;
  top: 22%;
  bottom: 22%;
  border-radius: 50%;
}
.fa-ambient__drift {
  inset: -30%;
}

@keyframes faAmbientReveal {
  from { opacity: 0; }
  to   { opacity: 1; }
}

/* ── Motions: readable travel, calm timing ── */
@keyframes faVeilTop {
  0%   { transform: translate3d(-4%, 0, 0) scaleX(1.05) scaleY(1); opacity: 0.85; }
  100% { transform: translate3d(6%, 6%, 0) scaleX(1.18) scaleY(1.14); opacity: 1; }
}
@keyframes faVeilBottom {
  0%   { transform: translate3d(5%, 4%, 0) scaleX(1.06) scaleY(1); opacity: 0.88; }
  100% { transform: translate3d(-7%, -10%, 0) scaleX(1.22) scaleY(1.2); opacity: 1; }
}
@keyframes faVeilLeft {
  0%   { transform: translate3d(-4%, 3%, 0) scaleX(1) scaleY(1.05); opacity: 0.82; }
  100% { transform: translate3d(12%, -5%, 0) scaleX(1.2) scaleY(1.12); opacity: 1; }
}
@keyframes faVeilRight {
  0%   { transform: translate3d(4%, -2%, 0) scaleX(1) scaleY(1.04); opacity: 0.82; }
  100% { transform: translate3d(-12%, 6%, 0) scaleX(1.18) scaleY(1.14); opacity: 1; }
}
@keyframes faVeilCenter {
  0%   { transform: translate3d(0, 4%, 0) scale(0.88); opacity: 0.55; }
  100% { transform: translate3d(0, -6%, 0) scale(1.18); opacity: 0.95; }
}
@keyframes faVeilDriftA {
  0%   { transform: translate3d(0, 0, 0) rotate(0deg) scale(1); }
  100% { transform: translate3d(-5%, 4%, 0) rotate(-2deg) scale(1.08); }
}
@keyframes faVeilDriftB {
  0%   { transform: translate3d(0, 0, 0) rotate(0deg) scale(1); }
  100% { transform: translate3d(5%, -3.5%, 0) rotate(2.2deg) scale(1.07); }
}
@keyframes faVeilDriftC {
  0%   { transform: translate3d(0, 0, 0) rotate(0deg) scale(1.02); }
  100% { transform: translate3d(-3%, -5%, 0) rotate(1.4deg) scale(1.1); }
}

.fa-ambient__top    { animation: faVeilTop 11s cubic-bezier(0.4, 0, 0.6, 1) infinite alternate; }
.fa-ambient__bottom { animation: faVeilBottom 13s cubic-bezier(0.4, 0, 0.6, 1) 0.2s infinite alternate; }
.fa-ambient__left   { animation: faVeilLeft 12s cubic-bezier(0.4, 0, 0.6, 1) 0.35s infinite alternate; }
.fa-ambient__right  { animation: faVeilRight 14s cubic-bezier(0.4, 0, 0.6, 1) 0.15s infinite alternate; }
.fa-ambient__center { animation: faVeilCenter 10s cubic-bezier(0.4, 0, 0.6, 1) 0.45s infinite alternate; }
.fa-ambient__drift  { animation: faVeilDriftA 16s ease-in-out infinite alternate; opacity: 0.9; }

/* ═══════════ LOGIN — warm sand, bottom + left bias ═══════════ */
.fa-ambient[data-surface="login"] .fa-ambient__top {
  background:
    radial-gradient(ellipse 90% 70% at 30% 0%, rgba(236, 176, 128, 0.28), transparent 62%),
    radial-gradient(ellipse 60% 50% at 80% 10%, rgba(168, 152, 138, 0.14), transparent 58%);
}
.fa-ambient[data-surface="login"] .fa-ambient__bottom {
  background:
    radial-gradient(ellipse 100% 70% at 50% 100%, rgba(242, 198, 158, 0.42), transparent 58%),
    radial-gradient(ellipse 70% 55% at 15% 90%, rgba(228, 168, 120, 0.28), transparent 60%),
    radial-gradient(ellipse 55% 45% at 88% 95%, rgba(220, 154, 108, 0.22), transparent 58%);
}
.fa-ambient[data-surface="login"] .fa-ambient__left {
  background: radial-gradient(ellipse 80% 70% at 0% 55%, rgba(232, 162, 112, 0.26), transparent 62%);
}
.fa-ambient[data-surface="login"] .fa-ambient__right {
  background: radial-gradient(ellipse 75% 65% at 100% 40%, rgba(92, 85, 76, 0.10), transparent 60%);
}
.fa-ambient[data-surface="login"] .fa-ambient__center {
  background: radial-gradient(ellipse 55% 50% at 50% 50%, rgba(238, 172, 122, 0.18), transparent 70%);
}
.fa-ambient[data-surface="login"] .fa-ambient__drift {
  background:
    radial-gradient(ellipse 50% 45% at 70% 30%, rgba(232, 162, 112, 0.16), transparent 62%),
    radial-gradient(ellipse 45% 50% at 25% 75%, rgba(244, 190, 145, 0.14), transparent 60%);
  animation-name: faVeilDriftA;
}

/* ═══════════ REGISTER — cooler sand, right + top bias ═══════════ */
.fa-ambient[data-surface="register"] .fa-ambient__top {
  background:
    radial-gradient(ellipse 85% 65% at 75% -5%, rgba(200, 168, 140, 0.30), transparent 58%),
    radial-gradient(ellipse 55% 48% at 20% 8%, rgba(140, 128, 118, 0.12), transparent 55%);
}
.fa-ambient[data-surface="register"] .fa-ambient__bottom {
  background:
    radial-gradient(ellipse 90% 60% at 70% 105%, rgba(220, 170, 130, 0.32), transparent 58%),
    radial-gradient(ellipse 60% 50% at 20% 95%, rgba(168, 140, 120, 0.18), transparent 58%);
}
.fa-ambient[data-surface="register"] .fa-ambient__left {
  background: radial-gradient(ellipse 70% 80% at 5% 35%, rgba(120, 110, 100, 0.12), transparent 60%);
}
.fa-ambient[data-surface="register"] .fa-ambient__right {
  background: radial-gradient(ellipse 85% 75% at 100% 60%, rgba(236, 176, 128, 0.30), transparent 60%);
}
.fa-ambient[data-surface="register"] .fa-ambient__center {
  background: radial-gradient(ellipse 60% 55% at 58% 45%, rgba(210, 160, 120, 0.16), transparent 68%);
}
.fa-ambient[data-surface="register"] .fa-ambient__drift {
  background:
    radial-gradient(ellipse 48% 42% at 30% 40%, rgba(200, 150, 115, 0.14), transparent 60%),
    radial-gradient(ellipse 52% 48% at 78% 70%, rgba(180, 140, 110, 0.12), transparent 62%);
  animation-name: faVeilDriftB;
}
.fa-ambient[data-surface="register"] .fa-ambient__top { animation-duration: 13s; }
.fa-ambient[data-surface="register"] .fa-ambient__bottom { animation-duration: 10s; }

/* ═══════════ ONBOARDING (client) — wide horizontal bands ═══════════ */
.fa-ambient[data-surface="onboarding"] .fa-ambient__top {
  background: linear-gradient(180deg, rgba(236, 176, 128, 0.26) 0%, transparent 70%),
    radial-gradient(ellipse 100% 50% at 50% -10%, rgba(244, 200, 160, 0.22), transparent 55%);
}
.fa-ambient[data-surface="onboarding"] .fa-ambient__bottom {
  background: linear-gradient(0deg, rgba(220, 154, 108, 0.34) 0%, transparent 68%),
    radial-gradient(ellipse 100% 55% at 50% 110%, rgba(232, 170, 125, 0.28), transparent 55%);
}
.fa-ambient[data-surface="onboarding"] .fa-ambient__left {
  background: radial-gradient(ellipse 90% 60% at 0% 50%, rgba(168, 140, 115, 0.20), transparent 58%);
}
.fa-ambient[data-surface="onboarding"] .fa-ambient__right {
  background: radial-gradient(ellipse 90% 60% at 100% 50%, rgba(200, 155, 120, 0.22), transparent 58%);
}
.fa-ambient[data-surface="onboarding"] .fa-ambient__center {
  background: radial-gradient(ellipse 70% 40% at 50% 50%, rgba(238, 180, 135, 0.14), transparent 70%);
}
.fa-ambient[data-surface="onboarding"] .fa-ambient__drift {
  background: radial-gradient(ellipse 80% 35% at 50% 50%, rgba(232, 162, 112, 0.12), transparent 65%);
  animation-name: faVeilDriftC;
}

/* ═══════════ ENTER — diagonal corners ═══════════ */
.fa-ambient[data-surface="enter"] .fa-ambient__top {
  background: radial-gradient(ellipse 70% 60% at 8% 0%, rgba(236, 176, 128, 0.32), transparent 58%);
}
.fa-ambient[data-surface="enter"] .fa-ambient__bottom {
  background: radial-gradient(ellipse 75% 65% at 92% 100%, rgba(220, 154, 108, 0.36), transparent 58%);
}
.fa-ambient[data-surface="enter"] .fa-ambient__left {
  background: radial-gradient(ellipse 80% 70% at 0% 80%, rgba(168, 130, 100, 0.20), transparent 60%);
}
.fa-ambient[data-surface="enter"] .fa-ambient__right {
  background: radial-gradient(ellipse 80% 70% at 100% 15%, rgba(200, 160, 125, 0.24), transparent 60%);
}
.fa-ambient[data-surface="enter"] .fa-ambient__center {
  background: radial-gradient(ellipse 50% 50% at 45% 55%, rgba(244, 190, 145, 0.12), transparent 68%);
}
.fa-ambient[data-surface="enter"] .fa-ambient__drift {
  background:
    radial-gradient(ellipse 40% 55% at 20% 25%, rgba(232, 162, 112, 0.14), transparent 60%),
    radial-gradient(ellipse 45% 40% at 80% 80%, rgba(180, 140, 105, 0.12), transparent 60%);
  animation-name: faVeilDriftB;
}

/* ═══════════ DEV LOGIN — slate + sand, right-heavy ═══════════ */
.fa-ambient[data-surface="dev-login"] .fa-ambient__top {
  background:
    radial-gradient(ellipse 80% 60% at 85% 0%, rgba(91, 100, 125, 0.28), transparent 55%),
    radial-gradient(ellipse 50% 45% at 20% 5%, rgba(236, 176, 128, 0.18), transparent 55%);
}
.fa-ambient[data-surface="dev-login"] .fa-ambient__bottom {
  background:
    radial-gradient(ellipse 95% 65% at 55% 105%, rgba(91, 100, 125, 0.32), transparent 55%),
    radial-gradient(ellipse 60% 50% at 10% 95%, rgba(160, 112, 68, 0.16), transparent 58%);
}
.fa-ambient[data-surface="dev-login"] .fa-ambient__left {
  background: radial-gradient(ellipse 75% 80% at 0% 45%, rgba(120, 128, 150, 0.22), transparent 60%);
}
.fa-ambient[data-surface="dev-login"] .fa-ambient__right {
  background: radial-gradient(ellipse 85% 75% at 100% 55%, rgba(91, 100, 125, 0.30), transparent 58%);
}
.fa-ambient[data-surface="dev-login"] .fa-ambient__center {
  background: radial-gradient(ellipse 55% 50% at 55% 48%, rgba(110, 118, 140, 0.16), transparent 68%);
}
.fa-ambient[data-surface="dev-login"] .fa-ambient__drift {
  background:
    radial-gradient(ellipse 42% 55% at 30% 35%, rgba(91, 100, 125, 0.14), transparent 60%),
    radial-gradient(ellipse 48% 40% at 75% 70%, rgba(180, 130, 90, 0.10), transparent 60%);
  animation-name: faVeilDriftB;
}

/* ═══════════ DEV ONBOARDING — vertical slate pillars ═══════════ */
.fa-ambient[data-surface="dev-onboarding"] .fa-ambient__top {
  background: radial-gradient(ellipse 100% 55% at 50% -5%, rgba(91, 100, 125, 0.24), transparent 55%);
}
.fa-ambient[data-surface="dev-onboarding"] .fa-ambient__bottom {
  background:
    radial-gradient(ellipse 100% 60% at 50% 110%, rgba(91, 100, 125, 0.36), transparent 52%),
    radial-gradient(ellipse 50% 45% at 80% 90%, rgba(160, 112, 68, 0.14), transparent 55%);
}
.fa-ambient[data-surface="dev-onboarding"] .fa-ambient__left {
  background: linear-gradient(90deg, rgba(91, 100, 125, 0.26) 0%, transparent 70%);
}
.fa-ambient[data-surface="dev-onboarding"] .fa-ambient__right {
  background: linear-gradient(270deg, rgba(120, 128, 150, 0.24) 0%, transparent 70%);
}
.fa-ambient[data-surface="dev-onboarding"] .fa-ambient__center {
  background: radial-gradient(ellipse 45% 70% at 50% 50%, rgba(100, 108, 130, 0.18), transparent 68%);
}
.fa-ambient[data-surface="dev-onboarding"] .fa-ambient__drift {
  background: radial-gradient(ellipse 35% 70% at 50% 50%, rgba(91, 100, 125, 0.12), transparent 65%);
  animation-name: faVeilDriftC;
}

/* ═══════════ DEV PANEL — cool slate on #F2F3F5 / OLED, strong edges ═══════════ */
.fa-ambient[data-surface="dev-panel"] .fa-ambient__top {
  background:
    radial-gradient(ellipse 95% 70% at 25% -5%, rgba(91, 100, 125, 0.34), transparent 58%),
    radial-gradient(ellipse 70% 55% at 85% 5%, rgba(148, 156, 176, 0.22), transparent 55%);
}
.fa-ambient[data-surface="dev-panel"] .fa-ambient__bottom {
  background:
    radial-gradient(ellipse 110% 75% at 50% 108%, rgba(91, 100, 125, 0.48), transparent 52%),
    radial-gradient(ellipse 70% 55% at 12% 95%, rgba(120, 128, 150, 0.32), transparent 55%),
    radial-gradient(ellipse 55% 50% at 90% 98%, rgba(140, 148, 170, 0.26), transparent 55%);
}
.fa-ambient[data-surface="dev-panel"] .fa-ambient__left {
  background: radial-gradient(ellipse 90% 85% at -5% 50%, rgba(91, 100, 125, 0.36), transparent 58%);
}
.fa-ambient[data-surface="dev-panel"] .fa-ambient__right {
  background: radial-gradient(ellipse 90% 85% at 105% 45%, rgba(120, 128, 150, 0.34), transparent 58%);
}
.fa-ambient[data-surface="dev-panel"] .fa-ambient__center {
  background: radial-gradient(ellipse 55% 50% at 50% 50%, rgba(148, 156, 176, 0.22), transparent 68%);
}
.fa-ambient[data-surface="dev-panel"] .fa-ambient__drift {
  background:
    radial-gradient(ellipse 45% 40% at 35% 40%, rgba(110, 118, 140, 0.18), transparent 60%),
    radial-gradient(ellipse 50% 45% at 70% 65%, rgba(160, 168, 184, 0.14), transparent 60%);
  animation-name: faVeilDriftA;
}

/* Light multiply softens into gray canvas; dark screens lift */
html[data-theme-surface="dev"]:not([data-theme="dark"]):not([data-theme="classic-dark"])
  .fa-ambient[data-surface="dev-panel"] .fa-ambient__top,
html[data-theme-surface="dev"]:not([data-theme="dark"]):not([data-theme="classic-dark"])
  .fa-ambient[data-surface="dev-panel"] .fa-ambient__bottom,
html[data-theme-surface="dev"]:not([data-theme="dark"]):not([data-theme="classic-dark"])
  .fa-ambient[data-surface="dev-panel"] .fa-ambient__left,
html[data-theme-surface="dev"]:not([data-theme="dark"]):not([data-theme="classic-dark"])
  .fa-ambient[data-surface="dev-panel"] .fa-ambient__right,
html[data-theme-surface="dev"]:not([data-theme="dark"]):not([data-theme="classic-dark"])
  .fa-ambient[data-surface="dev-panel"] .fa-ambient__center {
  mix-blend-mode: multiply;
}

html[data-theme-surface="dev"][data-theme="dark"] .fa-ambient[data-surface="dev-panel"] .fa-ambient__top,
html[data-theme-surface="dev"][data-theme="classic-dark"] .fa-ambient[data-surface="dev-panel"] .fa-ambient__top,
html[data-theme-surface="dev"][data-theme="dark"] .fa-ambient[data-surface="dev-panel"] .fa-ambient__bottom,
html[data-theme-surface="dev"][data-theme="classic-dark"] .fa-ambient[data-surface="dev-panel"] .fa-ambient__bottom,
html[data-theme-surface="dev"][data-theme="dark"] .fa-ambient[data-surface="dev-panel"] .fa-ambient__left,
html[data-theme-surface="dev"][data-theme="classic-dark"] .fa-ambient[data-surface="dev-panel"] .fa-ambient__left,
html[data-theme-surface="dev"][data-theme="dark"] .fa-ambient[data-surface="dev-panel"] .fa-ambient__right,
html[data-theme-surface="dev"][data-theme="classic-dark"] .fa-ambient[data-surface="dev-panel"] .fa-ambient__right,
html[data-theme-surface="dev"][data-theme="dark"] .fa-ambient[data-surface="dev-panel"] .fa-ambient__center,
html[data-theme-surface="dev"][data-theme="classic-dark"] .fa-ambient[data-surface="dev-panel"] .fa-ambient__center,
html[data-theme-surface="dev"][data-theme="dark"] .fa-ambient[data-surface="dev-panel"] .fa-ambient__drift,
html[data-theme-surface="dev"][data-theme="classic-dark"] .fa-ambient[data-surface="dev-panel"] .fa-ambient__drift {
  mix-blend-mode: screen;
}

/* Dark auth surfaces — dedicated sandy-amber (light sand alone vanishes on OLED).
 * No slate primary accents in dark — those stay light-mode only. */
:is(.al-root, .dl-root, .ae-root)[data-theme="dark"] .fa-ambient {
  /* Keep fixed layer under chrome — never inherit relative stacking from siblings. */
  position: fixed !important;
  z-index: 0 !important;
}

:is(.al-root, .dl-root, .ae-root)[data-theme="dark"] .fa-ambient[data-surface="login"] .fa-ambient__top {
  background:
    radial-gradient(ellipse 100% 75% at 8% -8%, rgba(188, 128, 72, 0.42), transparent 56%),
    radial-gradient(ellipse 70% 55% at 78% 6%, rgba(150, 104, 62, 0.22), transparent 58%);
  filter: none;
}
:is(.al-root, .dl-root, .ae-root)[data-theme="dark"] .fa-ambient[data-surface="login"] .fa-ambient__bottom {
  background:
    radial-gradient(ellipse 110% 70% at 48% 112%, rgba(160, 110, 68, 0.36), transparent 52%),
    radial-gradient(ellipse 70% 55% at 12% 95%, rgba(120, 82, 50, 0.26), transparent 58%),
    linear-gradient(145deg, rgba(52, 38, 26, 0.55) 0%, transparent 42%, transparent 58%, rgba(32, 24, 18, 0.40) 100%);
  filter: none;
}
:is(.al-root, .dl-root, .ae-root)[data-theme="dark"] .fa-ambient[data-surface="login"] .fa-ambient__left {
  background: radial-gradient(ellipse 90% 80% at 0% 50%, rgba(170, 118, 72, 0.28), transparent 60%);
  filter: none;
}
:is(.al-root, .dl-root, .ae-root)[data-theme="dark"] .fa-ambient[data-surface="login"] .fa-ambient__right {
  background: radial-gradient(ellipse 85% 70% at 100% 42%, rgba(130, 90, 55, 0.20), transparent 58%);
  filter: none;
}
:is(.al-root, .dl-root, .ae-root)[data-theme="dark"] .fa-ambient[data-surface="login"] .fa-ambient__center {
  background: radial-gradient(ellipse 55% 50% at 50% 50%, rgba(190, 132, 78, 0.18), transparent 70%);
  filter: none;
}
:is(.al-root, .dl-root, .ae-root)[data-theme="dark"] .fa-ambient[data-surface="login"] .fa-ambient__drift {
  background:
    radial-gradient(ellipse 58% 52% at 70% 28%, rgba(170, 118, 72, 0.24), transparent 62%),
    radial-gradient(ellipse 54% 48% at 20% 74%, rgba(130, 90, 55, 0.18), transparent 60%);
  filter: none;
}

:is(.al-root, .dl-root, .ae-root)[data-theme="dark"] .fa-ambient[data-surface="register"] .fa-ambient__top {
  background:
    radial-gradient(ellipse 95% 70% at 78% -6%, rgba(180, 124, 78, 0.36), transparent 56%),
    radial-gradient(ellipse 55% 48% at 22% 8%, rgba(110, 88, 68, 0.18), transparent 55%);
  filter: none;
}
:is(.al-root, .dl-root, .ae-root)[data-theme="dark"] .fa-ambient[data-surface="register"] .fa-ambient__bottom {
  background:
    radial-gradient(ellipse 100% 65% at 65% 108%, rgba(150, 104, 68, 0.32), transparent 55%),
    radial-gradient(ellipse 60% 50% at 18% 95%, rgba(100, 72, 48, 0.22), transparent 58%);
  filter: none;
}
:is(.al-root, .dl-root, .ae-root)[data-theme="dark"] .fa-ambient[data-surface="register"] .fa-ambient__left {
  background: radial-gradient(ellipse 80% 85% at 0% 40%, rgba(120, 90, 62, 0.18), transparent 60%);
  filter: none;
}
:is(.al-root, .dl-root, .ae-root)[data-theme="dark"] .fa-ambient[data-surface="register"] .fa-ambient__right {
  background: radial-gradient(ellipse 90% 80% at 100% 55%, rgba(188, 128, 72, 0.30), transparent 58%);
  filter: none;
}
:is(.al-root, .dl-root, .ae-root)[data-theme="dark"] .fa-ambient[data-surface="register"] .fa-ambient__center {
  background: radial-gradient(ellipse 58% 52% at 58% 45%, rgba(160, 112, 72, 0.16), transparent 68%);
  filter: none;
}
:is(.al-root, .dl-root, .ae-root)[data-theme="dark"] .fa-ambient[data-surface="register"] .fa-ambient__drift {
  background:
    radial-gradient(ellipse 48% 42% at 30% 40%, rgba(150, 105, 70, 0.18), transparent 60%),
    radial-gradient(ellipse 52% 48% at 78% 70%, rgba(130, 92, 60, 0.14), transparent 62%);
  filter: none;
}

:is(.al-root, .dl-root, .ae-root)[data-theme="dark"] .fa-ambient[data-surface="onboarding"] .fa-ambient__top,
:is(.al-root, .dl-root, .ae-root)[data-theme="dark"] .fa-ambient[data-surface="enter"] .fa-ambient__top,
:is(.al-root, .dl-root, .ae-root)[data-theme="dark"] .fa-ambient[data-surface="dev-login"] .fa-ambient__top,
:is(.al-root, .dl-root, .ae-root)[data-theme="dark"] .fa-ambient[data-surface="dev-onboarding"] .fa-ambient__top {
  background:
    radial-gradient(ellipse 100% 70% at 20% -8%, rgba(178, 122, 72, 0.34), transparent 56%),
    radial-gradient(ellipse 70% 50% at 85% 8%, rgba(140, 98, 60, 0.18), transparent 55%);
  filter: none;
}
:is(.al-root, .dl-root, .ae-root)[data-theme="dark"] .fa-ambient[data-surface="onboarding"] .fa-ambient__bottom,
:is(.al-root, .dl-root, .ae-root)[data-theme="dark"] .fa-ambient[data-surface="enter"] .fa-ambient__bottom,
:is(.al-root, .dl-root, .ae-root)[data-theme="dark"] .fa-ambient[data-surface="dev-login"] .fa-ambient__bottom,
:is(.al-root, .dl-root, .ae-root)[data-theme="dark"] .fa-ambient[data-surface="dev-onboarding"] .fa-ambient__bottom {
  background:
    radial-gradient(ellipse 110% 70% at 50% 110%, rgba(155, 108, 68, 0.34), transparent 52%),
    linear-gradient(160deg, rgba(48, 36, 26, 0.50) 0%, transparent 45%);
  filter: none;
}
:is(.al-root, .dl-root, .ae-root)[data-theme="dark"] .fa-ambient[data-surface="onboarding"] .fa-ambient__left,
:is(.al-root, .dl-root, .ae-root)[data-theme="dark"] .fa-ambient[data-surface="enter"] .fa-ambient__left,
:is(.al-root, .dl-root, .ae-root)[data-theme="dark"] .fa-ambient[data-surface="dev-login"] .fa-ambient__left,
:is(.al-root, .dl-root, .ae-root)[data-theme="dark"] .fa-ambient[data-surface="dev-onboarding"] .fa-ambient__left {
  background: radial-gradient(ellipse 85% 80% at 0% 50%, rgba(160, 112, 70, 0.24), transparent 60%);
  filter: none;
}
:is(.al-root, .dl-root, .ae-root)[data-theme="dark"] .fa-ambient[data-surface="onboarding"] .fa-ambient__right,
:is(.al-root, .dl-root, .ae-root)[data-theme="dark"] .fa-ambient[data-surface="enter"] .fa-ambient__right,
:is(.al-root, .dl-root, .ae-root)[data-theme="dark"] .fa-ambient[data-surface="dev-login"] .fa-ambient__right,
:is(.al-root, .dl-root, .ae-root)[data-theme="dark"] .fa-ambient[data-surface="dev-onboarding"] .fa-ambient__right {
  background: radial-gradient(ellipse 85% 75% at 100% 48%, rgba(140, 96, 58, 0.22), transparent 58%);
  filter: none;
}
:is(.al-root, .dl-root, .ae-root)[data-theme="dark"] .fa-ambient[data-surface="onboarding"] .fa-ambient__center,
:is(.al-root, .dl-root, .ae-root)[data-theme="dark"] .fa-ambient[data-surface="enter"] .fa-ambient__center,
:is(.al-root, .dl-root, .ae-root)[data-theme="dark"] .fa-ambient[data-surface="dev-login"] .fa-ambient__center,
:is(.al-root, .dl-root, .ae-root)[data-theme="dark"] .fa-ambient[data-surface="dev-onboarding"] .fa-ambient__center,
:is(.al-root, .dl-root, .ae-root)[data-theme="dark"] .fa-ambient[data-surface="onboarding"] .fa-ambient__drift,
:is(.al-root, .dl-root, .ae-root)[data-theme="dark"] .fa-ambient[data-surface="enter"] .fa-ambient__drift,
:is(.al-root, .dl-root, .ae-root)[data-theme="dark"] .fa-ambient[data-surface="dev-login"] .fa-ambient__drift,
:is(.al-root, .dl-root, .ae-root)[data-theme="dark"] .fa-ambient[data-surface="dev-onboarding"] .fa-ambient__drift {
  filter: none;
}

:is(.al-root, .dl-root, .ae-root)[data-theme="dark"] .fa-ambient__grain {
  opacity: 0.07;
  mix-blend-mode: soft-light;
}

@media (prefers-reduced-motion: reduce) {
  .fa-ambient {
    animation: none !important;
    opacity: 0.95;
  }
  .fa-ambient__top,
  .fa-ambient__bottom,
  .fa-ambient__left,
  .fa-ambient__right,
  .fa-ambient__center,
  .fa-ambient__drift {
    animation: none !important;
  }
}
`
