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
        .auth-theme-switcher { display:flex; gap:8px; align-items:center; }
        .log-theme-pill,
        .dl-theme-pill,
        .auth-theme-pill {
          min-width:40px; height:32px;
          display:flex; align-items:center; justify-content:center;
          padding:0 12px; border-radius:14px; border:0; outline:0;
          background:#fff;
          font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif);
          font-size:12px; font-weight:500; color:#5b647d;
          letter-spacing:0.24px; cursor:pointer;
          box-shadow:0 10px 24px rgba(15,23,42,0.10), 0 2px 5px rgba(15,23,42,0.06), 0 1px 0 rgba(255,255,255,0.9) inset;
          transition:background .15s, color .15s, box-shadow .15s, transform .15s;
          -webkit-tap-highlight-color:transparent;
        }
        .log-theme-pill:hover,
        .dl-theme-pill:hover,
        .auth-theme-pill:hover { background:#FAFBFC; transform:translateY(-1px); }
        .log-theme-pill.active,
        .dl-theme-pill.active,
        .auth-theme-pill.active {
          background:#EEF2F6; color:#202532;
          box-shadow:0 8px 18px rgba(15,23,42,0.08), 0 1px 3px rgba(15,23,42,0.06), 0 1px 0 rgba(255,255,255,0.78) inset;
        }
        .auth-theme-pill[data-mode="read"] { font-size:11px; letter-spacing:0.06em; }
        [data-theme="dark"] .log-theme-pill,
        [data-theme="dark"] .dl-theme-pill,
        [data-theme="dark"] .auth-theme-pill {
          background:#141820; color:rgba(243,245,247,0.58);
          box-shadow:0 12px 30px rgba(0,0,0,0.32), 0 1px 0 rgba(255,255,255,0.05) inset;
        }
        [data-theme="dark"] .log-theme-pill:hover,
        [data-theme="dark"] .dl-theme-pill:hover,
        [data-theme="dark"] .auth-theme-pill:hover { background:#18202B; }
        [data-theme="dark"] .log-theme-pill.active,
        [data-theme="dark"] .dl-theme-pill.active,
        [data-theme="dark"] .auth-theme-pill.active {
          background:#202938; color:#F3F5F7;
          box-shadow:0 10px 24px rgba(0,0,0,0.26), 0 1px 0 rgba(255,255,255,0.07) inset;
        }
        [data-theme="read"] .log-theme-pill,
        [data-theme="read"] .dl-theme-pill,
        [data-theme="read"] .auth-theme-pill {
          background:#F0EBE0; color:#6F6248;
          box-shadow:0 8px 20px rgba(80,70,50,0.08), 0 1px 0 rgba(255,255,255,0.7) inset;
        }
        [data-theme="read"] .log-theme-pill.active,
        [data-theme="read"] .dl-theme-pill.active,
        [data-theme="read"] .auth-theme-pill.active {
          background:#E8E0D0; color:#4A4030;
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
