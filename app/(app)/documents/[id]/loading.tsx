import { DOCUMENT_EDITOR_CSS } from '@/components/documents/document-editor-styles'

export default function DocumentEditorLoading() {
  return (
    <div className="doc-ed doc-ed-os dec-os doc-ed--loading">
      <style>{DOCUMENT_EDITOR_CSS}</style>
      <div className="dec-m-shell doc-ed-shell">
        <div className="dec-static-top">
          <header className="dec-page-head doc-ed-page-head">
            <div className="dec-page-head-copy dec-m-title">
              <div className="doc-ed-skel doc-ed-skel-kicker" />
              <div className="doc-ed-skel doc-ed-skel-title" />
              <div className="doc-ed-skel doc-ed-skel-lead" />
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
