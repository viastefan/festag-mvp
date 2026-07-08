'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  ApplePodcastsLogo,
  Broadcast,
  Check,
  CopySimple,
  LinkSimple,
  Pause,
  SpotifyLogo,
  Waveform,
} from '@phosphor-icons/react'

type PodcastFeed = {
  id: string
  active: boolean
  title: string
  cadence: 'daily' | 'weekly' | 'biweekly' | 'off'
  projectId: string | null
  feedUrl: string
  lastEpisodeAt: string | null
  linkedAt: string
  episodeCount: number
}

type Props = {
  projectId: string | null
  projectTitle: string | null
}

export default function BriefingPodcastFeedCard({ projectId, projectTitle }: Props) {
  const [feed, setFeed] = useState<PodcastFeed | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const query = projectId ? `?projectId=${encodeURIComponent(projectId)}` : ''

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/briefing/podcast-feed${query}`, { credentials: 'include' })
      const json = await res.json()
      if (!json?.ok) {
        setError(json?.error === 'schema_missing'
          ? 'Podcast-Feed ist noch nicht eingerichtet.'
          : 'Feed konnte nicht geladen werden.')
        setFeed(null)
      } else {
        setFeed(json.feed ?? null)
      }
    } catch {
      setError('Feed konnte nicht geladen werden.')
    } finally {
      setLoading(false)
    }
  }, [query])

  useEffect(() => { refresh() }, [refresh])

  async function patch(action: 'enable' | 'disable' | 'regenerate_token' | 'publish_now') {
    setBusy(true)
    setMessage(null)
    setError(null)
    try {
      const res = await fetch('/api/briefing/podcast-feed', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, projectId, projectTitle }),
      })
      const json = await res.json()
      if (!json?.ok) {
        setError(
          json?.error === 'tts_unavailable'
            ? 'Audio konnte nicht erzeugt werden. Bitte später erneut versuchen.'
            : json?.error === 'schema_missing'
              ? 'Podcast-Feed ist noch nicht eingerichtet.'
              : 'Aktion fehlgeschlagen.',
        )
        return
      }
      setFeed(json.feed ?? null)
      if (action === 'enable') {
        setMessage(json.firstEpisode?.id
          ? 'Privater Feed aktiv. Erste Episode ist bereit.'
          : 'Feed aktiv. Erste Episode folgt beim nächsten Lauf.')
      } else if (action === 'publish_now') {
        setMessage('Neue Episode veröffentlicht.')
      } else if (action === 'regenerate_token') {
        setMessage('Neuer privater Link erzeugt. In der Podcast-App erneut abonnieren.')
      } else if (action === 'disable') {
        setMessage('Podcast-Feed pausiert.')
      }
    } catch {
      setError('Aktion fehlgeschlagen.')
    } finally {
      setBusy(false)
    }
  }

  async function copyFeedUrl() {
    if (!feed?.feedUrl) return
    try {
      await navigator.clipboard.writeText(feed.feedUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      setError('Link konnte nicht kopiert werden.')
    }
  }

  const active = Boolean(feed?.active)
  const scopeLabel = projectTitle || 'alle Projekte'
  const lastLabel = feed?.lastEpisodeAt
    ? new Date(feed.lastEpisodeAt).toLocaleString('de-DE', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
    : null
  const title = active
    ? feed?.title || `Festag Briefing, ${scopeLabel}`
    : 'Tagro in deiner Podcast-App'
  const subtitle = active
    ? `Privat für dich. Scope: ${scopeLabel}.`
    : 'Jeden Morgen die Lage als kurze Episode — privat, nur für dich.'

  return (
    <section className={`bpf${active ? ' is-live' : ''}`} aria-label="Podcast-Feed">
      <style>{`
        .bpf {
          --bpf-ink: #1d1d1f;
          --bpf-muted: #6e6e73;
          --bpf-line: rgba(0,0,0,0.07);
          --bpf-surface: #f5f5f7;
          --bpf-card: #ffffff;
          --bpf-hover: #ebebed;
          position: relative;
          overflow: hidden;
          display: grid;
          grid-template-columns: 148px minmax(0, 1fr);
          gap: 22px;
          padding: 18px;
          margin: 0 0 24px;
          border-radius: 20px;
          background: var(--bpf-surface);
          border: 1px solid var(--bpf-line);
        }
        html[data-theme="dark"] .bpf,
        html[data-theme="classic-dark"] .bpf {
          --bpf-ink: #f5f5f7;
          --bpf-muted: rgba(245,245,247,0.58);
          --bpf-line: rgba(255,255,255,0.08);
          --bpf-surface: #0c0c0e;
          --bpf-card: #121214;
          --bpf-hover: #1c1c1e;
        }
        .bpf-art {
          position: relative;
          width: 148px;
          height: 148px;
          border-radius: 18px;
          overflow: hidden;
          flex-shrink: 0;
          background:
            radial-gradient(120% 90% at 12% 8%, rgba(255,255,255,0.22), transparent 55%),
            linear-gradient(155deg, #2a2a2c 0%, #111113 48%, #3b3b31 100%);
          box-shadow:
            0 18px 40px -28px rgba(0,0,0,0.55),
            inset 0 1px 0 rgba(255,255,255,0.12);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .bpf.is-live .bpf-art {
          background:
            radial-gradient(120% 90% at 12% 8%, rgba(255,255,255,0.18), transparent 55%),
            linear-gradient(155deg, #1a1a1c 0%, #0a0a0b 42%, #1f3a2e 100%);
        }
        .bpf-art-wave {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          gap: 4px;
          padding: 0 22px 28px;
          opacity: 0.42;
        }
        .bpf-art-wave span {
          width: 4px;
          border-radius: 999px;
          background: rgba(255,255,255,0.85);
          animation: bpfBar 1.35s ease-in-out infinite;
        }
        .bpf-art-wave span:nth-child(1) { height: 18%; animation-delay: 0s; }
        .bpf-art-wave span:nth-child(2) { height: 42%; animation-delay: .12s; }
        .bpf-art-wave span:nth-child(3) { height: 68%; animation-delay: .24s; }
        .bpf-art-wave span:nth-child(4) { height: 34%; animation-delay: .08s; }
        .bpf-art-wave span:nth-child(5) { height: 54%; animation-delay: .2s; }
        .bpf-art-wave span:nth-child(6) { height: 28%; animation-delay: .3s; }
        .bpf-art-wave span:nth-child(7) { height: 48%; animation-delay: .16s; }
        .bpf.is-live .bpf-art-wave { opacity: 0.72; }
        @keyframes bpfBar {
          0%, 100% { transform: scaleY(0.55); }
          50% { transform: scaleY(1); }
        }
        .bpf-art-icon {
          position: relative;
          z-index: 1;
          width: 44px;
          height: 44px;
          border-radius: 14px;
          display: grid;
          place-items: center;
          background: rgba(255,255,255,0.12);
          backdrop-filter: blur(10px);
          color: #fff;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.18);
        }
        .bpf-body {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 14px;
          justify-content: center;
        }
        .bpf-top {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .bpf-status {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          width: fit-content;
          padding: 4px 9px;
          border-radius: 999px;
          background: rgba(29,29,31,0.06);
          color: var(--bpf-muted);
          font-size: 11.5px;
          font-weight: 600;
          letter-spacing: -0.01em;
        }
        html[data-theme="dark"] .bpf-status,
        html[data-theme="classic-dark"] .bpf-status {
          background: rgba(255,255,255,0.08);
        }
        .bpf-status.is-on {
          background: rgba(22, 163, 74, 0.12);
          color: #15803d;
        }
        html[data-theme="dark"] .bpf-status.is-on,
        html[data-theme="classic-dark"] .bpf-status.is-on {
          background: rgba(34, 197, 94, 0.16);
          color: #86efac;
        }
        .bpf-status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
        }
        .bpf-title {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
          letter-spacing: -0.03em;
          line-height: 1.18;
          color: var(--bpf-ink);
        }
        .bpf-sub {
          margin: 0;
          font-size: 13.5px;
          line-height: 1.5;
          color: var(--bpf-muted);
          max-width: 46ch;
        }
        .bpf-stats {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .bpf-stat {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 10px;
          border-radius: 10px;
          background: var(--bpf-card);
          border: 1px solid var(--bpf-line);
          font-size: 12px;
          color: var(--bpf-muted);
        }
        .bpf-stat strong {
          color: var(--bpf-ink);
          font-weight: 600;
        }
        .bpf-apps {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .bpf-app {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 12px;
          background: var(--bpf-card);
          border: 1px solid var(--bpf-line);
          color: var(--bpf-ink);
          font-size: 12.5px;
          font-weight: 550;
          letter-spacing: -0.01em;
        }
        .bpf-app svg { flex-shrink: 0; opacity: 0.9; }
        .bpf-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
        }
        .bpf-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          height: 38px;
          padding: 0 14px;
          border-radius: 999px;
          border: 1px solid var(--bpf-line);
          background: var(--bpf-card);
          color: var(--bpf-ink);
          font: inherit;
          font-size: 13px;
          font-weight: 560;
          letter-spacing: -0.01em;
          cursor: pointer;
          transition: background .14s, border-color .14s, transform .08s, opacity .14s;
        }
        .bpf-btn:hover:not(:disabled) { background: var(--bpf-hover); }
        .bpf-btn:active:not(:disabled) { transform: scale(0.985); }
        .bpf-btn:disabled { opacity: 0.5; cursor: default; }
        .bpf-btn.primary {
          background: var(--bpf-ink);
          border-color: var(--bpf-ink);
          color: #fff;
        }
        html[data-theme="dark"] .bpf-btn.primary,
        html[data-theme="classic-dark"] .bpf-btn.primary {
          background: #f5f5f7;
          border-color: #f5f5f7;
          color: #0c0c0e;
        }
        .bpf-btn.primary:hover:not(:disabled) {
          background: #000;
          border-color: #000;
          color: #fff;
        }
        html[data-theme="dark"] .bpf-btn.primary:hover:not(:disabled),
        html[data-theme="classic-dark"] .bpf-btn.primary:hover:not(:disabled) {
          background: #fff;
          border-color: #fff;
          color: #0c0c0e;
        }
        .bpf-btn.ghost {
          background: transparent;
        }
        .bpf-link-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 8px;
          align-items: stretch;
        }
        .bpf-url {
          min-width: 0;
          height: 40px;
          padding: 0 12px;
          border-radius: 12px;
          border: 1px solid var(--bpf-line);
          background: var(--bpf-card);
          color: var(--bpf-muted);
          font: inherit;
          font-size: 12px;
          letter-spacing: -0.01em;
          outline: none;
        }
        .bpf-url:focus {
          border-color: rgba(0,0,0,0.22);
          color: var(--bpf-ink);
        }
        html[data-theme="dark"] .bpf-url:focus,
        html[data-theme="classic-dark"] .bpf-url:focus {
          border-color: rgba(255,255,255,0.22);
        }
        .bpf-guide {
          margin: 0;
          padding: 0;
          list-style: none;
          display: grid;
          gap: 6px;
        }
        .bpf-guide li {
          display: grid;
          grid-template-columns: 18px minmax(0, 1fr);
          gap: 8px;
          align-items: start;
          font-size: 12.5px;
          line-height: 1.45;
          color: var(--bpf-muted);
        }
        .bpf-guide b {
          display: inline-grid;
          place-items: center;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: rgba(29,29,31,0.06);
          color: var(--bpf-ink);
          font-size: 10.5px;
          font-weight: 650;
        }
        html[data-theme="dark"] .bpf-guide b,
        html[data-theme="classic-dark"] .bpf-guide b {
          background: rgba(255,255,255,0.08);
        }
        .bpf-msg, .bpf-err {
          margin: 0;
          font-size: 12.5px;
          line-height: 1.4;
        }
        .bpf-msg { color: #15803d; }
        .bpf-err { color: #b45309; }
        .bpf-skel {
          height: 14px;
          border-radius: 8px;
          background: linear-gradient(90deg, rgba(0,0,0,0.04), rgba(0,0,0,0.08), rgba(0,0,0,0.04));
          background-size: 200% 100%;
          animation: bpfShimmer 1.2s linear infinite;
        }
        html[data-theme="dark"] .bpf-skel,
        html[data-theme="classic-dark"] .bpf-skel {
          background: linear-gradient(90deg, rgba(255,255,255,0.04), rgba(255,255,255,0.1), rgba(255,255,255,0.04));
          background-size: 200% 100%;
        }
        @keyframes bpfShimmer {
          0% { background-position: 100% 0; }
          100% { background-position: -100% 0; }
        }
        @media (max-width: 760px) {
          .bpf {
            grid-template-columns: 1fr;
            padding: 16px;
            gap: 16px;
          }
          .bpf-art {
            width: 100%;
            height: 120px;
            border-radius: 16px;
          }
          .bpf-title { font-size: 18px; }
        }
      `}</style>

      <div className="bpf-art" aria-hidden>
        <div className="bpf-art-wave">
          <span /><span /><span /><span /><span /><span /><span />
        </div>
        <div className="bpf-art-icon">
          {active ? <Waveform size={22} weight="fill" /> : <Broadcast size={22} weight="fill" />}
        </div>
      </div>

      <div className="bpf-body">
        {loading ? (
          <div className="bpf-top" style={{ gap: 10 }}>
            <div className="bpf-skel" style={{ width: 88, height: 22 }} />
            <div className="bpf-skel" style={{ width: '72%', height: 22 }} />
            <div className="bpf-skel" style={{ width: '88%', height: 14 }} />
          </div>
        ) : (
          <>
            <div className="bpf-top">
              <span className={`bpf-status${active ? ' is-on' : ''}`}>
                <span className="bpf-status-dot" aria-hidden />
                {active ? 'Privat aktiv' : 'Noch nicht verbunden'}
              </span>
              <h3 className="bpf-title">{title}</h3>
              <p className="bpf-sub">{subtitle}</p>
            </div>

            {active ? (
              <>
                <div className="bpf-stats">
                  <span className="bpf-stat"><strong>{feed?.episodeCount ?? 0}</strong> Episoden</span>
                  <span className="bpf-stat">
                    <strong>{lastLabel ? lastLabel : '—'}</strong>
                    {lastLabel ? ' zuletzt' : ' keine Episode'}
                  </span>
                  <span className="bpf-stat"><strong>{scopeLabel}</strong></span>
                </div>

                <div className="bpf-link-row">
                  <input
                    className="bpf-url"
                    readOnly
                    value={feed?.feedUrl ?? ''}
                    aria-label="Privater Podcast-Feed-Link"
                    onFocus={(e) => e.currentTarget.select()}
                  />
                  <button type="button" className="bpf-btn primary" disabled={busy} onClick={copyFeedUrl}>
                    {copied ? <Check size={15} weight="bold" aria-hidden /> : <CopySimple size={15} weight="bold" aria-hidden />}
                    {copied ? 'Kopiert' : 'Link kopieren'}
                  </button>
                </div>

                <div className="bpf-apps" aria-label="Podcast-Apps">
                  <span className="bpf-app">
                    <SpotifyLogo size={15} weight="fill" />
                    Spotify
                  </span>
                  <span className="bpf-app">
                    <ApplePodcastsLogo size={15} weight="fill" />
                    Apple Podcasts
                  </span>
                </div>

                <ol className="bpf-guide">
                  <li><b>1</b><span>Link kopieren und in Spotify oder Apple Podcasts als privaten Feed hinzufügen.</span></li>
                  <li><b>2</b><span>Abonnieren — neue Episoden erscheinen automatisch in deiner Queue.</span></li>
                </ol>

                <div className="bpf-actions">
                  <button type="button" className="bpf-btn" disabled={busy} onClick={() => patch('publish_now')}>
                    <Waveform size={15} weight="bold" aria-hidden />
                    Episode jetzt
                  </button>
                  <button type="button" className="bpf-btn ghost" disabled={busy} onClick={() => patch('regenerate_token')}>
                    <LinkSimple size={15} weight="bold" aria-hidden />
                    Link neu
                  </button>
                  <button type="button" className="bpf-btn ghost" disabled={busy} onClick={() => patch('disable')}>
                    <Pause size={15} weight="bold" aria-hidden />
                    Pausieren
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="bpf-apps" aria-label="Podcast-Apps">
                  <span className="bpf-app">
                    <SpotifyLogo size={15} weight="fill" />
                    Spotify
                  </span>
                  <span className="bpf-app">
                    <ApplePodcastsLogo size={15} weight="fill" />
                    Apple Podcasts
                  </span>
                </div>
                <div className="bpf-actions">
                  <button
                    type="button"
                    className="bpf-btn primary"
                    disabled={busy}
                    onClick={() => patch('enable')}
                  >
                    <Broadcast size={15} weight="fill" aria-hidden />
                    Privaten Feed aktivieren
                  </button>
                </div>
                <p className="bpf-sub" style={{ marginTop: -4 }}>
                  Ein geheimer Link — nicht suchbar, nicht geteilt. Nur dein Account, nur dein Briefing.
                </p>
              </>
            )}

            {message && <p className="bpf-msg">{message}</p>}
            {error && <p className="bpf-err">{error}</p>}
          </>
        )}
      </div>
    </section>
  )
}
