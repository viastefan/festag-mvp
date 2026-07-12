import { DOCUMENT_EDITOR_CSS } from '@/components/documents/document-editor-styles'

export default function DocumentEditorLoading() {
  return (
    <div className="doc-ed doc-ed-os dec-os doc-ed-page doc-ed--loading">
      <style>{DOCUMENT_EDITOR_CSS}</style>
      <div className="dec-m-shell doc-ed-shell">
        <div className="dec-static-top">
          <div className="doc-ed-skel doc-ed-skel-back dec-dt" style={{ width: 96, height: 14, marginBottom: 16 }} />
          <header className="dec-page-head doc-ed-page-head">
            <div className="dec-page-head-copy dec-m-title">
              <div className="doc-ed-skel doc-ed-skel-title" />
            </div>
          </header>
        </div>
        <div className="dec-scroll-body doc-ed-body doc-ed-body--loading">
          <div className="doc-ed-skel doc-ed-skel-sheet" />
        </div>
      </div>
    </div>
  )
}
