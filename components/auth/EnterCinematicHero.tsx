'use client'

import { useEffect, useRef, useState } from 'react'
import type { AuthThemeMode } from '@/lib/auth-theme'

const ENTER_HERO_VIDEO_LIGHT =
  'https://video.wixstatic.com/video/59289a_0abbbbbd55bb4739aa213c84cdb7fc33/720p/mp4/file.mp4'
const ENTER_HERO_VIDEO_DARK =
  'https://video.wixstatic.com/video/59289a_506b5da161e54cd1850bc4e57d09b95c/720p/mp4/file.mp4'

type Props = {
  theme?: AuthThemeMode
}

/**
 * Full-bleed enter hero — looping video with a strong bottom scrim
 * so dock CTAs sit on a calm surface, not raw video.
 */
export default function EnterCinematicHero({ theme = 'light' }: Props) {
  const isDark = theme === 'dark'
  const src = isDark ? ENTER_HERO_VIDEO_DARK : ENTER_HERO_VIDEO_LIGHT
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    el.load()
    if (reduced) {
      el.pause()
      return
    }
    void el.play().catch(() => { /* autoplay may be blocked */ })
  }, [reduced, src])

  return (
    <div className={`ae-cine${isDark ? ' is-dark' : ' is-light'}`} aria-hidden>
      <video
        ref={videoRef}
        className="ae-cine-video"
        src={src}
        key={src}
        muted
        loop
        playsInline
        autoPlay={!reduced}
        preload="auto"
      />
      <div className="ae-cine-scrim" />
      <div className="ae-cine-scrim-soft" />

      <style jsx>{`
        .ae-cine {
          position: fixed;
          inset: 0;
          z-index: 0;
          overflow: hidden;
          pointer-events: none;
          background: #0c0c0e;
        }
        .ae-cine-video {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center center;
          display: block;
        }
        /* Primary vignette — solid band under the dock, then fade up */
        .ae-cine-scrim {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }
        .ae-cine.is-dark .ae-cine-scrim {
          background: linear-gradient(
            to top,
            #000000 0%,
            #000000 14%,
            rgba(0, 0, 0, 0.92) 28%,
            rgba(0, 0, 0, 0.62) 46%,
            rgba(0, 0, 0, 0.28) 64%,
            rgba(0, 0, 0, 0.08) 82%,
            transparent 100%
          );
        }
        .ae-cine.is-light .ae-cine-scrim {
          background: linear-gradient(
            to top,
            #ffffff 0%,
            #ffffff 14%,
            rgba(255, 255, 255, 0.92) 28%,
            rgba(255, 255, 255, 0.62) 46%,
            rgba(255, 255, 255, 0.28) 64%,
            rgba(255, 255, 255, 0.08) 82%,
            transparent 100%
          );
        }
        /* Extra soft sheet near CTAs */
        .ae-cine-scrim-soft {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          height: min(48vh, 420px);
          pointer-events: none;
        }
        .ae-cine.is-dark .ae-cine-scrim-soft {
          background: linear-gradient(
            to top,
            #000000 0%,
            rgba(0, 0, 0, 0.85) 22%,
            rgba(0, 0, 0, 0.35) 58%,
            transparent 100%
          );
        }
        .ae-cine.is-light .ae-cine-scrim-soft {
          background: linear-gradient(
            to top,
            #ffffff 0%,
            rgba(255, 255, 255, 0.85) 22%,
            rgba(255, 255, 255, 0.35) 58%,
            transparent 100%
          );
        }
      `}</style>
    </div>
  )
}
