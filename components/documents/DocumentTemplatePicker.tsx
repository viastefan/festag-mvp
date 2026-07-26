'use client'

import { FileText, Plus, Receipt, Scroll } from '@phosphor-icons/react'
import { DOC_TEMPLATES, type DocKind } from '@/lib/documents/templates'
import { TEMPLATE_ACTION, TEMPLATE_BLURBS } from '@/components/documents/documents-templates-meta'

const KIND_ICON = {
  angebot: FileText,
  rechnung: Receipt,
  vertrag: Scroll,
} as const

type Props = {
  disabled?: boolean
  creating?: DocKind | null
  onSelect: (kind: DocKind) => void
}

export default function DocumentTemplatePicker({ disabled, creating, onSelect }: Props) {
  return (
    <section className="doc-templates" aria-label="Dokumentvorlagen">
      <div className="doc-create-grid">
        {DOC_TEMPLATES.map((template) => {
          const Icon = KIND_ICON[template.kind]
          const isCreating = creating === template.kind
          const isDisabled = disabled || Boolean(creating)
          return (
            <button
              key={template.kind}
              type="button"
              className="doc-create-tile"
              disabled={isDisabled}
              onClick={() => onSelect(template.kind)}
              title={isDisabled ? (isCreating ? 'Entwurf wird erstellt…' : 'Workspace wird geladen…') : TEMPLATE_ACTION[template.kind]}
            >
              <span className="doc-create-ico">
                <Icon size={18} weight="regular" />
              </span>
              <span className="doc-create-copy">
                <span className="doc-create-label">{isCreating ? 'Wird erstellt…' : template.title}</span>
                <span className="doc-create-sub">{TEMPLATE_BLURBS[template.kind]}</span>
              </span>
              <span className="doc-create-plus" aria-hidden>
                <Plus size={14} weight="bold" />
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
