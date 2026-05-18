'use client'

/**
 * Festag transitional loader.
 * Premium CGI-inspired chrome "F" assembled from hollow cube pixels.
 */

type Props = { fullscreen?: boolean; label?: string }

const PIXELS = [
  { x: -44, y: -38, sx: -170, sy: -78, z: 60, s: 1.1, d: 0 },
  { x: -18, y: -38, sx: -90, sy: -130, z: 24, s: .9, d: .06 },
  { x: 8, y: -38, sx: 126, sy: -96, z: 74, s: 1, d: .12 },
  { x: 34, y: -38, sx: 194, sy: -28, z: -12, s: .72, d: .18 },
  { x: -44, y: -12, sx: -138, sy: 86, z: 38, s: .9, d: .1 },
  { x: -18, y: -12, sx: 62, sy: -104, z: -40, s: .68, d: .2 },
  { x: 8, y: -12, sx: 152, sy: 78, z: 26, s: .86, d: .28 },
  { x: -44, y: 14, sx: -182, sy: 18, z: -30, s: .82, d: .16 },
  { x: -18, y: 14, sx: -44, sy: 132, z: 70, s: 1, d: .24 },
  { x: 8, y: 14, sx: 190, sy: 132, z: -20, s: .66, d: .32 },
  { x: -44, y: 40, sx: -118, sy: 154, z: 12, s: .84, d: .3 },
  { x: -44, y: 66, sx: 86, sy: 164, z: 54, s: .72, d: .38 },
]

const FLYBYS = [
  { x: -210, y: -118, s: .64, d: .16, b: 3 },
  { x: 208, y: -98, s: .52, d: .34, b: 0 },
  { x: -238, y: 22, s: 1.2, d: .52, b: 5 },
  { x: 226, y: 74, s: .82, d: .7, b: 2 },
  { x: 134, y: -148, s: .46, d: .92, b: 0 },
  { x: -120, y: 142, s: .54, d: 1.1, b: 1 },
  { x: 256, y: 6, s: .42, d: 1.28, b: 2 },
  { x: -260, y: -40, s: .48, d: 1.44, b: 1 },
]

export default function FestagLoader({ fullscreen = false, label }: Props) {
  return (
    <div className={`fl-wrap${fullscreen ? ' fl-full' : ''}`} role="status" aria-live="polite">
      <style>{`
        .fl-wrap {
          --fl-duration:7.6s;
          width:100%;
          height:100%;
          min-height:260px;
          display:flex;
          flex-direction:column;
          align-items:center;
          justify-content:center;
          gap:18px;
          position:relative;
          overflow:hidden;
          isolation:isolate;
          background:#FCFCFD;
          font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif);
          perspective:900px;
        }
        .fl-full {
          position:fixed;
          inset:0;
          z-index:9999;
        }
        .fl-wrap::before {
          content:'';
          position:absolute;
          width:min(46vw, 460px);
          height:min(46vw, 460px);
          border-radius:50%;
          background:radial-gradient(circle, rgba(124,132,150,.16), rgba(252,252,253,0) 62%);
          filter:blur(10px);
          animation:flGlow var(--fl-duration) cubic-bezier(.16,1,.3,1) infinite;
          z-index:-2;
        }
        .fl-wrap::after {
          content:'';
          position:absolute;
          inset:auto auto 17% 50%;
          width:168px;
          height:24px;
          border-radius:50%;
          transform:translateX(-50%);
          background:radial-gradient(ellipse, rgba(17,24,39,.16), rgba(17,24,39,0) 72%);
          filter:blur(12px);
          animation:flShadow var(--fl-duration) cubic-bezier(.16,1,.3,1) infinite;
          z-index:-1;
        }
        .fl-stage {
          position:relative;
          width:320px;
          height:220px;
          transform-style:preserve-3d;
          animation:flCamera var(--fl-duration) cubic-bezier(.16,1,.3,1) infinite;
        }
        .fl-mark {
          position:absolute;
          left:50%;
          top:50%;
          width:112px;
          height:144px;
          transform-style:preserve-3d;
          transform:translate(-50%, -50%) rotateY(-16deg) rotateX(8deg);
          animation:flMarkFloat var(--fl-duration) cubic-bezier(.16,1,.3,1) infinite;
        }
        .fl-core {
          position:absolute;
          inset:0;
          clip-path:polygon(0 0, 100% 0, 100% 23%, 39% 23%, 39% 43%, 82% 43%, 82% 65%, 39% 65%, 39% 100%, 0 100%);
          border-radius:18px;
          background:
            linear-gradient(118deg, rgba(255,255,255,.92) 0%, rgba(168,174,183,.72) 28%, rgba(255,255,255,.95) 42%, rgba(70,76,86,.92) 68%, rgba(238,241,244,.88) 100%);
          box-shadow:
            inset 10px 8px 18px rgba(255,255,255,.65),
            inset -16px -14px 24px rgba(12,18,28,.34),
            0 22px 42px rgba(16,24,40,.18);
          overflow:hidden;
        }
        .fl-core::before {
          content:'';
          position:absolute;
          inset:-35%;
          background:linear-gradient(105deg, transparent 38%, rgba(255,255,255,.95) 48%, transparent 58%);
          transform:translateX(-72%) rotate(4deg);
          animation:flSweep var(--fl-duration) cubic-bezier(.16,1,.3,1) infinite;
        }
        .fl-core::after {
          content:'';
          position:absolute;
          inset:0;
          background:linear-gradient(155deg, rgba(255,255,255,.48), transparent 34%, rgba(0,0,0,.15) 100%);
          mix-blend-mode:screen;
          opacity:.7;
        }
        .fl-pixel,
        .fl-flyby {
          position:absolute;
          left:50%;
          top:50%;
          width:18px;
          height:18px;
          transform-style:preserve-3d;
          will-change:transform, opacity, filter;
        }
        .fl-pixel {
          animation:flPixelAssemble var(--fl-duration) cubic-bezier(.16,1,.3,1) infinite;
          animation-delay:calc(var(--d) * 1s);
        }
        .fl-flyby {
          animation:flFlyby var(--fl-duration) cubic-bezier(.16,1,.3,1) infinite;
          animation-delay:calc(var(--d) * 1s);
          filter:blur(calc(var(--b) * 1px));
        }
        .fl-cube {
          position:absolute;
          inset:0;
          border-radius:5px;
          border:2px solid rgba(42,47,55,.72);
          background:
            linear-gradient(145deg, rgba(255,255,255,.98), rgba(117,124,134,.38) 48%, rgba(17,24,39,.88)),
            radial-gradient(circle at 28% 22%, rgba(255,255,255,.95), transparent 32%);
          box-shadow:
            inset 3px 3px 5px rgba(255,255,255,.88),
            inset -4px -4px 7px rgba(8,13,22,.48),
            0 9px 18px rgba(15,23,42,.16);
        }
        .fl-cube::before {
          content:'';
          position:absolute;
          inset:4px;
          border-radius:3px;
          border:1px solid rgba(255,255,255,.72);
          background:linear-gradient(145deg, rgba(12,18,28,.76), rgba(255,255,255,.18));
          box-shadow:inset -2px -2px 4px rgba(255,255,255,.18);
        }
        .fl-cube::after {
          content:'';
          position:absolute;
          right:-5px;
          top:3px;
          width:6px;
          height:13px;
          border-radius:0 4px 4px 0;
          background:linear-gradient(90deg, rgba(12,18,28,.72), rgba(245,247,250,.72));
          transform:skewY(-18deg);
          filter:brightness(1.05);
        }
        .fl-label {
          font-size:12px;
          font-weight:500;
          letter-spacing:.02em;
          color:rgba(78,85,103,.68);
          animation:flLabel var(--fl-duration) ease-in-out infinite;
        }
        @keyframes flCamera {
          0%,100% { transform:rotateX(0deg) rotateY(0deg) translateY(0); }
          24% { transform:rotateX(4deg) rotateY(-8deg) translateY(-2px); }
          54% { transform:rotateX(1deg) rotateY(8deg) translateY(1px); }
          76% { transform:rotateX(-2deg) rotateY(4deg) translateY(-1px); }
        }
        @keyframes flMarkFloat {
          0%,12% { opacity:0; transform:translate(-50%, -50%) scale(.8) rotateY(-58deg) rotateX(12deg); filter:blur(12px); }
          30% { opacity:.96; transform:translate(-50%, -50%) scale(.98) rotateY(-24deg) rotateX(9deg); filter:blur(.4px); }
          45% { opacity:1; transform:translate(-50%, -50%) scale(1) rotateY(9deg) rotateX(6deg); filter:blur(0); }
          70% { opacity:1; transform:translate(-50%, -50%) scale(1.026) rotateY(6deg) rotateX(5deg); filter:brightness(1.1); }
          82% { opacity:1; transform:translate(-50%, -50%) scale(1.005) rotateY(12deg) rotateX(3deg); filter:brightness(1.02); }
          92% { opacity:.38; transform:translate(-50%, -50%) scale(.94) rotateY(42deg) rotateX(-4deg); filter:blur(2px); }
          100% { opacity:0; transform:translate(-50%, -50%) scale(.78) rotateY(74deg) rotateX(-10deg); filter:blur(13px); }
        }
        @keyframes flPixelAssemble {
          0% { opacity:0; transform:translate3d(calc(var(--sx) * 1px), calc(var(--sy) * 1px), calc(var(--z) * 1px)) rotateX(68deg) rotateY(110deg) scale(calc(var(--s) * .72)); filter:blur(5px); }
          20% { opacity:.76; transform:translate3d(calc(var(--sx) * .42px), calc(var(--sy) * .42px), calc(var(--z) * .7px)) rotateX(38deg) rotateY(64deg) scale(var(--s)); filter:blur(1.5px); }
          38%,78% { opacity:1; transform:translate3d(calc(var(--x) * 1px), calc(var(--y) * 1px), 42px) rotateX(12deg) rotateY(-24deg) scale(var(--s)); filter:blur(0); }
          90% { opacity:.7; transform:translate3d(calc(var(--sx) * .36px), calc(var(--sy) * .36px), calc(var(--z) * .55px)) rotateX(-34deg) rotateY(44deg) scale(calc(var(--s) * .86)); filter:blur(1.3px); }
          100% { opacity:0; transform:translate3d(calc(var(--sx) * 1px), calc(var(--sy) * 1px), calc(var(--z) * 1px)) rotateX(-70deg) rotateY(-120deg) scale(calc(var(--s) * .62)); filter:blur(7px); }
        }
        @keyframes flFlyby {
          0%,12% { opacity:0; transform:translate3d(calc(var(--x) * 1px), calc(var(--y) * 1px), -120px) rotateX(70deg) rotateY(40deg) scale(calc(var(--s) * .55)); }
          34% { opacity:.72; transform:translate3d(calc(var(--x) * -.18px), calc(var(--y) * .18px), 72px) rotateX(10deg) rotateY(96deg) scale(var(--s)); }
          78% { opacity:.5; transform:translate3d(calc(var(--x) * .18px), calc(var(--y) * -.12px), 130px) rotateX(-18deg) rotateY(180deg) scale(calc(var(--s) * 1.15)); }
          100% { opacity:0; transform:translate3d(calc(var(--x) * -1px), calc(var(--y) * -1px), -90px) rotateX(-80deg) rotateY(260deg) scale(calc(var(--s) * .5)); }
        }
        @keyframes flSweep {
          0%,54% { transform:translateX(-78%) rotate(4deg); opacity:0; }
          62% { opacity:1; }
          74%,100% { transform:translateX(76%) rotate(4deg); opacity:0; }
        }
        @keyframes flGlow {
          0%,100% { opacity:.42; transform:scale(.88); }
          52% { opacity:1; transform:scale(1.02); }
          82% { opacity:.72; transform:scale(.96); }
        }
        @keyframes flShadow {
          0%,18%,100% { opacity:0; transform:translateX(-50%) scale(.68); }
          46%,82% { opacity:.88; transform:translateX(-50%) scale(1); }
        }
        @keyframes flLabel {
          0%,12%,94%,100% { opacity:.28; }
          42%,82% { opacity:.74; }
        }
        @media (prefers-reduced-motion: reduce) {
          .fl-stage,
          .fl-mark,
          .fl-core::before,
          .fl-pixel,
          .fl-flyby,
          .fl-wrap::before,
          .fl-wrap::after,
          .fl-label {
            animation:none !important;
          }
          .fl-mark { opacity:1; filter:none; transform:translate(-50%, -50%) rotateY(-12deg) rotateX(8deg); }
          .fl-pixel { opacity:1; transform:translate3d(calc(var(--x) * 1px), calc(var(--y) * 1px), 42px) scale(var(--s)); }
        }
      `}</style>

      <div className="fl-stage" aria-hidden="true">
        <div className="fl-mark">
          <span className="fl-core" />
        </div>
        {PIXELS.map((pixel, index) => (
          <span
            key={`pixel-${index}`}
            className="fl-pixel"
            style={{
              ['--x' as string]: pixel.x,
              ['--y' as string]: pixel.y,
              ['--sx' as string]: pixel.sx,
              ['--sy' as string]: pixel.sy,
              ['--z' as string]: pixel.z,
              ['--s' as string]: pixel.s,
              ['--d' as string]: pixel.d,
            }}
          >
            <span className="fl-cube" />
          </span>
        ))}
        {FLYBYS.map((pixel, index) => (
          <span
            key={`flyby-${index}`}
            className="fl-flyby"
            style={{
              ['--x' as string]: pixel.x,
              ['--y' as string]: pixel.y,
              ['--s' as string]: pixel.s,
              ['--d' as string]: pixel.d,
              ['--b' as string]: pixel.b,
            }}
          >
            <span className="fl-cube" />
          </span>
        ))}
      </div>
      {label && <span className="fl-label">{label}</span>}
    </div>
  )
}
