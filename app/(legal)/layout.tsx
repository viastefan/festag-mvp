import Link from 'next/link'

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', color:'var(--text)' }}>
      <header style={{
        position:'sticky', top:0, zIndex:50,
        background:'var(--bg)', borderBottom:'1px solid var(--border)',
        padding:'14px 24px', display:'flex', alignItems:'center', justifyContent:'space-between',
      }}>
        <Link href="/dashboard" style={{ textDecoration:'none', display:'flex', alignItems:'center' }}>
          <img src="/brand/logo.svg" alt="festag" style={{ height:18, filter:'var(--logo-filter,none)' }}/>
        </Link>
        <nav style={{ display:'flex', gap:16, fontSize:13 }}>
          {[
            { href:'/impressum',   label:'Impressum' },
            { href:'/datenschutz', label:'Datenschutz' },
            { href:'/agb',         label:'AGB' },
            { href:'/widerruf',    label:'Widerruf' },
          ].map(l => (
            <Link key={l.href} href={l.href} style={{ color:'var(--text-secondary)', textDecoration:'none', fontWeight:500 }}>
              {l.label}
            </Link>
          ))}
        </nav>
      </header>

      <main style={{ maxWidth:760, margin:'0 auto', padding:'40px 24px 80px' }}>
        {children}
      </main>

      <footer style={{ borderTop:'1px solid var(--border)', padding:'24px', textAlign:'center', color:'var(--text-muted)', fontSize:12 }}>
        <p style={{ margin:0, lineHeight:1.6 }}>
          <strong style={{ color:'var(--text-secondary)' }}>festag</strong> — Inhaber:
          Stefan Dirnberger, Lindenstraße 15, 84036 Kumhausen.
        </p>
        <p style={{ margin:'6px 0 0' }}>
          © {new Date().getFullYear()} Festag · Stefan Dirnberger · alle Rechte vorbehalten
        </p>
      </footer>
    </div>
  )
}
