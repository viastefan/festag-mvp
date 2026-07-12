import { DOCUMENTS_CSS } from '@/components/documents/documents-styles'
import DocumentTemplatePicker from '@/components/documents/DocumentTemplatePicker'
import PortalPageHeader from '@/components/portal/PortalPageHeader'
import { DOC_TABS } from '@/components/documents/documents-shared'

/** Instant shell — matches the live page so navigation feels immediate. */
export default function DocumentsLoading() {
  return (
    <div className="dec-os doc-os-page">
      <style suppressHydrationWarning dangerouslySetInnerHTML={{ __html: DOCUMENTS_CSS }} />
      <div className="dec-m-shell">
        <div className="dec-static-top doc-static-top">
          <PortalPageHeader
            title="Dokumente."
            lead="Angebote, Rechnungen und Verträge für Kunden."
          />
          <DocumentTemplatePicker disabled />
          <div className="doc-filters dec-dt">
            {DOC_TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`doc-filter${item.id === 'all' ? ' on' : ''}`}
                tabIndex={-1}
                aria-hidden
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <div className="dec-scroll-body" />
      </div>
    </div>
  )
}
