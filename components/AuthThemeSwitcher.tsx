'use client'

import type { AuthThemeMode } from '@/lib/auth-theme'

type Props = {
  mode: AuthThemeMode
  onChange: (mode: AuthThemeMode) => void
  className?: string
  /** log = login/register, dl = dev login, compact = onboarding/invite */
  variant?: 'log' | 'dl' | 'compact'
  /** Hide Lesemodus (e.g. login screen). */
  includeRead?: boolean
}

const OPTIONS: Array<{ id: AuthThemeMode; label: string; aria: string }> = [
  { id: 'light', label: 'Aa', aria: 'Heller Modus' },
  { id: 'dark', label: 'Aa', aria: 'Dunkler Modus' },
  { id: 'read', label: 'R', aria: 'Lesemodus' },
]

export default function AuthThemeSwitcher({
  mode,
  onChange,
  className = '',
  variant = 'log',
  includeRead = true,
}: Props) {
  const pillClass = variant === 'dl' ? 'dl-theme-pill' : variant === 'compact' ? 'auth-theme-pill' : 'log-theme-pill'
  const options = includeRead ? OPTIONS : OPTIONS.filter(opt => opt.id !== 'read')

  return (
    <>
      <style>{`
        .auth-theme-switcher {
          display:inline-flex;
          align-items:center;
          gap:2px;
          padding:3px;
          border-radius:999px;
          background:rgba(15, 23, 42, 0.05);
        }
        .log-theme-pill,
        .dl-theme-pill,
        .auth-theme-pill {
          min-width:34px;
          height:26px;
          display:flex;
          align-items:center;
          justify-content:center;
          padding:0 10px;
          border-radius:999px;
          border:0;
          outline:0;
          background:transparent;
          font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif);
          font-size:12px;
          font-weight:500;
          color:#86868b;
          letter-spacing:0.02em;
          cursor:pointer;
          box-shadow:none;
          transition:background .16s ease, color .16s ease;
          -webkit-tap-highlight-color:transparent;
        }
        .log-theme-pill:hover,
        .dl-theme-pill:hover,
        .auth-theme-pill:hover {
          color:#5b647d;
          background:rgba(91, 100, 125, 0.08);
          transform:none;
        }
        .log-theme-pill.active,
        .dl-theme-pill.active,
        .auth-theme-pill.active {
          background:rgba(91, 100, 125, 0.14);
          color:#1e1e20;
          box-shadow:none;
        }
        .auth-theme-pill[data-mode="read"] { font-size:11px; letter-spacing:0.06em; }
        [data-theme="dark"] .auth-theme-switcher {
          background:rgba(255, 255, 255, 0.08);
        }
        [data-theme="dark"] .log-theme-pill,
        [data-theme="dark"] .dl-theme-pill,
        [data-theme="dark"] .auth-theme-pill {
          background:transparent;
          color:rgba(245,245,247,0.45);
          box-shadow:none;
        }
        [data-theme="dark"] .log-theme-pill:hover,
        [data-theme="dark"] .dl-theme-pill:hover,
        [data-theme="dark"] .auth-theme-pill:hover {
          color:rgba(245,245,247,0.78);
          background:rgba(255, 255, 255, 0.06);
        }
        [data-theme="dark"] .log-theme-pill.active,
        [data-theme="dark"] .dl-theme-pill.active,
        [data-theme="dark"] .auth-theme-pill.active {
          background:rgba(255, 255, 255, 0.12);
          color:#f5f5f7;
          box-shadow:none;
        }
        [data-theme="read"] .auth-theme-switcher {
          background:rgba(80, 70, 50, 0.08);
        }
        [data-theme="read"] .log-theme-pill,
        [data-theme="read"] .dl-theme-pill,
        [data-theme="read"] .auth-theme-pill {
          background:transparent;
          color:#8a7a60;
          box-shadow:none;
        }
        [data-theme="read"] .log-theme-pill.active,
        [data-theme="read"] .dl-theme-pill.active,
        [data-theme="read"] .auth-theme-pill.active {
          background:rgba(80, 70, 50, 0.14);
          color:#4A4030;
        }
      `}</style>
      <div className={`auth-theme-switcher ${className}`.trim()} role="group" aria-label="Erscheinungsbild">
        {options.map(opt => (
          <button
            key={opt.id}
            type="button"
            className={`${pillClass}${mode === opt.id ? ' active' : ''}`}
            data-mode={opt.id}
            aria-label={opt.aria}
            aria-pressed={mode === opt.id}
            onClick={() => onChange(opt.id)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </>
  )
}
