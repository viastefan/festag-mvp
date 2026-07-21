'use client'

/**
 * Docs chrome — lock destination canvas before paint so auth→docs
 * never flashes portal gray / auth landing under the docs shell.
 */

import { useLayoutEffect, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { applyAppearanceForPath } from '@/lib/theme'

export default function DocsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname() || '/docs'

  useLayoutEffect(() => {
    applyAppearanceForPath(pathname)
  }, [pathname])

  return children
}
