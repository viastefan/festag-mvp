'use client'

import Link from 'next/link'
import {
  type SettingsNavItem,
  settingsHref,
} from '@/components/settings/settings-config'
import { openSupportEmail, replayWelcomeTour } from '@/lib/help/settings-actions'

type Props = {
  items: SettingsNavItem[]
  activeSlug: string
  itemClassName: (active: boolean) => string
  onNavigate?: () => void
  /** Show Phosphor icons (desktop settings rail / mobile sheet). */
  showIcons?: boolean
}

function handleAction(action: NonNullable<SettingsNavItem['action']>) {
  if (action === 'support') openSupportEmail()
  if (action === 'replay-tour') void replayWelcomeTour()
}

export default function SettingsNavItems({
  items,
  activeSlug,
  itemClassName,
  onNavigate,
  showIcons = false,
}: Props) {
  return (
    <>
      {items.map(item => {
        const key = item.slug || item.label
        const Icon = item.icon
        const label = (
          <>
            {showIcons && Icon ? (
              <span className="settings-nav-icon" aria-hidden>
                <Icon size={15} weight="regular" />
              </span>
            ) : null}
            <span>{item.label}</span>
          </>
        )

        if (item.action) {
          return (
            <button
              key={key}
              type="button"
              className={itemClassName(false)}
              onClick={() => {
                handleAction(item.action!)
                onNavigate?.()
              }}
            >
              {label}
            </button>
          )
        }
        const href = item.href ?? settingsHref(item.slug)
        const isActive = !item.href && item.slug === activeSlug
        return (
          <Link
            key={key}
            href={href}
            className={itemClassName(isActive)}
            onClick={onNavigate}
            {...(item.href
              ? {
                  target: item.href.startsWith('http') ? ('_blank' as const) : undefined,
                  rel: item.href.startsWith('http') ? 'noopener noreferrer' : undefined,
                }
              : {})}
          >
            {label}
          </Link>
        )
      })}
    </>
  )
}
