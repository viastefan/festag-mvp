type AuthBrandLogoProps = {
  className?: string
  size?: 'desktop' | 'mobile' | 'compact' | 'mini'
}

export default function AuthBrandLogo({ className = '', size = 'desktop' }: AuthBrandLogoProps) {
  return (
    <>
      <span className={`auth-brand-logo ${size} ${className}`} aria-label="Festag" role="img">
        <img className="auth-brand-logo-light" src="/brand/auth-logo-light.png" alt="" aria-hidden="true" />
        <img className="auth-brand-logo-dark" src="/brand/auth-logo-dark.png" alt="" aria-hidden="true" />
      </span>
      <style jsx>{`
        .auth-brand-logo {
          display:inline-grid;
          place-items:center;
          position:relative;
          overflow:hidden;
          background:transparent;
          border-radius:18px;
          flex-shrink:0;
          line-height:0;
          contain:paint;
          isolation:isolate;
        }
        .auth-brand-logo.desktop {
          width:70px;
          height:70px;
        }
        .auth-brand-logo.mobile {
          width:62px;
          height:62px;
          border-radius:16px;
        }
        .auth-brand-logo.compact {
          width:40px;
          height:40px;
          border-radius:10px;
        }
        .auth-brand-logo.mini {
          width:32px;
          height:32px;
          border-radius:8px;
        }
        .auth-brand-logo img {
          grid-area:1 / 1;
          width:100%;
          height:100%;
          display:block;
          object-fit:contain;
          object-position:center;
          user-select:none;
          pointer-events:none;
        }
        .auth-brand-logo-dark {
          display:none;
          transform:scale(1.08);
          transform-origin:center;
        }
        :global([data-theme="dark"]) .auth-brand-logo-light,
        :global(.log-root[data-theme="dark"]) .auth-brand-logo-light,
        :global(.al-root[data-theme="dark"]) .auth-brand-logo-light,
        :global(.reg-root[data-theme="dark"]) .auth-brand-logo-light,
        :global(.dl-root[data-theme="dark"]) .auth-brand-logo-light {
          display:none;
        }
        :global([data-theme="dark"]) .auth-brand-logo-dark,
        :global(.log-root[data-theme="dark"]) .auth-brand-logo-dark,
        :global(.al-root[data-theme="dark"]) .auth-brand-logo-dark,
        :global(.reg-root[data-theme="dark"]) .auth-brand-logo-dark,
        :global(.dl-root[data-theme="dark"]) .auth-brand-logo-dark {
          display:block;
        }
      `}</style>
    </>
  )
}
