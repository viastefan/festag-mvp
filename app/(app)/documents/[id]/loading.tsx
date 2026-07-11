import { DOCUMENT_EDITOR_CSS } from '@/components/documents/document-editor-styles'

export default function DocumentEditorLoading() {
  return (
    <div className="doc-ed doc-ed--loading">
      <style>{DOCUMENT_EDITOR_CSS}</style>
      <header className="doc-ed-top">
        <div className="doc-ed-top-left">
          <div className="doc-ed-skel doc-ed-skel-back" />
          <div className="doc-ed-skel doc-ed-skel-title" />
        </div>
      </header>
      <div className="doc-ed-body doc-ed-body--loading">
        <div className="doc-ed-skel doc-ed-skel-sheet" />
      </div>
    </div>
  )
}
