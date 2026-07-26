'use client'

/**
 * Tagro AI mark — Festag compose icon (edit_square), same as website FAB.
 * Optional PNG at `/brand/tagro-logo.png`; compose icon is the canonical fallback.
 */

import TagroComposeIcon from '@/components/icons/TagroComposeIcon'
import { useState } from 'react'

interface Props {
  size?: number
  thinking?: boolean
  className?: string
}

export default function TagroLogo({ size = 28, thinking = false, className = '' }: Props) {
  const [imgFailed, setImgFailed] = useState(false)

  return (
    <span
      className={`tagro-logo ${thinking ? 'thinking' : ''} ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size, height: size,
        position: 'relative',
        flexShrink: 0,
      }}
      aria-label="Tagro"
    >
      <style>{`
        .tagro-logo .tagro-img,
        .tagro-logo .tagro-mark {
          width: 100%; height: 100%;
          object-fit: contain;
          transition: filter .3s cubic-bezier(.16,1,.3,1);
        }
        @keyframes tagroSpin   { to   { transform: rotate(360deg); } }
        @keyframes tagroPulse  { 0%,100% { opacity: .85; transform: scale(1); }
                                 50%      { opacity: 1;   transform: scale(1.04); } }

        .tagro-logo .tagro-anim { animation: tagroPulse 3.6s ease-in-out infinite; }
        .tagro-logo.thinking .tagro-anim {
          animation: tagroSpin 6s linear infinite;
          filter: drop-shadow(0 0 6px rgba(140,170,255,.45)) drop-shadow(0 0 16px rgba(140,170,255,.20));
        }
      `}</style>

      {!imgFailed ? (
        <img
          src="/brand/tagro-logo.png"
          alt=""
          className="tagro-img tagro-anim"
          onError={() => setImgFailed(true)}
          draggable={false}
        />
      ) : (
        <span className="tagro-mark tagro-anim">
          <TagroComposeIcon size={Math.round(size * 0.82)} />
        </span>
      )}
    </span>
  )
}
