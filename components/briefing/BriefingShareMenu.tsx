'use client'

import { useEffect, useMemo, useRef } from 'react'
import { CaretDown, EnvelopeSimple, LinkSimple, LinkedinLogo, PencilSimple, ShareNetwork, UsersThree } from '@phosphor-icons/react'
import WhatsAppBrandIcon from '@/components/briefing/WhatsAppBrandIcon'
import {
  buildBriefingShareItems,
  executeBriefingShare,
  shareNoticeForError,
  shareSuccessNotice,
  type BriefingShareAction,
} from '@/lib/briefing/share-actions'
import type { BriefingDeliveryChannels } from '@/lib/briefing/delivery-channels'
import type { PortalWorkspaceMode } from '@/lib/portal-nav'

type Props = {
  open: boolean
  onToggle: () => void
  onClose: () => void
  headline: string
  narrativeText: string
  channels: BriefingDeliveryChannels
  defaultEmail?: string | null
  wsMode: PortalWorkspaceMode
  onEditTagro: () => void
  onTeamShare: () => void
  onConnect: (channel: 'whatsapp' | 'message') => void
  onNotice: (message: string) => void
}

function ShareIcon({ id }: { id: BriefingShareAction }) {
  switch (id) {
    case 'whatsapp':
      return <WhatsAppBrandIcon size={15} />
    case 'email_linked':
    case 'mailto':
      return <EnvelopeSimple size={15} weight="regular" aria-hidden />
    case 'linkedin':
      return <LinkedinLogo size={15} weight="regular" aria-hidden />
    case 'copy_link':
      return <LinkSimple size={15} weight="regular" aria-hidden />
    case 'team':
      return <UsersThree size={15} weight="regular" aria-hidden />
    case 'native':
      return <ShareNetwork size={15} weight="regular" aria-hidden />
    default:
      return <LinkSimple size={15} weight="regular" aria-hidden />
  }
}

export default function BriefingShareMenu({
  open,
  onToggle,
  onClose,
  headline,
  narrativeText,
  channels,
  defaultEmail,
  wsMode,
  onEditTagro,
  onTeamShare,
  onConnect,
  onNotice,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const items = useMemo(
    () => buildBriefingShareItems(channels, wsMode),
    [channels, wsMode],
  )

  useEffect(() => {
    if (!open) return
    function onDoc(event: MouseEvent) {
      const target = event.target as HTMLElement
      if (wrapRef.current?.contains(target)) return
      onClose()
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open, onClose])

  async function onItemClick(action: BriefingShareAction) {
    onClose()

    if (action === 'team') {
      onTeamShare()
      return
    }

    const result = await executeBriefingShare(action, {
      headline,
      narrativeText,
      channels,
      defaultEmail,
    })

    if (result.needsConnect) {
      onConnect(result.needsConnect)
      return
    }

    if (!result.ok) {
      onNotice(shareNoticeForError(result.error))
      return
    }

    const success = shareSuccessNotice(action)
    if (success) onNotice(success)
  }

  return (
    <div className="wsb-versand-row">
      <span className="wsb-versand-label">Auch ohne App anhören</span>
      <div className="wsb-versand-actions">
        <button type="button" className="wsb-versand-edit" onClick={onEditTagro}>
          <PencilSimple size={14} weight="regular" aria-hidden />
          <span>Bearbeiten</span>
        </button>
        <div className="wsb-versand-menu-wrap" ref={wrapRef}>
          <button
            type="button"
            className={`wsb-versand-trigger${open ? ' is-open' : ''}`}
            aria-expanded={open}
            aria-haspopup="menu"
            onClick={onToggle}
          >
            <span>Versand</span>
            <CaretDown size={12} weight="bold" aria-hidden />
          </button>
          {open ? (
            <div className="wsb-versand-menu" role="menu">
              {items.map(item => (
                <button
                  key={item.id}
                  type="button"
                  role="menuitem"
                  className="wsb-versand-menu-item"
                  onClick={() => void onItemClick(item.id)}
                >
                  <span className="wsb-versand-menu-icon">
                    <ShareIcon id={item.id} />
                  </span>
                  <span className="wsb-versand-menu-copy">
                    <span className="wsb-versand-menu-title">{item.label}</span>
                    {item.hint ? (
                      <span className="wsb-versand-menu-hint">{item.hint}</span>
                    ) : null}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
