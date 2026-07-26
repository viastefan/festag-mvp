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
}

function handleAction(action: NonNullable<SettingsNavItem['action']>) {
  if (action === 'support') openSupportEmail()
  if (action === 'replay-tour') void replayWelcomeTour()
}

export default function SettingsNavItems({ items, activeSlug, itemClassName, onNavigate }: Props) {
  return (
    <>
      {items.map(item => {
        const key = item.slug || item.label
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
              {item.label}
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
            {...(item.href ? { target: item.href.startsWith('http') ? '_blank' as const : undefined, rel: item.href.startsWith('http') ? 'noopener noreferrer' : undefined } : {})}
          >
            {item.label}
          </Link>
        )
      })}
    </>
  )
}
