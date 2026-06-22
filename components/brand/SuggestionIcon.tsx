'use client'

import type { Icon } from '@phosphor-icons/react'
import BrandMark from '@/components/brand/BrandMark'
import { detectBrandFromText, type BrandId } from '@/lib/brand/detect-brand'

type Props = {
  text: string
  brand?: BrandId | null
  Icon?: Icon
  size?: number
  className?: string
}

export default function SuggestionIcon({
  text,
  brand,
  Icon,
  size = 18,
  className,
}: Props) {
  const resolved = brand ?? detectBrandFromText(text)
  if (resolved) {
    return (
      <span
        className={`festag-brand-icon${className ? ` ${className}` : ''}`}
        style={{ width: size + 10, height: size + 10 }}
      >
        <BrandMark brand={resolved} size={size} />
      </span>
    )
  }
  if (!Icon) return null
  const Ico = Icon
  return <Ico size={size} weight="regular" aria-hidden />
}
