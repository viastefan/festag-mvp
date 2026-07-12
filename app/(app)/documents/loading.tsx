import { DOCUMENTS_CSS } from '@/components/documents/documents-styles'

export default function DocumentsLoading() {
  return (
    <div className="dec-os doc-os-page">
      <style suppressHydrationWarning dangerouslySetInnerHTML={{ __html: DOCUMENTS_CSS }} />
      <div className="dec-m-shell">
        <div className="dec-static-top doc-static-top">
          <header className="dec-page-head">
            <div className="dec-page-head-copy">
              <h1 className="dec-page-title festag-page-title">Dokumente.</h1>
            </div>
          </header>
        </div>
        <div className="dec-scroll-body">
          <p className="dec-empty" style={{ opacity: 0.5 }}>Lade Dokumente…</p>
        </div>
      </div>
    </div>
  )
}
