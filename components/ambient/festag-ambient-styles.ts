/**
 * Festag atmosphere — quiet cinematic veils.
 * Soft float / breathe / scale — never loud washes.
 * Auth = warm sand. Client + Dev panels = primary blue #5B647D only (no orange).
 */

export type FestagAmbientSurface =
  | 'login'
  | 'register'
  | 'onboarding'
  | 'enter'
  | 'dev-login'
  | 'dev-onboarding'
  | 'dev-panel'
  | 'client-panel'

export const FESTAG_AMBIENT_CSS = `
.fa-ambient {
  position: fixed !important;
  inset: 0;
  z-index: 0 !important;
  pointer-events: none;
  overflow: hidden;
  opacity: 1;
  will-change: transform;
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
  opacity: 0.022;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 160px 160px;
  mix-blend-mode: overlay;
  will-change: auto;
}

.fa-ambient__top {
  /* Floating blob — not a top-edge band */
  left: -18%;
  width: 72%;
  top: 4%;
  height: 48%;
  border-radius: 50%;
  filter: blur(8px);
}
.fa-ambient__bottom {
  /* Floating blob — not a bottom-edge band */
  right: -18%;
  left: auto;
  width: 76%;
  bottom: auto;
  top: 42%;
  height: 52%;
  border-radius: 50%;
  filter: blur(8px);
}
.fa-ambient__left {
  top: 8%;
  bottom: auto;
  height: 70%;
  left: -18%;
  width: 52%;
  border-radius: 50%;
  filter: blur(6px);
}
.fa-ambient__right {
  top: auto;
  bottom: 6%;
  height: 68%;
  right: -18%;
  width: 52%;
  border-radius: 50%;
  filter: blur(6px);
}
.fa-ambient__center {
  left: 12%;
  right: 12%;
  top: 18%;
  bottom: 18%;
  border-radius: 50%;
  filter: blur(52px);
  opacity: 0.7;
}
.fa-ambient__drift {
  inset: -35%;
  opacity: 0.75;
}

/* ── Free drift: travel through the frame, not glued to edges ── */
@keyframes faAmbientFloat {
  0%   { transform: translate3d(0, 0, 0) scale(1); }
  35%  { transform: translate3d(2.2%, -1.8%, 0) scale(1.05); }
  70%  { transform: translate3d(-1.8%, 2.2%, 0) scale(0.96); }
  100% { transform: translate3d(1.2%, 0.8%, 0) scale(1.03); }
}
@keyframes faVeilTop {
  0%   { transform: translate3d(-4%, 6%, 0) scale(1); opacity: 0.7; }
  40%  { transform: translate3d(10%, 18%, 0) scale(1.12); opacity: 0.95; }
  100% { transform: translate3d(16%, 10%, 0) scale(1.05); opacity: 0.78; }
}
@keyframes faVeilBottom {
  0%   { transform: translate3d(6%, -4%, 0) scale(1); opacity: 0.72; }
  45%  { transform: translate3d(-12%, -16%, 0) scale(1.14); opacity: 1; }
  100% { transform: translate3d(-8%, -8%, 0) scale(1.06); opacity: 0.8; }
}
@keyframes faVeilLeft {
  0%   { transform: translate3d(2%, -6%, 0) scale(1); opacity: 0.68; }
  50%  { transform: translate3d(14%, 8%, 0) scale(1.1); opacity: 0.94; }
  100% { transform: translate3d(8%, 4%, 0) scale(1.04); opacity: 0.76; }
}
@keyframes faVeilRight {
  0%   { transform: translate3d(-2%, 4%, 0) scale(1); opacity: 0.68; }
  50%  { transform: translate3d(-14%, -10%, 0) scale(1.1); opacity: 0.94; }
  100% { transform: translate3d(-6%, -4%, 0) scale(1.04); opacity: 0.76; }
}
@keyframes faVeilCenter {
  0%   { transform: translate3d(-3%, 4%, 0) scale(0.9); opacity: 0.32; }
  50%  { transform: translate3d(3%, -5%, 0) scale(1.14); opacity: 0.58; }
  100% { transform: translate3d(2%, 2%, 0) scale(0.98); opacity: 0.4; }
}
@keyframes faVeilDriftA {
  0%   { transform: translate3d(0, 0, 0) scale(1); }
  50%  { transform: translate3d(-5%, 4%, 0) scale(1.08); }
  100% { transform: translate3d(4%, -4%, 0) scale(0.96); }
}
@keyframes faVeilDriftB {
  0%   { transform: translate3d(0, 0, 0) scale(1); }
  50%  { transform: translate3d(5%, -4%, 0) scale(1.07); }
  100% { transform: translate3d(-3%, 5%, 0) scale(0.95); }
}
@keyframes faVeilDriftC {
  0%   { transform: translate3d(0, 0, 0) scale(1.02); }
  50%  { transform: translate3d(-4%, -5%, 0) scale(1.09); }
  100% { transform: translate3d(4%, 3%, 0) scale(0.95); }
}

/* Dev panel — quiet drift inside the content canvas only (smaller travel) */
@keyframes faPanelFloat {
  0%   { transform: translate3d(0, 0, 0) scale(1); }
  50%  { transform: translate3d(1.2%, -0.8%, 0) scale(1.02); }
  100% { transform: translate3d(-0.8%, 1%, 0) scale(1.01); }
}
@keyframes faPanelVeilTop {
  0%   { transform: translate3d(-1.5%, 2%, 0) scale(1); opacity: 0.55; }
  50%  { transform: translate3d(3%, 4%, 0) scale(1.04); opacity: 0.72; }
  100% { transform: translate3d(2%, 1%, 0) scale(1.02); opacity: 0.58; }
}
@keyframes faPanelVeilBottom {
  0%   { transform: translate3d(1.5%, -2%, 0) scale(1); opacity: 0.55; }
  50%  { transform: translate3d(-3%, -4%, 0) scale(1.04); opacity: 0.74; }
  100% { transform: translate3d(-1.5%, -1.5%, 0) scale(1.02); opacity: 0.6; }
}
@keyframes faPanelVeilSide {
  0%   { transform: translate3d(0, -1.5%, 0) scale(1); opacity: 0.5; }
  50%  { transform: translate3d(2.5%, 2%, 0) scale(1.03); opacity: 0.68; }
  100% { transform: translate3d(1%, 1%, 0) scale(1.015); opacity: 0.54; }
}
@keyframes faPanelVeilCenter {
  0%   { transform: translate3d(-1%, 1.5%, 0) scale(0.96); opacity: 0.28; }
  50%  { transform: translate3d(1.5%, -2%, 0) scale(1.05); opacity: 0.42; }
  100% { transform: translate3d(0.5%, 0.5%, 0) scale(1); opacity: 0.32; }
}
@keyframes faPanelVeilDrift {
  0%   { transform: translate3d(0, 0, 0) scale(1); }
  50%  { transform: translate3d(-2%, 1.5%, 0) scale(1.03); }
  100% { transform: translate3d(1.5%, -1.5%, 0) scale(0.98); }
}

.fa-ambient {
  animation: faAmbientFloat 32s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite alternate;
}
.fa-ambient__top    { animation: faVeilTop 22s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite alternate; }
.fa-ambient__bottom { animation: faVeilBottom 26s cubic-bezier(0.45, 0.05, 0.55, 0.95) 0.5s infinite alternate; }
.fa-ambient__left   { animation: faVeilLeft 24s cubic-bezier(0.45, 0.05, 0.55, 0.95) 0.7s infinite alternate; }
.fa-ambient__right  { animation: faVeilRight 28s cubic-bezier(0.45, 0.05, 0.55, 0.95) 0.35s infinite alternate; }
.fa-ambient__center { animation: faVeilCenter 18s cubic-bezier(0.45, 0.05, 0.55, 0.95) 0.9s infinite alternate; }
.fa-ambient__drift  { animation: faVeilDriftA 30s ease-in-out infinite alternate; }

/* ═══════════ LOGIN — floating sand blobs (not edge-pinned) ═══════════ */
.fa-ambient[data-surface="login"] {
  background:
    radial-gradient(ellipse 70% 55% at 28% 22%, rgba(232, 168, 120, 0.055), transparent 62%),
    radial-gradient(ellipse 75% 58% at 62% 72%, rgba(236, 176, 130, 0.06), transparent 60%),
    radial-gradient(ellipse 48% 40% at 82% 48%, rgba(200, 145, 100, 0.03), transparent 60%);
}
.fa-ambient[data-surface="login"] .fa-ambient__top {
  background: radial-gradient(ellipse 78% 70% at 42% 38%, rgba(236, 176, 130, 0.05), transparent 64%);
}
.fa-ambient[data-surface="login"] .fa-ambient__bottom {
  background: radial-gradient(ellipse 82% 72% at 55% 48%, rgba(242, 184, 138, 0.055), transparent 62%);
}
.fa-ambient[data-surface="login"] .fa-ambient__left {
  background: radial-gradient(ellipse 75% 70% at 35% 48%, rgba(228, 160, 115, 0.035), transparent 66%);
}
.fa-ambient[data-surface="login"] .fa-ambient__right {
  background: radial-gradient(ellipse 70% 68% at 62% 52%, rgba(180, 145, 115, 0.028), transparent 64%);
}
.fa-ambient[data-surface="login"] .fa-ambient__center {
  background: radial-gradient(ellipse 52% 48% at 50% 50%, rgba(238, 176, 130, 0.03), transparent 72%);
}
.fa-ambient[data-surface="login"] .fa-ambient__drift {
  background:
    radial-gradient(ellipse 46% 40% at 68% 36%, rgba(232, 160, 115, 0.03), transparent 66%),
    radial-gradient(ellipse 42% 46% at 32% 64%, rgba(244, 184, 140, 0.025), transparent 64%);
  animation-name: faVeilDriftA;
}

/* ═══════════ REGISTER — floating, right-biased ═══════════ */
.fa-ambient[data-surface="register"] {
  background:
    radial-gradient(ellipse 70% 52% at 68% 24%, rgba(210, 165, 130, 0.05), transparent 60%),
    radial-gradient(ellipse 72% 55% at 42% 70%, rgba(220, 162, 122, 0.055), transparent 60%),
    radial-gradient(ellipse 48% 44% at 78% 52%, rgba(236, 176, 132, 0.035), transparent 62%);
}
.fa-ambient[data-surface="register"] .fa-ambient__top {
  background: radial-gradient(ellipse 76% 68% at 58% 40%, rgba(200, 160, 128, 0.045), transparent 62%);
}
.fa-ambient[data-surface="register"] .fa-ambient__bottom {
  background: radial-gradient(ellipse 80% 70% at 48% 52%, rgba(220, 165, 125, 0.05), transparent 62%);
}
.fa-ambient[data-surface="register"] .fa-ambient__left {
  background: radial-gradient(ellipse 70% 72% at 38% 45%, rgba(140, 125, 110, 0.025), transparent 64%);
}
.fa-ambient[data-surface="register"] .fa-ambient__right {
  background: radial-gradient(ellipse 78% 72% at 60% 50%, rgba(232, 170, 128, 0.045), transparent 62%);
}
.fa-ambient[data-surface="register"] .fa-ambient__center {
  background: radial-gradient(ellipse 52% 48% at 58% 45%, rgba(210, 160, 122, 0.028), transparent 70%);
}
.fa-ambient[data-surface="register"] .fa-ambient__drift {
  background:
    radial-gradient(ellipse 42% 38% at 34% 42%, rgba(200, 150, 118, 0.028), transparent 64%),
    radial-gradient(ellipse 46% 42% at 72% 62%, rgba(175, 140, 110, 0.022), transparent 66%);
  animation-name: faVeilDriftB;
}

/* ═══════════ ONBOARDING ═══════════ */
.fa-ambient[data-surface="onboarding"] {
  background:
    radial-gradient(ellipse 85% 50% at 48% 28%, rgba(236, 176, 132, 0.05), transparent 60%),
    radial-gradient(ellipse 88% 52% at 52% 68%, rgba(220, 155, 108, 0.055), transparent 58%);
}
.fa-ambient[data-surface="onboarding"] .fa-ambient__top {
  background: radial-gradient(ellipse 90% 65% at 50% 42%, rgba(244, 190, 148, 0.045), transparent 60%);
}
.fa-ambient[data-surface="onboarding"] .fa-ambient__bottom {
  background: radial-gradient(ellipse 90% 68% at 50% 55%, rgba(220, 155, 108, 0.05), transparent 60%);
}
.fa-ambient[data-surface="onboarding"] .fa-ambient__left {
  background: radial-gradient(ellipse 75% 65% at 40% 50%, rgba(170, 140, 112, 0.03), transparent 62%);
}
.fa-ambient[data-surface="onboarding"] .fa-ambient__right {
  background: radial-gradient(ellipse 75% 65% at 60% 50%, rgba(200, 155, 120, 0.03), transparent 62%);
}
.fa-ambient[data-surface="onboarding"] .fa-ambient__center {
  background: radial-gradient(ellipse 62% 38% at 50% 50%, rgba(238, 180, 138, 0.025), transparent 72%);
}
.fa-ambient[data-surface="onboarding"] .fa-ambient__drift {
  background: radial-gradient(ellipse 68% 32% at 50% 50%, rgba(232, 162, 118, 0.025), transparent 70%);
  animation-name: faVeilDriftC;
}

/* ═══════════ ENTER ═══════════ */
.fa-ambient[data-surface="enter"] {
  background:
    radial-gradient(ellipse 62% 50% at 22% 28%, rgba(236, 176, 130, 0.05), transparent 60%),
    radial-gradient(ellipse 62% 50% at 78% 68%, rgba(220, 155, 108, 0.05), transparent 60%);
}
.fa-ambient[data-surface="enter"] .fa-ambient__top {
  background: radial-gradient(ellipse 70% 68% at 38% 40%, rgba(236, 176, 130, 0.045), transparent 62%);
}
.fa-ambient[data-surface="enter"] .fa-ambient__bottom {
  background: radial-gradient(ellipse 72% 68% at 62% 55%, rgba(220, 155, 108, 0.045), transparent 62%);
}
.fa-ambient[data-surface="enter"] .fa-ambient__left {
  background: radial-gradient(ellipse 72% 70% at 40% 58%, rgba(168, 132, 102, 0.03), transparent 64%);
}
.fa-ambient[data-surface="enter"] .fa-ambient__right {
  background: radial-gradient(ellipse 72% 70% at 58% 42%, rgba(200, 160, 125, 0.032), transparent 64%);
}
.fa-ambient[data-surface="enter"] .fa-ambient__center {
  background: radial-gradient(ellipse 46% 46% at 45% 55%, rgba(244, 188, 145, 0.025), transparent 70%);
}
.fa-ambient[data-surface="enter"] .fa-ambient__drift {
  background:
    radial-gradient(ellipse 36% 48% at 28% 34%, rgba(232, 162, 118, 0.028), transparent 64%),
    radial-gradient(ellipse 40% 36% at 72% 68%, rgba(180, 140, 108, 0.022), transparent 64%);
  animation-name: faVeilDriftB;
}

/* ═══════════ DEV LOGIN / ONBOARDING — primary blue ═══════════ */
.fa-ambient[data-surface="dev-login"],
.fa-ambient[data-surface="dev-onboarding"] {
  background:
    radial-gradient(ellipse 72% 58% at 30% 24%, rgba(91, 100, 125, 0.10), transparent 58%),
    radial-gradient(ellipse 78% 62% at 55% 70%, rgba(91, 100, 125, 0.11), transparent 55%),
    radial-gradient(ellipse 50% 46% at 76% 48%, rgba(91, 100, 125, 0.06), transparent 62%);
}
.fa-ambient[data-surface="dev-login"] .fa-ambient__top,
.fa-ambient[data-surface="dev-onboarding"] .fa-ambient__top {
  background: radial-gradient(ellipse 82% 72% at 42% 40%, rgba(91, 100, 125, 0.09), transparent 60%);
}
.fa-ambient[data-surface="dev-login"] .fa-ambient__bottom,
.fa-ambient[data-surface="dev-onboarding"] .fa-ambient__bottom {
  background: radial-gradient(ellipse 86% 74% at 55% 52%, rgba(91, 100, 125, 0.11), transparent 56%);
}
.fa-ambient[data-surface="dev-login"] .fa-ambient__left,
.fa-ambient[data-surface="dev-onboarding"] .fa-ambient__left {
  background: radial-gradient(ellipse 80% 75% at 38% 50%, rgba(91, 100, 125, 0.08), transparent 60%);
}
.fa-ambient[data-surface="dev-login"] .fa-ambient__right,
.fa-ambient[data-surface="dev-onboarding"] .fa-ambient__right {
  background: radial-gradient(ellipse 75% 70% at 58% 50%, rgba(91, 100, 125, 0.06), transparent 64%);
}
.fa-ambient[data-surface="dev-login"] .fa-ambient__center,
.fa-ambient[data-surface="dev-onboarding"] .fa-ambient__center {
  background: radial-gradient(ellipse 55% 50% at 50% 50%, rgba(91, 100, 125, 0.05), transparent 70%);
}
.fa-ambient[data-surface="dev-login"] .fa-ambient__drift {
  background: radial-gradient(ellipse 45% 40% at 66% 38%, rgba(91, 100, 125, 0.05), transparent 64%);
  animation-name: faVeilDriftB;
}
.fa-ambient[data-surface="dev-onboarding"] .fa-ambient__drift {
  background: radial-gradient(ellipse 40% 55% at 50% 50%, rgba(91, 100, 125, 0.045), transparent 65%);
  animation-name: faVeilDriftC;
}

/* ═══════════ DEV PANEL — clipped to content canvas, full-width, quiet drift ═══════════ */
.fa-ambient[data-surface="dev-panel"] {
  /* Match .dv-canvas — never under the rail / topbar */
  inset: auto !important;
  top: var(--dv-topbar-h, 49px);
  right: 0;
  bottom: 0;
  left: var(--dv-rail-w, 248px);
  overflow: hidden;
  background:
    radial-gradient(ellipse 95% 58% at 50% 28%, rgba(91, 100, 125, 0.055), transparent 68%),
    radial-gradient(ellipse 92% 55% at 50% 78%, rgba(91, 100, 125, 0.05), transparent 66%),
    radial-gradient(ellipse 55% 48% at 18% 52%, rgba(91, 100, 125, 0.04), transparent 70%),
    radial-gradient(ellipse 55% 48% at 82% 48%, rgba(91, 100, 125, 0.04), transparent 70%);
  animation: faPanelFloat 40s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite alternate;
}
.dv-shell.is-collapsed .fa-ambient[data-surface="dev-panel"] {
  left: 0;
}
.fa-ambient[data-surface="dev-panel"] .fa-ambient__top {
  left: -8%;
  width: 116%;
  top: -6%;
  height: 52%;
  background: radial-gradient(ellipse 88% 70% at 50% 42%, rgba(91, 100, 125, 0.055), transparent 64%);
  animation: faPanelVeilTop 36s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite alternate;
}
.fa-ambient[data-surface="dev-panel"] .fa-ambient__bottom {
  left: -8%;
  right: auto;
  width: 116%;
  top: auto;
  bottom: -8%;
  height: 54%;
  background: radial-gradient(ellipse 90% 72% at 50% 48%, rgba(91, 100, 125, 0.06), transparent 62%);
  animation: faPanelVeilBottom 42s cubic-bezier(0.45, 0.05, 0.55, 0.95) 0.4s infinite alternate;
}
.fa-ambient[data-surface="dev-panel"] .fa-ambient__left {
  top: 12%;
  height: 76%;
  left: -12%;
  width: 62%;
  background: radial-gradient(ellipse 78% 72% at 42% 50%, rgba(91, 100, 125, 0.045), transparent 66%);
  animation: faPanelVeilSide 38s cubic-bezier(0.45, 0.05, 0.55, 0.95) 0.6s infinite alternate;
}
.fa-ambient[data-surface="dev-panel"] .fa-ambient__right {
  top: 10%;
  bottom: auto;
  height: 78%;
  right: -12%;
  width: 62%;
  background: radial-gradient(ellipse 78% 72% at 58% 50%, rgba(91, 100, 125, 0.045), transparent 66%);
  animation: faPanelVeilSide 40s cubic-bezier(0.45, 0.05, 0.55, 0.95) 0.2s infinite alternate-reverse;
}
.fa-ambient[data-surface="dev-panel"] .fa-ambient__center {
  left: 8%;
  right: 8%;
  top: 16%;
  bottom: 16%;
  background: radial-gradient(ellipse 62% 52% at 50% 50%, rgba(91, 100, 125, 0.035), transparent 72%);
  animation: faPanelVeilCenter 34s cubic-bezier(0.45, 0.05, 0.55, 0.95) 0.8s infinite alternate;
}
.fa-ambient[data-surface="dev-panel"] .fa-ambient__drift {
  inset: -18%;
  opacity: 0.55;
  background:
    radial-gradient(ellipse 48% 40% at 32% 40%, rgba(91, 100, 125, 0.03), transparent 68%),
    radial-gradient(ellipse 48% 40% at 72% 62%, rgba(91, 100, 125, 0.028), transparent 68%);
  animation: faPanelVeilDrift 44s ease-in-out infinite alternate;
}
@media (max-width: 768px) {
  .fa-ambient[data-surface="dev-panel"] {
    left: 0;
  }
}

/* ═══════════ CLIENT PANEL — cooler, quieter; right side especially soft ═══════════ */
.fa-ambient[data-surface="client-panel"] {
  background:
    radial-gradient(ellipse 68% 50% at 42% 28%, rgba(91, 100, 125, 0.045), transparent 62%),
    radial-gradient(ellipse 72% 52% at 36% 72%, rgba(91, 100, 125, 0.055), transparent 60%),
    radial-gradient(ellipse 42% 40% at 78% 48%, rgba(91, 100, 125, 0.022), transparent 66%);
}
.fa-ambient[data-surface="client-panel"] .fa-ambient__top {
  background: radial-gradient(ellipse 76% 66% at 48% 40%, rgba(91, 100, 125, 0.04), transparent 64%);
}
.fa-ambient[data-surface="client-panel"] .fa-ambient__bottom {
  background: radial-gradient(ellipse 80% 68% at 44% 55%, rgba(91, 100, 125, 0.045), transparent 62%);
}
.fa-ambient[data-surface="client-panel"] .fa-ambient__left {
  background: radial-gradient(ellipse 72% 70% at 38% 50%, rgba(91, 100, 125, 0.04), transparent 64%);
}
.fa-ambient[data-surface="client-panel"] .fa-ambient__right {
  background: radial-gradient(ellipse 62% 64% at 55% 52%, rgba(91, 100, 125, 0.02), transparent 68%);
}
.fa-ambient[data-surface="client-panel"] .fa-ambient__center {
  background: radial-gradient(ellipse 46% 40% at 46% 50%, rgba(91, 100, 125, 0.025), transparent 72%);
}
.fa-ambient[data-surface="client-panel"] .fa-ambient__drift {
  background: radial-gradient(ellipse 36% 32% at 48% 44%, rgba(91, 100, 125, 0.025), transparent 68%);
  animation-name: faVeilDriftB;
}

/* Light panels — soft multiply so veils sit in the gray canvas */
html[data-theme-surface="dev"]:not([data-theme="dark"]):not([data-theme="classic-dark"])
  .fa-ambient[data-surface="dev-panel"],
html[data-theme-surface="client"]:not([data-theme="dark"]):not([data-theme="classic-dark"])
  .fa-ambient[data-surface="client-panel"] {
  mix-blend-mode: multiply;
}

/* Light Dev — whisper of Festag primary, full-width, very quiet */
html[data-theme-surface="dev"]:not([data-theme="dark"]):not([data-theme="classic-dark"])
  .fa-ambient[data-surface="dev-panel"] {
  background:
    radial-gradient(ellipse 96% 58% at 50% 28%, rgba(91, 100, 125, 0.045), transparent 68%),
    radial-gradient(ellipse 92% 54% at 50% 78%, rgba(91, 100, 125, 0.038), transparent 66%),
    radial-gradient(ellipse 52% 46% at 18% 52%, rgba(91, 100, 125, 0.028), transparent 70%),
    radial-gradient(ellipse 52% 46% at 82% 48%, rgba(91, 100, 125, 0.028), transparent 70%);
}
html[data-theme-surface="dev"]:not([data-theme="dark"]):not([data-theme="classic-dark"])
  .fa-ambient[data-surface="dev-panel"] .fa-ambient__top {
  background: radial-gradient(ellipse 90% 70% at 50% 42%, rgba(91, 100, 125, 0.04), transparent 64%);
}
html[data-theme-surface="dev"]:not([data-theme="dark"]):not([data-theme="classic-dark"])
  .fa-ambient[data-surface="dev-panel"] .fa-ambient__bottom {
  background: radial-gradient(ellipse 92% 72% at 50% 48%, rgba(91, 100, 125, 0.042), transparent 62%);
}
html[data-theme-surface="dev"]:not([data-theme="dark"]):not([data-theme="classic-dark"])
  .fa-ambient[data-surface="dev-panel"] .fa-ambient__left {
  background: radial-gradient(ellipse 78% 72% at 42% 50%, rgba(91, 100, 125, 0.03), transparent 66%);
}
html[data-theme-surface="dev"]:not([data-theme="dark"]):not([data-theme="classic-dark"])
  .fa-ambient[data-surface="dev-panel"] .fa-ambient__right {
  background: radial-gradient(ellipse 78% 72% at 58% 50%, rgba(91, 100, 125, 0.03), transparent 66%);
}
html[data-theme-surface="dev"]:not([data-theme="dark"]):not([data-theme="classic-dark"])
  .fa-ambient[data-surface="dev-panel"] .fa-ambient__center {
  background: radial-gradient(ellipse 64% 54% at 50% 50%, rgba(91, 100, 125, 0.025), transparent 72%);
}
html[data-theme-surface="dev"]:not([data-theme="dark"]):not([data-theme="classic-dark"])
  .fa-ambient[data-surface="dev-panel"] .fa-ambient__drift {
  background:
    radial-gradient(ellipse 48% 40% at 32% 40%, rgba(91, 100, 125, 0.022), transparent 68%),
    radial-gradient(ellipse 48% 40% at 72% 62%, rgba(91, 100, 125, 0.02), transparent 68%);
}

/* Dark — slightly more presence, still quiet; no brightness boost */
:is(.al-root, .dl-root, .ae-root)[data-theme="dark"] .fa-ambient[data-surface="login"],
:is(.al-root, .dl-root, .ae-root)[data-theme="dark"] .fa-ambient[data-surface="register"],
:is(.al-root, .dl-root, .ae-root)[data-theme="dark"] .fa-ambient[data-surface="onboarding"],
:is(.al-root, .dl-root, .ae-root)[data-theme="dark"] .fa-ambient[data-surface="enter"] {
  /* sand stays sand — just a touch more readable on OLED */
}
:is(.al-root, .dl-root, .ae-root)[data-theme="dark"] .fa-ambient[data-surface="login"] {
  background:
    radial-gradient(ellipse 72% 58% at 28% 24%, rgba(188, 128, 72, 0.16), transparent 58%),
    radial-gradient(ellipse 78% 60% at 55% 70%, rgba(160, 112, 68, 0.18), transparent 56%),
    radial-gradient(ellipse 50% 42% at 78% 48%, rgba(140, 96, 58, 0.10), transparent 58%);
}
:is(.al-root, .dl-root, .ae-root)[data-theme="dark"] .fa-ambient[data-surface="register"] {
  background:
    radial-gradient(ellipse 70% 55% at 68% 26%, rgba(180, 125, 80, 0.15), transparent 58%),
    radial-gradient(ellipse 75% 58% at 42% 68%, rgba(160, 110, 70, 0.16), transparent 56%),
    radial-gradient(ellipse 50% 46% at 78% 50%, rgba(170, 118, 75, 0.12), transparent 60%);
}
:is(.al-root, .dl-root, .ae-root)[data-theme="dark"] .fa-ambient__grain,
html[data-theme="dark"] .fa-ambient__grain,
html[data-theme="classic-dark"] .fa-ambient__grain {
  opacity: 0.028;
  mix-blend-mode: soft-light;
}

/* Dark Dev panel — balanced full-width wash on deeper primary canvas */
html[data-theme-surface="dev"][data-theme="dark"] .fa-ambient[data-surface="dev-panel"],
html[data-theme-surface="dev"][data-theme="classic-dark"] .fa-ambient[data-surface="dev-panel"] {
  mix-blend-mode: normal;
  filter: none;
  background:
    radial-gradient(ellipse 96% 60% at 50% 26%, rgba(91, 100, 125, 0.11), transparent 66%),
    radial-gradient(ellipse 94% 58% at 50% 78%, rgba(91, 100, 125, 0.095), transparent 64%),
    radial-gradient(ellipse 58% 50% at 16% 50%, rgba(91, 100, 125, 0.065), transparent 68%),
    radial-gradient(ellipse 58% 50% at 84% 48%, rgba(91, 100, 125, 0.065), transparent 68%);
}
html[data-theme-surface="dev"][data-theme="dark"] .fa-ambient[data-surface="dev-panel"] .fa-ambient__top,
html[data-theme-surface="dev"][data-theme="classic-dark"] .fa-ambient[data-surface="dev-panel"] .fa-ambient__top {
  background: radial-gradient(ellipse 90% 72% at 50% 42%, rgba(91, 100, 125, 0.085), transparent 64%);
}
html[data-theme-surface="dev"][data-theme="dark"] .fa-ambient[data-surface="dev-panel"] .fa-ambient__bottom,
html[data-theme-surface="dev"][data-theme="classic-dark"] .fa-ambient[data-surface="dev-panel"] .fa-ambient__bottom {
  background: radial-gradient(ellipse 92% 74% at 50% 48%, rgba(91, 100, 125, 0.09), transparent 62%);
}
html[data-theme-surface="dev"][data-theme="dark"] .fa-ambient[data-surface="dev-panel"] .fa-ambient__left,
html[data-theme-surface="dev"][data-theme="classic-dark"] .fa-ambient[data-surface="dev-panel"] .fa-ambient__left {
  background: radial-gradient(ellipse 80% 74% at 42% 50%, rgba(91, 100, 125, 0.065), transparent 66%);
}
html[data-theme-surface="dev"][data-theme="dark"] .fa-ambient[data-surface="dev-panel"] .fa-ambient__right,
html[data-theme-surface="dev"][data-theme="classic-dark"] .fa-ambient[data-surface="dev-panel"] .fa-ambient__right {
  background: radial-gradient(ellipse 80% 74% at 58% 50%, rgba(91, 100, 125, 0.065), transparent 66%);
}
html[data-theme-surface="dev"][data-theme="dark"] .fa-ambient[data-surface="dev-panel"] .fa-ambient__center,
html[data-theme-surface="dev"][data-theme="classic-dark"] .fa-ambient[data-surface="dev-panel"] .fa-ambient__center {
  background: radial-gradient(ellipse 64% 54% at 50% 50%, rgba(91, 100, 125, 0.055), transparent 72%);
}
html[data-theme-surface="dev"][data-theme="dark"] .fa-ambient[data-surface="dev-panel"] .fa-ambient__drift,
html[data-theme-surface="dev"][data-theme="classic-dark"] .fa-ambient[data-surface="dev-panel"] .fa-ambient__drift {
  background:
    radial-gradient(ellipse 50% 42% at 30% 38%, rgba(91, 100, 125, 0.05), transparent 68%),
    radial-gradient(ellipse 50% 42% at 74% 64%, rgba(91, 100, 125, 0.045), transparent 68%);
}

/* Dark Dev login / onboarding — keep a touch more presence on auth chrome */
:is(.al-root, .dl-root)[data-theme="dark"] .fa-ambient[data-surface="dev-login"],
:is(.al-root, .dl-root)[data-theme="dark"] .fa-ambient[data-surface="dev-onboarding"] {
  mix-blend-mode: normal;
  filter: none;
  background:
    radial-gradient(ellipse 72% 60% at 30% 26%, rgba(91, 100, 125, 0.12), transparent 56%),
    radial-gradient(ellipse 78% 62% at 55% 68%, rgba(91, 100, 125, 0.13), transparent 54%),
    radial-gradient(ellipse 50% 48% at 74% 48%, rgba(91, 100, 125, 0.07), transparent 62%);
}

html[data-theme="dark"] .fa-ambient[data-surface="client-panel"],
html[data-theme="classic-dark"] .fa-ambient[data-surface="client-panel"] {
  background:
    radial-gradient(ellipse 68% 52% at 40% 30%, rgba(91, 100, 125, 0.09), transparent 58%),
    radial-gradient(ellipse 72% 55% at 38% 70%, rgba(91, 100, 125, 0.10), transparent 56%),
    radial-gradient(ellipse 40% 38% at 78% 48%, rgba(91, 100, 125, 0.04), transparent 66%);
}

@media (prefers-reduced-motion: reduce) {
  .fa-ambient,
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
