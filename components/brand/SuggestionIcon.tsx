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
    return <BrandMark brand={resolved} size={size} className={className} />
  }
  if (!Icon) return null
  const Ico = Icon
  return <Ico size={size} weight="regular" aria-hidden />
}
