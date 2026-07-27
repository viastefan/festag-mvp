type AuthBrandLogoProps = {
  className?: string
  size?: 'desktop' | 'mobile' | 'compact' | 'mini'
}

/** Auth header mark — true cutout of festag-mark, flat with a whisper of depth. */
export default function AuthBrandLogo({ className = '', size = 'desktop' }: AuthBrandLogoProps) {
  return (
    <>
      <span className={`auth-brand-logo ${size} ${className}`} aria-label="Festag" role="img" />
      <style jsx>{`
        .auth-brand-logo {
          display:inline-block;
          position:relative;
          flex-shrink:0;
          line-height:0;
          background:transparent;
          overflow:visible;
        }
        .auth-brand-logo.desktop { width:70px; height:70px; }
        .auth-brand-logo.mobile { width:62px; height:62px; }
        .auth-brand-logo.compact { width:40px; height:40px; }
        .auth-brand-logo.mini { width:32px; height:32px; }
        .auth-brand-logo::before {
          content:'';
          display:block;
          width:100%;
          height:100%;
          -webkit-mask-image:url(/brand/festag-mark.png?v=20260727-cutout);
          -webkit-mask-size:contain;
          -webkit-mask-repeat:no-repeat;
          -webkit-mask-position:center;
          -webkit-mask-mode:alpha;
          mask-image:url(/brand/festag-mark.png?v=20260727-cutout);
          mask-size:contain;
          mask-repeat:no-repeat;
          mask-position:center;
          mask-mode:alpha;
          background:linear-gradient(160deg, #3a3a40 0%, #1e1e20 58%, #2a2a2e 100%);
          filter:
            drop-shadow(0 0.5px 0 rgba(255,255,255,0.28))
            drop-shadow(0 1px 2px rgba(30,30,32,0.16));
        }
        :global(.log-root[data-theme="dark"]) .auth-brand-logo::before,
        :global(.al-root[data-theme="dark"]) .auth-brand-logo::before,
        :global(.reg-root[data-theme="dark"]) .auth-brand-logo::before,
        :global(.dl-root[data-theme="dark"]) .auth-brand-logo::before {
          background:linear-gradient(160deg, #f7f8fa 0%, #dfe3ea 52%, #f0f2f5 100%);
          filter:
            drop-shadow(0 -0.4px 0 rgba(255,255,255,0.35))
            drop-shadow(0 1.5px 3px rgba(0,0,0,0.45));
        }
      `}</style>
    </>
  )
}
