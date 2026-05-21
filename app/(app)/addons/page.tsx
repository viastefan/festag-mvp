'use client'

/**
 * /addons — Festag Add-on-Katalog.
 *
 * Bewusst ruhig: ein durchsuchbarer Katalog, kein Marktplatz-Karneval.
 * Keine Icons, keine Preise, keine Zahlung — das kommt später. Hier
 * sieht der Client nur, was es gibt und was geliefert wird.
 *
 * Gleiche Designlinie wie /tasks und /projects: kleiner Titel, ruhige
 * Filter-Pills, Hairline-Karten, 8px-Radien, Aeonik Medium.
 */

import { useMemo, useState } from 'react'
import { CATALOG, CATEGORIES, type AddonCategory } from '@/lib/addons-catalog'

type Filter = AddonCategory | 'Alle' | 'Beliebt'

export default function AddonsPage() {
  const [search, setSearch] = useState('')
  const [active, setActive] = useState<Filter>('Alle')

  const counts = useMemo(() => {
    const c: Record<string, number> = {
      Alle: CATALOG.length,
      Beliebt: CATALOG.filter((a) => a.popular).length,
    }
    CATEGORIES.forEach((cat) => { c[cat.key] = CATALOG.filter((a) => a.category === cat.key).length })
    return c
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return CATALOG.filter((a) => {
      if (active === 'Beliebt' && !a.popular) return false
      if (active !== 'Alle' && active !== 'Beliebt' && a.category !== active) return false
      if (!q) return true
      return (
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q) ||
        a.tags.some((t) => t.toLowerCase().includes(q))
      )
    })
  }, [search, active])

  return (
    <div className="ad-os">
      <style>{`
        .ad-os {
          --ad-soft:#4E5567;
          width:100%; height:100%; min-height:0;
          color:var(--text);
          display:flex; flex-direction:column; overflow:hidden;
          padding:20px 0 0;
          letter-spacing:.012em;
        }
        [data-theme="dark"] .ad-os,
        [data-theme="classic-dark"] .ad-os,
        [data-theme="read"] .ad-os { --ad-soft:var(--text-secondary); }
        .ad-os * { letter-spacing:.012em; }

        .ad-static { flex:0 0 auto; }
        .ad-scroll {
          flex:1 1 auto; min-height:0; overflow-y:auto; overflow-x:hidden;
          padding:0 clamp(16px,3vw,32px) 80px;
        }

        /* top row */
        .ad-top {
          display:flex; align-items:baseline; gap:10px;
          min-height:34px;
          border-bottom:1px solid color-mix(in srgb, var(--border) 60%, transparent);
          padding:0 clamp(16px,3vw,32px) 12px;
        }
        .ad-title { margin:0; font-size:14.5px; font-weight:500; }
        .ad-count { color:var(--ad-soft); font-size:11.5px; }
        .ad-intro {
          margin:12px clamp(16px,3vw,32px) 0;
          color:var(--ad-soft); font-size:12.5px; line-height:1.5; max-width:540px;
        }

        /* toolbar */
        .ad-toolbar {
          display:flex; flex-direction:column; gap:11px;
          padding:14px clamp(16px,3vw,32px) 14px;
        }
        .ad-search {
          width:100%; max-width:380px; height:36px;
          padding:0 13px; border:0; border-radius:8px;
          background:color-mix(in srgb, var(--surface-2) 55%, transparent);
          color:var(--text); font:inherit; font-size:13px; outline:none;
        }
        .ad-search::placeholder { color:var(--ad-soft); }
        .ad-cats { display:flex; gap:6px; flex-wrap:wrap; }
        .ad-cat {
          height:27px; padding:0 11px;
          border:1px solid var(--border); border-radius:8px;
          background:transparent; color:var(--ad-soft);
          font:inherit; font-size:11.5px; font-weight:500;
          cursor:pointer; white-space:nowrap;
          transition:background .12s ease, color .12s ease;
        }
        .ad-cat:hover { color:var(--text); }
        .ad-cat.on { background:color-mix(in srgb, var(--surface-2) 90%, transparent); color:var(--text); }
        .ad-cat .n { margin-left:5px; color:var(--ad-soft); font-size:10.5px; }
        .ad-cat.on .n { color:var(--text); }

        /* grid + cards */
        .ad-grid {
          display:grid;
          grid-template-columns:repeat(auto-fill, minmax(280px, 1fr));
          gap:12px;
          padding-top:6px;
        }
        .ad-card {
          display:flex; flex-direction:column;
          padding:16px 17px;
          border:1px solid var(--border);
          border-radius:8px;
          background:var(--surface);
          transition:border-color .12s ease;
        }
        .ad-card:hover { border-color:var(--border-strong); }
        [data-theme="dark"] .ad-card,
        [data-theme="classic-dark"] .ad-card {
          background:color-mix(in srgb, var(--surface) 92%, #fff 8%);
        }
        .ad-card-head {
          display:flex; align-items:center; justify-content:space-between;
          gap:10px; margin-bottom:9px;
        }
        .ad-card-cat { color:var(--ad-soft); font-size:10.5px; }
        .ad-card-flag {
          color:var(--ad-soft); font-size:10px;
          padding:2px 7px; border-radius:6px;
          background:color-mix(in srgb, var(--surface-2) 70%, transparent);
        }
        .ad-card-name {
          margin:0 0 6px; color:var(--text);
          font-size:14px; font-weight:500; line-height:1.3;
        }
        .ad-card-desc {
          margin:0; color:var(--ad-soft);
          font-size:12.5px; line-height:1.55;
        }
        .ad-card-feats {
          margin:12px 0 0; display:flex; flex-direction:column; gap:5px;
        }
        .ad-card-feat {
          display:flex; align-items:flex-start; gap:8px;
          color:var(--ad-soft); font-size:12px; line-height:1.45;
        }
        .ad-card-feat .d {
          margin-top:6px; width:4px; height:4px; border-radius:999px;
          background:var(--border-strong); flex-shrink:0;
        }
        .ad-card-tags {
          margin-top:13px; display:flex; gap:6px; flex-wrap:wrap;
        }
        .ad-tag {
          color:var(--ad-soft); font-size:10.5px;
          padding:2px 7px; border-radius:6px;
          background:color-mix(in srgb, var(--surface-2) 55%, transparent);
        }

        .ad-empty {
          padding:64px 16px; text-align:center; color:var(--ad-soft);
        }
        .ad-empty strong { display:block; color:var(--text); font-size:14px; margin-bottom:5px; }
        .ad-empty p { margin:0; font-size:12.5px; }

        @media (max-width:600px) {
          .ad-grid { grid-template-columns:1fr; }
          .ad-cats { flex-wrap:nowrap; overflow-x:auto; scrollbar-width:none; }
          .ad-cats::-webkit-scrollbar { display:none; }
          .ad-cat { flex-shrink:0; }
        }
      `}</style>

      <div className="ad-static">
        <div className="ad-top">
          <h1 className="ad-title">Add-ons</h1>
          <span className="ad-count">{filtered.length} von {CATALOG.length}</span>
        </div>
        <p className="ad-intro">
          Bausteine, die dein Projekt erweitern — von Branding bis Automatisierung.
          Stöbere in Ruhe; Buchung und Preise klären wir gemeinsam mit deinem Team.
        </p>

        <div className="ad-toolbar">
          <input
            className="ad-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Add-ons durchsuchen"
          />
          <div className="ad-cats" role="tablist" aria-label="Kategorien">
            {([
              { key: 'Alle' as Filter, label: 'Alle' },
              { key: 'Beliebt' as Filter, label: 'Beliebt' },
              ...CATEGORIES.map((c) => ({ key: c.key as Filter, label: c.label })),
            ]).map((c) => (
              <button
                key={c.key}
                type="button"
                className={`ad-cat${active === c.key ? ' on' : ''}`}
                onClick={() => setActive(c.key)}
              >
                {c.label}
                <span className="n">{counts[c.key] ?? 0}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="ad-scroll">
        {filtered.length === 0 ? (
          <div className="ad-empty">
            <strong>Keine Add-ons gefunden</strong>
            <p>Versuche eine andere Suche oder Kategorie.</p>
          </div>
        ) : (
          <div className="ad-grid">
            {filtered.map((a) => (
              <article className="ad-card" key={a.id}>
                <div className="ad-card-head">
                  <span className="ad-card-cat">{a.category}</span>
                  {a.popular && <span className="ad-card-flag">Beliebt</span>}
                </div>
                <h3 className="ad-card-name">{a.name}</h3>
                <p className="ad-card-desc">{a.description}</p>
                {a.features.length > 0 && (
                  <div className="ad-card-feats">
                    {a.features.slice(0, 4).map((f, i) => (
                      <div className="ad-card-feat" key={i}>
                        <span className="d" aria-hidden />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                )}
                {a.tags.length > 0 && (
                  <div className="ad-card-tags">
                    {a.tags.slice(0, 4).map((t) => (
                      <span className="ad-tag" key={t}>{t}</span>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
