'use client'

/**
 * Inert destination preview behind the auth gate modal.
 * Login → dashboard silhouette. Register → master Intent step.
 * Not live data — visual priming only.
 */

export type AuthPreviewKind = 'dashboard' | 'onboarding'

export default function AuthDestinationPreview({ kind }: { kind: AuthPreviewKind }) {
  if (kind === 'onboarding') {
    return (
      <div className="al-dest-preview al-dest-preview--onboarding" aria-hidden="true">
        <div className="al-dest-onb">
          <header className="al-dest-onb-header">
            <span className="al-dest-mark" />
            <span className="al-dest-ghost-pill" />
          </header>
          <div className="al-dest-onb-body">
            <div className="al-dest-onb-hero">
              <div className="al-dest-onb-h1">Woran arbeitest du gerade?</div>
              <div className="al-dest-onb-sub">Tagro richtet deinen Workspace danach ein.</div>
            </div>
            <div className="al-dest-onb-field">
              <div className="al-dest-onb-input">
                <span className="al-dest-onb-caret" />
              </div>
            </div>
          </div>
          <div className="al-dest-onb-bar al-dest-onb-bar--dots-only">
            <div className="al-dest-onb-dots al-dest-onb-dots--apple">
              <i className="is-active" />
              <i />
              <i />
              <i />
            </div>
          </div>
        </div>
        <div className="al-dest-scrim" />
      </div>
    )
  }

  return (
    <div className="al-dest-preview al-dest-preview--dashboard" aria-hidden="true">
      <div className="al-dest-dash">
        <aside className="al-dest-side">
          <div className="al-dest-side-top">
            <span className="al-dest-mark" />
            <span className="al-dest-side-ws" />
          </div>
          <nav className="al-dest-side-nav">
            <span className="al-dest-nav-item is-active" />
            <span className="al-dest-nav-item" />
            <span className="al-dest-nav-item" />
            <span className="al-dest-nav-item" />
            <span className="al-dest-nav-item" />
          </nav>
          <div className="al-dest-side-foot">
            <span className="al-dest-nav-item" />
          </div>
        </aside>
        <div className="al-dest-main-col">
          <div className="al-dest-plate">
            <div className="al-dest-plate-head">
              <div className="al-dest-h1">Gesamtbericht</div>
              <div className="al-dest-head-actions">
                <span className="al-dest-pill" />
                <span className="al-dest-pill" />
              </div>
            </div>
            <div className="al-dest-cards">
              <div className="al-dest-card">
                <div className="al-dest-line al-dest-line--lg" />
                <div className="al-dest-line" />
                <div className="al-dest-line al-dest-line--short" />
              </div>
              <div className="al-dest-card">
                <div className="al-dest-line al-dest-line--lg" />
                <div className="al-dest-line" />
                <div className="al-dest-line al-dest-line--mid" />
              </div>
              <div className="al-dest-card al-dest-card--soft">
                <div className="al-dest-line" />
                <div className="al-dest-line al-dest-line--short" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="al-dest-scrim" />
    </div>
  )
}
