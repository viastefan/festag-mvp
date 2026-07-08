'use client'

import { useCallback, useEffect, useState } from 'react'
import { Broadcast, Check, Copy, LinkSimple } from '@phosphor-icons/react'

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
        setMessage('Neuer privater Link erzeugt. In Spotify/Apple Podcasts erneut abonnieren.')
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

  const lastLabel = feed?.lastEpisodeAt
    ? new Date(feed.lastEpisodeAt).toLocaleString('de-DE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    : 'noch keine Episode'

  const scopeLabel = projectTitle ? projectTitle : 'alle Projekte'

  return (
    <section className="bpf-card" aria-label="Podcast-Feed">
      <style>{`
        .bpf-card {
          display: grid;
          grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
          gap: 22px;
          padding: 18px 22px;
          margin: 0 0 28px;
          border: 1px solid color-mix(in srgb, var(--border) 64%, transparent);
          border-radius: 14px;
          background: #f5f5f7;
        }
        html[data-theme="dark"] .bpf-card,
        html[data-theme="classic-dark"] .bpf-card {
          background: color-mix(in srgb, var(--surface) 50%, transparent);
        }
        .bpf-head { display: flex; flex-direction: column; gap: 6px; }
        .bpf-title {
          margin: 0; font-size: 17px; font-weight: 600; color: var(--text);
          letter-spacing: -.005em; line-height: 1.25;
        }
        .bpf-sub {
          margin: 0; font-size: 12.5px; color: var(--text-muted); line-height: 1.55;
        }
        .bpf-meta {
          margin-top: 8px;
          display: flex; gap: 14px; flex-wrap: wrap;
          font-size: 11.5px; color: var(--text-muted);
        }
        .bpf-meta strong { color: var(--text-secondary); font-weight: 600; }
        .bpf-controls { display: flex; flex-direction: column; gap: 10px; }
        .bpf-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .bpf-btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 6px 12px;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: var(--portal-card, #fff);
          font: inherit; font-size: 12px; font-weight: 580;
          color: var(--text-secondary);
          cursor: pointer;
          transition: background .12s, color .12s, border-color .12s;
        }
        .bpf-btn:hover:not(:disabled) { color: var(--text); border-color: var(--border-strong); background: #ebebed; }
        html[data-theme="dark"] .bpf-btn:hover:not(:disabled),
        html[data-theme="classic-dark"] .bpf-btn:hover:not(:disabled) {
          background: color-mix(in srgb, var(--surface) 80%, transparent);
        }
        .bpf-btn.primary {
          background: #1d1d1f; color: #fff; border-color: #1d1d1f;
        }
        .bpf-btn.primary:hover:not(:disabled) { background: #000; color: #fff; }
        .bpf-btn:disabled { opacity: .55; cursor: default; }
        .bpf-url {
          width: 100%;
          padding: 10px 12px;
          border-radius: 10px;
          border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
          background: var(--portal-card, #fff);
          font: inherit; font-size: 11.5px;
          color: var(--text-secondary);
          word-break: break-all;
        }
        .bpf-steps {
          margin: 0; padding-left: 18px;
          font-size: 12px; line-height: 1.55; color: var(--text-muted);
        }
        .bpf-msg { font-size: 11.5px; color: #15803D; }
        .bpf-err { font-size: 11.5px; color: #B45309; }
        @media (max-width: 760px) {
          .bpf-card { grid-template-columns: 1fr; padding: 16px; }
        }
      `}</style>

      <div className="bpf-head">
        <h3 className="bpf-title">
          {feed?.active
            ? `Dein Briefing für ${scopeLabel} in Spotify oder Apple Podcasts`
            : 'Hör dein Tagro-Briefing im Alltag'}
        </h3>
        <p className="bpf-sub">
          Jeder Account bekommt einen eigenen, privaten Feed. Niemand sonst hört dein Briefing — nur du, in deiner Podcast-App.
        </p>
        <div className="bpf-meta">
          <span><strong>Scope:</strong> {scopeLabel}</span>
          <span><strong>Episoden:</strong> {feed?.episodeCount ?? 0}</span>
          <span><strong>Letzte Episode:</strong> {lastLabel}</span>
        </div>
      </div>

      <div className="bpf-controls">
        {!feed?.active ? (
          <div className="bpf-row">
            <button
              type="button"
              className="bpf-btn primary"
              disabled={busy || loading}
              onClick={() => patch('enable')}
            >
              <Broadcast size={15} weight="fill" aria-hidden />
              Privaten Feed aktivieren
            </button>
          </div>
        ) : (
          <>
            <input
              className="bpf-url"
              readOnly
              value={feed.feedUrl}
              aria-label="Privater Podcast-Feed-Link"
              onFocus={(e) => e.currentTarget.select()}
            />
            <div className="bpf-row">
              <button type="button" className="bpf-btn" disabled={busy} onClick={copyFeedUrl}>
                {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
                {copied ? 'Kopiert' : 'Link kopieren'}
              </button>
              <button type="button" className="bpf-btn" disabled={busy} onClick={() => patch('publish_now')}>
                Episode jetzt erstellen
              </button>
              <button type="button" className="bpf-btn" disabled={busy} onClick={() => patch('regenerate_token')}>
                <LinkSimple size={14} aria-hidden />
                Link neu erzeugen
              </button>
              <button type="button" className="bpf-btn" disabled={busy} onClick={() => patch('disable')}>
                Pausieren
              </button>
            </div>
            <ol className="bpf-steps">
              <li>Link kopieren</li>
              <li>In Spotify: Suche öffnen, „Podcast per URL hinzufügen“ (falls verfügbar) oder Apple Podcasts nutzen</li>
              <li>Feed abonnieren — neue Episoden erscheinen automatisch</li>
            </ol>
          </>
        )}
        {message && <p className="bpf-msg">{message}</p>}
        {error && <p className="bpf-err">{error}</p>}
      </div>
    </section>
  )
}
