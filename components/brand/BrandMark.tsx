'use client'

import type { ReactNode } from 'react'
import type { BrandId } from '@/lib/brand/detect-brand'

type Props = {
  brand: BrandId
  size?: number
  className?: string
  title?: string
}

function SvgShell({
  size,
  className,
  title,
  children,
}: {
  size: number
  className?: string
  title?: string
  children: ReactNode
}) {
  return (
    <svg
      className={className ? `brand-mark ${className}` : 'brand-mark'}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      role={title ? 'img' : 'presentation'}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {children}
    </svg>
  )
}

function GoogleMark({ size, className, title }: Props) {
  return (
    <SvgShell size={size ?? 18} className={className} title={title}>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </SvgShell>
  )
}

function GmailMark({ size, className, title }: Props) {
  return (
    <SvgShell size={size ?? 18} className={className} title={title}>
      <path fill="#EA4335" d="M5 19h14a2 2 0 0 0 2-2V7.1L12 12.9 2 7.1V17a2 2 0 0 0 2 2z" />
      <path fill="#34A853" d="M2 7.1 12 12.9l10-5.8V5a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2.1z" />
      <path fill="#4285F4" d="M2 5v2.1l10 5.8L22 7.1V5a2 2 0 0 0-1.05-1.76L12 9.1 3.05 3.24A2 2 0 0 0 2 5z" />
      <path fill="#FBBC05" d="M2 7.1V17h3V10.4L2 7.1z" />
      <path fill="#C5221F" d="M19 17h3V7.1l-3 3.3V17z" />
    </SvgShell>
  )
}

function GoogleDocsMark({ size, className, title }: Props) {
  return (
    <SvgShell size={size ?? 18} className={className} title={title}>
      <path fill="#4285F4" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
      <path fill="#A1C2FA" d="M14 2v6h6" />
      <path fill="#fff" d="M8 13h8v1.5H8V13zm0 3h8v1.5H8V16zm0 3h5.5v1.5H8V19z" />
    </SvgShell>
  )
}

function MicrosoftMark({ size, className, title }: Props) {
  return (
    <SvgShell size={size ?? 18} className={className} title={title}>
      <rect fill="#F25022" x="2" y="2" width="9.5" height="9.5" />
      <rect fill="#7FBA00" x="12.5" y="2" width="9.5" height="9.5" />
      <rect fill="#00A4EF" x="2" y="12.5" width="9.5" height="9.5" />
      <rect fill="#FFB900" x="12.5" y="12.5" width="9.5" height="9.5" />
    </SvgShell>
  )
}

function AppleMark({ size, className, title }: Props) {
  return (
    <SvgShell size={size ?? 18} className={className} title={title}>
      <path
        fill="currentColor"
        d="M16.7 13.1c-.03 2.9 2.54 3.87 2.57 3.88-.02.07-.4 1.38-1.32 2.74-.8 1.18-1.63 2.35-2.94 2.37-1.28.02-1.69-.76-3.16-.76-1.47 0-1.93.74-3.14.78-1.26.04-2.22-1.27-3.03-2.45-1.65-2.39-2.91-6.75-1.2-9.7.86-1.49 2.4-2.43 4.07-2.46 1.27-.02 2.47.86 3.24.86.76 0 2.18-1.06 3.68-.9.63.03 2.4.25 3.54 1.88-.09.06-2.11 1.23-2.09 3.66zM14.2 4.8c.7-.85 1.17-2.03 1.04-3.2-.99.04-2.19.66-2.9 1.5-.65.75-1.22 1.95-1.07 3.1 1.13.09 2.28-.57 2.93-1.4z"
      />
    </SvgShell>
  )
}

function SlackMark({ size, className, title }: Props) {
  return (
    <SvgShell size={size ?? 18} className={className} title={title}>
      <path fill="#E01E5A" d="M5.04 14.2a1.67 1.67 0 1 1-3.34 0 1.67 1.67 0 0 1 3.34 0" />
      <path fill="#36C5F0" d="M7.87 14.2a1.67 1.67 0 0 1 3.34 0v4.17a1.67 1.67 0 1 1-3.34 0V14.2z" />
      <path fill="#2EB67D" d="M9.79 5.04a1.67 1.67 0 1 1 0-3.34 1.67 1.67 0 0 1 0 3.34" />
      <path fill="#ECB22E" d="M9.79 7.87a1.67 1.67 0 0 1 0 3.34H5.62a1.67 1.67 0 1 1 0-3.34h4.17z" />
      <path fill="#E01E5A" d="M18.96 9.79a1.67 1.67 0 1 1 3.34 0 1.67 1.67 0 0 1-3.34 0" />
      <path fill="#36C5F0" d="M16.13 9.79a1.67 1.67 0 0 1-3.34 0V5.62a1.67 1.67 0 1 1 3.34 0v4.17z" />
      <path fill="#2EB67D" d="M14.21 18.96a1.67 1.67 0 1 1 0 3.34 1.67 1.67 0 0 1 0-3.34" />
      <path fill="#ECB22E" d="M14.21 16.13a1.67 1.67 0 0 1 0-3.34h4.17a1.67 1.67 0 1 1 0 3.34h-4.17z" />
    </SvgShell>
  )
}

function GithubMark({ size, className, title }: Props) {
  return (
    <SvgShell size={size ?? 18} className={className} title={title}>
      <path
        fill="currentColor"
        d="M12 .5C5.73.5.98 5.25.98 11.52c0 4.86 3.15 8.98 7.52 10.43.55.1.75-.24.75-.53 0-.26-.01-1.13-.02-2.05-3.06.67-3.7-1.3-3.7-1.3-.5-1.27-1.22-1.61-1.22-1.61-.99-.68.08-.67.08-.67 1.1.08 1.68 1.13 1.68 1.13.97 1.67 2.55 1.19 3.17.91.1-.71.38-1.19.69-1.46-2.44-.28-5.01-1.22-5.01-5.43 0-1.2.43-2.18 1.13-2.95-.11-.28-.49-1.41.11-2.94 0 0 .92-.29 3.02 1.13a10.5 10.5 0 0 1 2.75-.37c.93 0 1.87.12 2.75.37 2.1-1.42 3.02-1.13 3.02-1.13.6 1.53.22 2.66.11 2.94.7.77 1.13 1.75 1.13 2.95 0 4.22-2.58 5.15-5.03 5.42.39.34.74 1.01.74 2.04 0 1.47-.01 2.66-.01 3.02 0 .29.2.64.76.53A10.52 10.52 0 0 0 23.02 11.52C23.02 5.25 18.27.5 12 .5z"
      />
    </SvgShell>
  )
}

function StripeMark({ size, className, title }: Props) {
  return (
    <SvgShell size={size ?? 18} className={className} title={title}>
      <path fill="#635BFF" d="M13.3 10.2c0-.8-.7-1.1-1.8-1.1-1.5 0-3.4.4-4.9 1.2V6.4c1.6-.7 3.2-1 4.9-1 4 0 6.6 2.1 6.6 5.6v7.5h-4.2v-1.4c-1.2 1.1-2.8 1.7-4.6 1.7-2.9 0-4.8-1.5-4.8-3.9 0-2.9 2.3-4.2 6.8-4.2v-.5zm0 2.8c-2.5 0-3.4.6-3.4 1.5 0 .8.7 1.2 1.8 1.2 1.4 0 2.7-.6 3.6-1.5v-1.2z" />
    </SvgShell>
  )
}

function FigmaMark({ size, className, title }: Props) {
  return (
    <SvgShell size={size ?? 18} className={className} title={title}>
      <path fill="#1ABCFE" d="M8 24a4 4 0 0 0 4-4v-4H8a4 4 0 0 0 0 8z" />
      <path fill="#0ACF83" d="M4 12a4 4 0 0 1 4-4h4v8H8a4 4 0 0 1-4-4z" />
      <path fill="#FF7262" d="M4 4a4 4 0 0 1 4-4h4v8H8a4 4 0 0 1-4-4z" />
      <path fill="#F24E1E" d="M12 0h4a4 4 0 0 1 0 8h-4V0z" />
      <path fill="#A259FF" d="M20 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0z" />
    </SvgShell>
  )
}

function NotionMark({ size, className, title }: Props) {
  return (
    <SvgShell size={size ?? 18} className={className} title={title}>
      <path fill="currentColor" d="M4.46 3.2c.4-.3.9-.35 1.35-.2l12.8 4.6c.5.18.8.65.8 1.18v11.12c0 .5-.28.95-.73 1.17l-6.2 3.1c-.45.22-.98.22-1.43 0L4.73 20.07A1.35 1.35 0 0 1 4 18.9V4.38c0-.5.28-.95.46-1.18zm1.1 1.35v13.1l5.35 2.67V9.22L5.56 4.55z" />
    </SvgShell>
  )
}

function JiraMark({ size, className, title }: Props) {
  return (
    <SvgShell size={size ?? 18} className={className} title={title}>
      <path fill="#2684FF" d="M11.53 2 2 19.5h6.8L11.53 12l2.73 7.5H21L11.53 2z" />
      <path fill="url(#jiraGrad)" d="M11.53 12 8.8 19.5H21L11.53 12z" />
      <defs>
        <linearGradient id="jiraGrad" x1="11.5" y1="12" x2="19.5" y2="19.5" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0052CC" />
          <stop offset="1" stopColor="#2684FF" />
        </linearGradient>
      </defs>
    </SvgShell>
  )
}

function HubspotMark({ size, className, title }: Props) {
  return (
    <SvgShell size={size ?? 18} className={className} title={title}>
      <path fill="#FF7A59" d="M18.2 7.5a4.2 4.2 0 0 0-3.1-1.3l-1.1-2.2a6.8 6.8 0 1 0-2.2 2.2l2.2 1.1a4.2 4.2 0 1 0 2.2 2.2l1.1 2.2a6.8 6.8 0 1 0 2.2-2.2l-2.2-1.1a4.2 4.2 0 0 0 1.3-3.1z" />
    </SvgShell>
  )
}

function SalesforceMark({ size, className, title }: Props) {
  return (
    <SvgShell size={size ?? 18} className={className} title={title}>
      <path fill="#00A1E0" d="M10.2 3.2a5.4 5.4 0 0 1 4.9-3 5.6 5.6 0 0 1 5.3 3.8 4.4 4.4 0 0 1 1.8-.4 4.5 4.5 0 0 1 4.2 6 5.8 5.8 0 0 1-1 11.4H6.4A5.8 5.8 0 0 1 1 16.2a5.6 5.6 0 0 1 2.8-5.1 5.4 5.4 0 0 1 6.4-7.9z" />
    </SvgShell>
  )
}

function ZoomMark({ size, className, title }: Props) {
  return (
    <SvgShell size={size ?? 18} className={className} title={title}>
      <rect fill="#0B5CFF" x="2" y="6" width="20" height="12" rx="4" />
      <path fill="#fff" d="M9.5 10.5v3l3.5-1.5-3.5-1.5z" />
    </SvgShell>
  )
}

function DropboxMark({ size, className, title }: Props) {
  return (
    <SvgShell size={size ?? 18} className={className} title={title}>
      <path fill="#0061FF" d="m6 3 6 4-6 4-6-4 6-4zm12 0 6 4-6 4-6-4 6-4zM0 15l6-4 6 4-6 4-6-4zm12 0 6-4 6 4-6 4-6-4z" />
    </SvgShell>
  )
}

function LinkedinMark({ size, className, title }: Props) {
  return (
    <SvgShell size={size ?? 18} className={className} title={title}>
      <rect fill="#0A66C2" x="2" y="2" width="20" height="20" rx="3" />
      <path fill="#fff" d="M7.2 10.2v7.2H5V10.2h2.2zm-1.1-3.3a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6zM19 17.4h-2.2v-3.5c0-.8 0-1.9-1.1-1.9-1.1 0-1.3.9-1.3 1.8v3.6H12.2V10.2h2.1v1c.5-.9 1.3-1.1 2.1-1.1 2.2 0 2.6 1.5 2.6 3.4v3.9z" />
    </SvgShell>
  )
}

function MetaMark({ size, className, title }: Props) {
  return (
    <SvgShell size={size ?? 18} className={className} title={title}>
      <path fill="#0866FF" d="M12 2.5c-2.8 0-4.2 2.2-5.6 4.5C4.8 4.7 3.3 2.5.5 2.5 2.2 6.5 5 10.2 8.4 13.5 9.6 14.7 10.8 16 12 16s2.4-1.3 3.6-2.5c3.4-3.3 6.2-7 7.9-11-2.8 0-4.3 2.2-5.9 4.5C16.2 4.7 14.8 2.5 12 2.5z" />
    </SvgShell>
  )
}

function AwsMark({ size, className, title }: Props) {
  return (
    <SvgShell size={size ?? 18} className={className} title={title}>
      <path fill="#FF9900" d="M6.5 14.8c4.8 3.5 11.8 3.4 17.2 0 .3-.2.5.2.2.4-4.9 2.9-11.5 2.9-16.6 0-.3-.2-.2-.6.2-.4z" />
      <path fill="#FF9900" d="M5.8 13.2c.2-.3.6-.2.8 0 3.9 3.2 9.7 3.2 14.2 0 .2-.2.6-.3.8 0 .2.3.1.6-.1.8-4.5 2.6-11.2 2.6-16.2 0-.4.3-.7.6-.5.1 0 .1.1.1.1 4.8 2.8 7.6 8 6.9 13.6-.7 5-4.8 9.2-9.7 10.8-.5.2-1-.2-.8-.7 1.5-4.5-.2-9.4-3.6-12.1z" />
      <path fill="#252F3E" d="M12 4.2 8.6 9.8h2.2l.6-1.2h3.2l.6 1.2h2.2L14.8 4.2h-2.8zm.2 2.1.9 1.8h-1.8l.9-1.8z" />
    </SvgShell>
  )
}

function ShopifyMark({ size, className, title }: Props) {
  return (
    <SvgShell size={size ?? 18} className={className} title={title}>
      <path fill="#95BF47" d="M16.7 5.2 15.8 4l-8.5 1.6v14.8l10.4-2.4V5.2z" />
      <path fill="#5E8E3E" d="M15.8 4 8.3 5.6v14.8l7.5-1.7V4z" />
      <path fill="#fff" d="M11.2 9.1c-.1-.8-.7-1.2-1.5-1.2-.4 0-.9.1-1.3.2l.2 2.6c.4-.1.8-.2 1.2-.2.5 0 .9.2 1 1l.4-.4zm1.8 3.4c-.5 0-1 .1-1.5.3l.2 2.5c.5-.2 1-.3 1.5-.3.8 0 1.3-.4 1.3-1.2 0-.8-.5-1.3-1.5-1.3z" />
    </SvgShell>
  )
}

function PaypalMark({ size, className, title }: Props) {
  return (
    <SvgShell size={size ?? 18} className={className} title={title}>
      <path fill="#003087" d="M8.3 19.5h-3l1.2-7.6h3c3.1 0 5.5 1.3 4.8 4.5-.6 3-3.4 3.1-6 3.1z" />
      <path fill="#009CDE" d="M18.2 11.9c-.8 4.2-3.9 6.1-7.7 6.1H8.3l-.8 5h-3l2-12.6h5.5c4.2 0 7.4 1.7 6.2 6.5z" />
    </SvgShell>
  )
}

function OpenaiMark({ size, className, title }: Props) {
  return (
    <SvgShell size={size ?? 18} className={className} title={title}>
      <path
        fill="currentColor"
        d="M12 2.2c.5 0 1 .1 1.4.3l4.8 2.8c.8.5 1.3 1.3 1.5 2.2l1.1 5.5c.2 1-.1 2-.8 2.8l-3.9 4.2c-.7.8-1.7 1.2-2.7 1.2H9.7c-1 0-2-.4-2.7-1.2l-3.9-4.2c-.7-.8-1-1.8-.8-2.8l1.1-5.5c.2-.9.7-1.7 1.5-2.2l4.8-2.8c.4-.2.9-.3 1.4-.3zm0 2.1-4.5 2.6 1 5.1 4.5 2.6 4.5-2.6 1-5.1L12 4.3zm-5.8 7.2 1.6 3.4 4.2-2.4-1.6-3.4-4.2 2.4zm11.6 0-4.2-2.4-1.6 3.4 4.2 2.4 1.6-3.4zM12 16.1l-4.2 2.4 1.6 3.4L12 19.3l2.6 2.6 1.6-3.4L12 16.1z"
      />
    </SvgShell>
  )
}

const MONO_BRANDS = new Set<BrandId>(['apple', 'github', 'notion', 'openai'])

export default function BrandMark({ brand, size = 18, className, title }: Props) {
  const props = { brand, size, className, title }
  const mark = (() => {
    switch (brand) {
      case 'google': return <GoogleMark {...props} />
      case 'gmail': return <GmailMark {...props} />
      case 'google-docs': return <GoogleDocsMark {...props} />
      case 'microsoft': return <MicrosoftMark {...props} />
      case 'apple': return <AppleMark {...props} />
      case 'slack': return <SlackMark {...props} />
      case 'github': return <GithubMark {...props} />
      case 'stripe': return <StripeMark {...props} />
      case 'figma': return <FigmaMark {...props} />
      case 'notion': return <NotionMark {...props} />
      case 'jira': return <JiraMark {...props} />
      case 'hubspot': return <HubspotMark {...props} />
      case 'salesforce': return <SalesforceMark {...props} />
      case 'zoom': return <ZoomMark {...props} />
      case 'dropbox': return <DropboxMark {...props} />
      case 'linkedin': return <LinkedinMark {...props} />
      case 'meta': return <MetaMark {...props} />
      case 'aws': return <AwsMark {...props} />
      case 'shopify': return <ShopifyMark {...props} />
      case 'paypal': return <PaypalMark {...props} />
      case 'openai': return <OpenaiMark {...props} />
      default: return null
    }
  })()

  if (!mark) return null

  if (MONO_BRANDS.has(brand)) {
    return (
      <span className={`brand-mark-host is-mono${className ? ` ${className}` : ''}`} style={{ width: size, height: size }}>
        {mark}
      </span>
    )
  }

  return mark
}
