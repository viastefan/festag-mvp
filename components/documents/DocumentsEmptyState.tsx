'use client'

import DocumentsEmptyIllustration from '@/components/documents/DocumentsEmptyIllustration'

type Props = {
  filtered?: boolean
  canCreate?: boolean
  onCreateAngebot?: () => void
  onCreateRechnung?: () => void
}

export default function DocumentsEmptyState({
  filtered = false,
  canCreate = false,
  onCreateAngebot,
  onCreateRechnung,
}: Props) {
  if (filtered) {
    return (
      <div className="dec-empty doc-empty doc-empty--linear">
        <DocumentsEmptyIllustration />
        <p>Keine Dokumente in dieser Ansicht.</p>
        <small>Wechsle den Filter oder erstelle ein neues Dokument.</small>
      </div>
    )
  }

  return (
    <div className="dec-empty doc-empty doc-empty--linear">
      <DocumentsEmptyIllustration />
      <h2 className="doc-empty-title">Dokumente</h2>
      <p className="doc-empty-lead">
        Angebote, Rechnungen und Verträge mit klarem Status — erstellen, versenden
        und für Kunden nachvollziehbar halten. Tagro füllt Felder vor, du bestätigst.
      </p>
      {canCreate ? (
        <div className="doc-empty-actions">
          <button type="button" className="doc-empty-btn doc-empty-btn--primary" onClick={onCreateAngebot}>
            Angebot erstellen
          </button>
          <button type="button" className="doc-empty-btn doc-empty-btn--ghost" onClick={onCreateRechnung}>
            Rechnung erstellen
          </button>
        </div>
      ) : (
        <small>Melde dich an, um Dokumente zu erstellen.</small>
      )}
    </div>
  )
}
