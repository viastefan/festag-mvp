'use client'

import { useSyncExternalStore } from 'react'
import {
  getNavShortcutActiveHref,
  subscribeNavShortcutTip,
} from '@/lib/portal-nav-shortcut-coordinator'

export function useNavShortcutActive() {
  return useSyncExternalStore(subscribeNavShortcutTip, getNavShortcutActiveHref, () => null)
}
