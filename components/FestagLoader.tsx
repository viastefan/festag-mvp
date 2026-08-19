'use client'

/**
 * Festag transitional loader — calm diamond dots only.
 * No silver cube assemble / CGI mark theater.
 */

import TagroDiamondDots from '@/components/dashboard/TagroDiamondDots'

type Props = { fullscreen?: boolean; label?: string }

export default function FestagLoader({ fullscreen = false, label }: Props) {
  return (
    <div className={`fl-wrap${fullscreen ? ' fl-full' : ''}`} role="status" aria-live="polite">
      <style suppressHydrationWarning dangerouslySetInnerHTML={{ __html: CSS }} />
      <TagroDiamondDots active size={28} />
      {label ? <span className="fl-label">{label}</span> : null}
    </div>
  )
}

const CSS = `
.fl-wrap {
  width: 100%;
  height: 100%;
  min-height: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  background: #F5F5F7;
  font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
}
.fl-full {
  position: fixed;
  inset: 0;
  z-index: 9999;
  min-height: 100dvh;
}
.fl-wrap .tdd-dot {
  --dms-dot: #5B647D;
  background: var(--dms-dot);
  width: 5px;
  height: 5px;
}
.fl-label {
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0.02em;
  color: rgba(78, 85, 103, 0.62);
}
html[data-theme="dark"] .fl-wrap,
html[data-theme="classic-dark"] .fl-wrap {
  background: #070708;
}
html[data-theme="dark"] .fl-wrap .tdd-dot,
html[data-theme="classic-dark"] .fl-wrap .tdd-dot {
  --dms-dot: rgba(230, 230, 234, 0.72);
}
html[data-theme="dark"] .fl-label,
html[data-theme="classic-dark"] .fl-label {
  color: rgba(230, 230, 234, 0.45);
}
@media (prefers-reduced-motion: reduce) {
  .fl-wrap .tdd-dot { animation: none !important; opacity: 0.7; }
}
`
