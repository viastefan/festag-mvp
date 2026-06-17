'use client'

import Link from 'next/link'
import { ArrowUpRight, CalendarBlank, MagnifyingGlass, Moon, SquaresFour } from '@phosphor-icons/react'

type Article = {
  id: string
  title: string
  summary: string
  date: string
  category: string
  section: string
  tone: 'blue' | 'green' | 'amber' | 'rose' | 'primary' | 'slate' | 'cyan' | 'paper'
}

const sections = [
  { id: 'highlights', label: 'Highlights' },
  { id: 'briefings', label: 'Projektbriefings' },
  { id: 'voice', label: 'Voice Reports' },
  { id: 'delivery', label: 'Delivery OS' },
  { id: 'workspace', label: 'Workspace' },
  { id: 'security', label: 'Sicherheit' },
  { id: 'billing', label: 'Billing' },
  { id: 'developer', label: 'Developer' },
]

const articles: Article[] = [
  { id:'tagro-voice-reports', title:'Tagro Voice Reports', summary:'Projektstände als ruhiges Executive Update hören, inklusive Transkript und Datenbasis.', date:'15. Mai 2026', category:'Voice', section:'voice', tone:'primary' },
  { id:'morning-report', title:'Morning Report für Entscheider', summary:'Automatische tägliche Briefings als E-Mail, Voice Report oder beides vorbereitet.', date:'15. Mai 2026', category:'Briefings', section:'voice', tone:'amber' },
  { id:'project-briefings-core', title:'Projektbriefings werden Kernsystem', summary:'Statusberichte werden zu verständlichen Projektbriefings für Kontrolle statt Ticket-Chaos.', date:'15. Mai 2026', category:'Briefings', section:'briefings', tone:'blue' },
  { id:'voice-transcripts', title:'Jeder Voice Report hat ein Transkript', summary:'Audio, Textstatus, Datenbasis und Zustellstatus gehören jetzt zu einem prüfbaren Snapshot.', date:'15. Mai 2026', category:'Voice', section:'voice', tone:'green' },
  { id:'dashboard-control-system', title:'Dashboard als Kontrollsystem', summary:'Festag zeigt, was gebaut wurde, was blockiert und welche Entscheidung offen ist.', date:'14. Mai 2026', category:'Dashboard', section:'highlights', tone:'slate' },
  { id:'delivery-without-blackbox', title:'Softwareentwicklung ohne Blackbox', summary:'Neue Produktlogik für KMUs und Unternehmer, die Software bauen lassen wollen.', date:'14. Mai 2026', category:'Positionierung', section:'delivery', tone:'paper' },
  { id:'guided-project-intake', title:'Geführte Projektanalyse', summary:'Tagro fragt nicht nur nach einer Idee, sondern hilft beim Herausfinden des echten Bedarfs.', date:'14. Mai 2026', category:'Tagro', section:'delivery', tone:'rose' },
  { id:'client-dashboard-refresh', title:'Client Dashboard Refresh', summary:'Ruhigere Flächen, klarere Prioritäten und bessere Projektkarten für Kunden.', date:'13. Mai 2026', category:'Dashboard', section:'workspace', tone:'cyan' },
  { id:'sticky-task-headers', title:'Fixierte Task-Header', summary:'Filter, Titel und Tabellenkopf bleiben beim Scrollen sichtbar.', date:'13. Mai 2026', category:'Tasks', section:'workspace', tone:'blue' },
  { id:'project-table-scroll', title:'Projektlisten mit ruhigem Scroll', summary:'Projektseiten folgen dem gleichen geordneten Scrollmodell wie Tasks.', date:'13. Mai 2026', category:'Projects', section:'workspace', tone:'green' },
  { id:'sidebar-compact', title:'Kompaktere Sidebar', summary:'Navigation, Profilname und Controls wurden dichter und klarer ausgerichtet.', date:'12. Mai 2026', category:'Navigation', section:'workspace', tone:'slate' },
  { id:'sidebar-teams-return', title:'Teams zurück im Workspace', summary:'Teams bleiben als eigener Arbeitsbereich sichtbar und getrennt von Projektlisten.', date:'12. Mai 2026', category:'Teams', section:'workspace', tone:'amber' },
  { id:'voice-provider-layer', title:'Austauschbare Voice Provider', summary:'OpenAI, ElevenLabs und Cartesia sind als Provider-Schicht vorbereitet.', date:'12. Mai 2026', category:'Architecture', section:'developer', tone:'primary' },
  { id:'audio-cost-awareness', title:'API-Kosten bewusst eingebaut', summary:'Voice Reports werden nicht als unbegrenztes Free-Feature behandelt.', date:'12. Mai 2026', category:'Billing', section:'billing', tone:'paper' },
  { id:'briefing-billing-card', title:'Briefing & Voice im Planbereich', summary:'Settings zeigen, welche Briefing- und Audiofunktionen enthalten oder Premium sind.', date:'12. Mai 2026', category:'Billing', section:'billing', tone:'green' },
  { id:'pwa-install-reminder', title:'App-Install Hinweis verbessert', summary:'Das Install-Popup erscheint ruhiger und nur sinnvoll im Nutzungsfluss.', date:'11. Mai 2026', category:'App', section:'workspace', tone:'rose' },
  { id:'login-dach-note', title:'DACH-Hinweis im Login', summary:'Festag kommuniziert den Fokus auf Deutschland, Österreich und die Schweiz.', date:'11. Mai 2026', category:'Auth', section:'highlights', tone:'slate' },
  { id:'login-vertical-balance', title:'Login vertikal zentriert', summary:'Login- und Register-Frames sitzen jetzt optisch ruhiger im Viewport.', date:'11. Mai 2026', category:'Auth', section:'highlights', tone:'blue' },
  { id:'magic-link-callback', title:'Magic-Link Screen angeglichen', summary:'Der Bestätigungsscreen folgt dem Login-Design statt isoliert zu wirken.', date:'11. Mai 2026', category:'Auth', section:'security', tone:'paper' },
  { id:'developer-login-align', title:'Developer Login konsistent', summary:'Dev-Zugang übernimmt Breite, Button-Logik und Input-Verhalten aus dem Client Login.', date:'10. Mai 2026', category:'Dev', section:'developer', tone:'cyan' },
  { id:'lightmode-contrast', title:'Lightmode-Kontrast verbessert', summary:'Hintergrund und Inhaltsboxen trennen sich klarer, ohne hart zu wirken.', date:'10. Mai 2026', category:'Design', section:'highlights', tone:'green' },
  { id:'button-radius-system', title:'32px Button-System', summary:'Buttons, Pills und Chips folgen jetzt einer weicheren globalen Rundung.', date:'10. Mai 2026', category:'Design', section:'highlights', tone:'primary' },
  { id:'aeonik-regular', title:'Aeonik Regular für UI-Texte', summary:'Viele T1- und Body-Texte wirken leichter und weniger gedrückt.', date:'9. Mai 2026', category:'Typography', section:'highlights', tone:'slate' },
  { id:'cursor-language', title:'Ruhigere Cursor-Sprache', summary:'Dashboard-Klickflächen behalten auf Desktop stärker den normalen Pfeil.', date:'9. Mai 2026', category:'UX', section:'workspace', tone:'paper' },
  { id:'settings-layout', title:'Settings besser skaliert', summary:'Profil, Sicherheit, Erscheinung und Billing bekommen mehr Abstand und Struktur.', date:'9. Mai 2026', category:'Settings', section:'workspace', tone:'amber' },
  { id:'avatar-storage-rls', title:'Avatar Storage gehärtet', summary:'Storage-Regeln für Avatar-Dateien sind auf Nutzerordner ausgelegt.', date:'8. Mai 2026', category:'Security', section:'security', tone:'green' },
  { id:'tagro-memory', title:'Tagro Memory vorbereitet', summary:'Account-bezogene Erinnerungsschicht für bessere Antworten im Projektkontext.', date:'8. Mai 2026', category:'Tagro', section:'developer', tone:'blue' },
  { id:'inbox-phase-two', title:'Inbox Phase 2 Schema', summary:'Threads, Items und System-Events werden für strukturierte Kundenkommunikation vorbereitet.', date:'8. Mai 2026', category:'Inbox', section:'developer', tone:'rose' },
  { id:'system-events', title:'System-Events für Garantien und Rechnungen', summary:'Festag-Ereignisse können automatisch in Inbox und Briefings gespiegelt werden.', date:'8. Mai 2026', category:'Automation', section:'developer', tone:'cyan' },
  { id:'task-suggestions-inline', title:'Task-Vorschläge inline', summary:'Aufgabenvorschläge öffnen als Inhaltsbereich statt als hartes Modal.', date:'7. Mai 2026', category:'Tasks', section:'workspace', tone:'primary' },
  { id:'task-suggestion-logic', title:'Tagro prüft Task-Vorschläge', summary:'Kundenideen werden erst übersetzt und geprüft, bevor sie in den Dev-Workflow gehen.', date:'7. Mai 2026', category:'Tasks', section:'delivery', tone:'green' },
  { id:'agency-os-direction', title:'Agency OS bleibt zweite Phase', summary:'Agenturen bleiben Zielgruppe, aber Delivery für nicht-technische Unternehmen führt.', date:'7. Mai 2026', category:'Strategy', section:'delivery', tone:'paper' },
  { id:'kmus-focus', title:'Fokus auf KMUs ohne starke IT', summary:'Festag richtet sich auf Unternehmen aus, die Kontrolle über Software brauchen.', date:'6. Mai 2026', category:'Strategy', section:'delivery', tone:'amber' },
  { id:'delivery-care-plans', title:'Care-Pläne für laufende Betreuung', summary:'Briefings, Weiterentwicklung und Kontrolle werden Grundlage für wiederkehrende Umsätze.', date:'6. Mai 2026', category:'Billing', section:'billing', tone:'blue' },
  { id:'weekly-executive-summary', title:'Weekly Executive Summary', summary:'Wöchentliche Entscheider-Zusammenfassungen sind als Premium-Format vorgesehen.', date:'6. Mai 2026', category:'Briefings', section:'briefings', tone:'rose' },
  { id:'delivery-alerts', title:'Delivery Alerts', summary:'Kurze Hinweise bei Blockern, offenen Entscheidungen oder Meilensteinrisiken.', date:'6. Mai 2026', category:'Briefings', section:'briefings', tone:'cyan' },
  { id:'email-design', title:'Magic-Link E-Mail Design', summary:'Login-Mails wirken stärker wie Festag und weniger wie generische Systemmails.', date:'5. Mai 2026', category:'Email', section:'security', tone:'primary' },
  { id:'mobile-webapp-container', title:'Mobile Webapp Container sichtbarer', summary:'Register- und Login-Frames heben sich auf mobilen Screens stärker vom Hintergrund ab.', date:'5. Mai 2026', category:'Mobile', section:'highlights', tone:'green' },
  { id:'smooth-settings-transition', title:'Smooth Settings Transition', summary:'Wechsel zwischen Dashboard und Settings wird weicher und weniger ruckelig.', date:'5. Mai 2026', category:'Motion', section:'workspace', tone:'slate' },
  { id:'dashboard-entry-animation', title:'Dashboard Entry Animation', summary:'Nach Onboarding baut sich das Dashboard künftig kontrolliert und hochwertig auf.', date:'5. Mai 2026', category:'Motion', section:'workspace', tone:'amber' },
]

const featured = articles.slice(0, 4)
const categoryGroups = sections.map((section) => ({ ...section, articles: articles.filter((article) => article.section === section.id) }))

function Visual({ tone, index }: { tone: Article['tone']; index: number }) {
  return (
    <div className={`wn-visual tone-${tone}`} aria-hidden="true">
      <div className="wn-grid" />
      <div className="wn-orbit wn-orbit-a" />
      <div className="wn-orbit wn-orbit-b" />
      <div className="wn-panel-mini wn-panel-one">
        <span />
        <strong>{index % 3 === 0 ? 'report.ready' : index % 3 === 1 ? 'scope.map' : 'delivery.sync'}</strong>
        <em>{index % 2 === 0 ? 'verified' : 'queued'}</em>
      </div>
      <div className="wn-panel-mini wn-panel-two">
        <i />
        <b>{String(index + 7).padStart(2, '0')}</b>
      </div>
      <div className="wn-signal" />
    </div>
  )
}

export default function WhatsNewPage() {
  return (
    <main className="wn-root" id="top">
      <style>{`
        .wn-root { min-height:100dvh; background:#030303; color:#ECECE8; font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif); overflow-x:hidden; }
        .wn-topbar { position:sticky; top:0; z-index:30; height:76px; display:flex; align-items:center; justify-content:space-between; padding:0 32px; border-bottom:1px solid rgba(255,255,255,.08); background:rgba(3,3,3,.78); backdrop-filter:blur(20px) saturate(140%); }
        .wn-brand { display:flex; align-items:center; gap:12px; color:#fff; text-decoration:none; font-size:24px; font-weight:760; letter-spacing:-.055em; }
        .wn-brand-mark { width:28px; height:28px; border-radius:9px; background:linear-gradient(145deg,#F7F4EA,#7D869E); color:#050505; display:grid; place-items:center; font-size:14px; font-weight:800; letter-spacing:-.04em; }
        .wn-nav { display:flex; align-items:center; gap:22px; color:#B7B7B1; font-size:13.5px; font-weight:520; }
        .wn-nav a { color:inherit; text-decoration:none; }
        .wn-actions { display:flex; align-items:center; gap:10px; }
        .wn-search { height:36px; min-width:230px; display:flex; align-items:center; justify-content:space-between; gap:12px; padding:0 13px 0 15px; border:1px solid rgba(255,255,255,.09); border-radius:32px; background:#1E1E1D; color:#898984; font-size:13px; }
        .wn-login { height:36px; display:inline-flex; align-items:center; gap:8px; padding:0 15px; border:1px solid rgba(255,255,255,.16); border-radius:32px; background:#ECECE8; color:#070707; font-size:13px; font-weight:700; text-decoration:none; }
        .wn-theme { width:36px; height:36px; border-radius:32px; display:grid; place-items:center; color:#B7B7B1; border:0; background:transparent; }
        .wn-shell { display:grid; grid-template-columns:250px minmax(0,1fr) 210px; gap:48px; max-width:1680px; margin:0 auto; padding:52px 36px 120px; }
        .wn-side { position:sticky; top:112px; align-self:start; height:calc(100dvh - 132px); overflow:auto; padding-right:12px; }
        .wn-side h2 { margin:0 0 17px; color:#F2F2EF; font-size:13px; font-weight:720; letter-spacing:-.01em; }
        .wn-side a { display:flex; align-items:center; justify-content:space-between; min-height:32px; padding:3px 0; color:#A1A19B; text-decoration:none; font-size:13.5px; font-weight:450; }
        .wn-side a:hover { color:#fff; }
        .wn-side small { color:#595955; font-size:11px; }
        .wn-main { min-width:0; }
        .wn-hero { min-height:280px; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:44px 0 72px; }
        .wn-hero h1 { margin:0; color:#F4F4F0; font-size:clamp(42px,5vw,76px); line-height:.95; letter-spacing:-.075em; font-weight:760; }
        .wn-hero p { margin:18px 0 0; max-width:760px; color:#A6A6A0; font-size:clamp(17px,2vw,24px); line-height:1.36; letter-spacing:-.03em; font-weight:400; }
        .wn-featured { display:grid; gap:22px; margin-bottom:70px; }
        .wn-feature-primary { display:grid; grid-template-columns:150px minmax(0,1fr); gap:28px; min-height:164px; padding:28px; border:1px solid rgba(255,255,255,.16); border-radius:24px; background:linear-gradient(180deg,rgba(255,255,255,.13),rgba(255,255,255,.08)); box-shadow:0 36px 110px rgba(0,0,0,.38); text-decoration:none; color:inherit; }
        .wn-feature-primary .wn-visual { height:108px; border-radius:18px; }
        .wn-feature-primary h2 { margin:3px 0 10px; color:#F3F3EF; font-size:28px; line-height:1.12; letter-spacing:-.045em; font-weight:720; }
        .wn-feature-primary p { margin:0; color:#B9B9B3; font-size:17px; line-height:1.45; max-width:880px; }
        .wn-feature-links { display:flex; gap:28px; margin-top:22px; color:#E7E7E2; font-size:13.5px; font-weight:700; }
        .wn-card-row { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:20px; }
        .wn-small-card { min-height:260px; display:flex; flex-direction:column; justify-content:space-between; padding:24px; border-radius:20px; border:1px solid rgba(255,255,255,.08); background:#181817; text-decoration:none; color:inherit; transition:transform .18s ease, border-color .18s ease, background .18s ease; }
        .wn-small-card:hover, .wn-article:hover { transform:translateY(-2px); border-color:rgba(255,255,255,.2); background:#1D1D1C; }
        .wn-small-card h3 { margin:18px 0 8px; color:#F1F1EE; font-size:22px; line-height:1.1; letter-spacing:-.045em; }
        .wn-small-card p { margin:0; color:#A9A9A3; font-size:15px; line-height:1.45; }
        .wn-section { scroll-margin-top:100px; margin:0 0 66px; }
        .wn-section-head { display:flex; align-items:center; justify-content:space-between; margin:0 0 24px; }
        .wn-section-head h2 { color:#F2F2EF; margin:0; font-size:27px; letter-spacing:-.045em; line-height:1; }
        .wn-section-head a { color:#8F8F89; text-decoration:none; font-size:13.5px; }
        .wn-article { display:grid; grid-template-columns:270px minmax(0,1fr); gap:34px; align-items:center; padding:20px 0; border-top:1px solid rgba(255,255,255,.07); text-decoration:none; color:inherit; transition:transform .18s ease, background .18s ease, border-color .18s ease; }
        .wn-article:first-of-type { border-top:0; }
        .wn-article .wn-visual { height:144px; }
        .wn-article h3 { margin:0 0 8px; color:#EDEDE9; font-size:22px; letter-spacing:-.035em; line-height:1.15; font-weight:650; }
        .wn-article p { margin:0; color:#A9A9A3; font-size:16px; line-height:1.45; max-width:760px; font-weight:400; }
        .wn-meta { display:flex; align-items:center; gap:18px; margin-top:28px; color:#8A8A85; font-size:13.5px; font-weight:450; }
        .wn-right { position:sticky; top:112px; align-self:start; color:#777772; border-left:1px solid rgba(255,255,255,.16); padding-left:24px; }
        .wn-right a { display:block; color:#8E8E88; text-decoration:none; font-size:13px; line-height:1.35; margin:0 0 15px; }
        .wn-right a:first-child { color:#E7E7E2; }
        .wn-visual { position:relative; overflow:hidden; border-radius:18px; min-height:92px; background:#222; isolation:isolate; }
        .wn-visual::before { content:''; position:absolute; inset:-30%; background:radial-gradient(circle at 28% 22%, rgba(255,255,255,.52), transparent 24%), radial-gradient(circle at 72% 70%, rgba(255,255,255,.24), transparent 26%); opacity:.8; }
        .wn-grid { position:absolute; inset:0; background-image:radial-gradient(rgba(255,255,255,.22) 1px, transparent 1px); background-size:12px 12px; mask-image:linear-gradient(90deg,transparent,black 24%,black 70%,transparent); opacity:.32; }
        .wn-orbit { position:absolute; border:1px solid rgba(255,255,255,.23); border-radius:999px; inset:22% 30%; opacity:.75; }
        .wn-orbit-b { inset:10% 20%; opacity:.28; }
        .wn-panel-mini { position:absolute; display:flex; align-items:center; gap:7px; min-height:32px; padding:0 10px; border:1px solid rgba(255,255,255,.22); border-radius:10px; background:rgba(255,255,255,.12); color:white; backdrop-filter:blur(10px); box-shadow:0 14px 40px rgba(0,0,0,.12); }
        .wn-panel-mini span { width:7px; height:7px; border-radius:50%; background:rgba(255,255,255,.78); }
        .wn-panel-mini strong { font-size:10px; font-weight:700; letter-spacing:.02em; }
        .wn-panel-mini em { color:rgba(255,255,255,.7); font-size:9px; font-style:normal; }
        .wn-panel-one { left:22%; top:32%; }
        .wn-panel-two { right:18%; bottom:24%; min-width:50px; justify-content:center; }
        .wn-panel-two i { width:13px; height:13px; border-radius:5px; border:1px solid rgba(255,255,255,.6); }
        .wn-panel-two b { font-size:13px; }
        .wn-signal { position:absolute; left:50%; top:50%; width:46px; height:46px; transform:translate(-50%,-50%); border-radius:50%; border:1px solid rgba(255,255,255,.3); box-shadow:0 0 0 18px rgba(255,255,255,.06), 0 0 0 36px rgba(255,255,255,.035); }
        .tone-blue { background:linear-gradient(135deg,#1D55EA,#88D3FF 58%,#E7E5CE); }
        .tone-green { background:linear-gradient(135deg,#0B6E52,#A8DAB6 58%,#DDE4B3); }
        .tone-amber { background:linear-gradient(135deg,#A55B1A,#F3B26D 58%,#F0E4C2); }
        .tone-rose { background:linear-gradient(135deg,#CD5268,#F6A98C 55%,#d8c8c0); }
        .tone-primary { background:linear-gradient(135deg,#6a738c,#8790a5 55%,#c7cedb); }
        .tone-slate { background:linear-gradient(135deg,#1A1D22,#667085 58%,#C8D0D4); }
        .tone-cyan { background:linear-gradient(135deg,#046A7C,#8DD9E8 55%,#D9F0D1); }
        .tone-paper { background:linear-gradient(135deg,#6D6657,#E4D5B4 58%,#F6F3E8); }
        @media(max-width:1180px){ .wn-shell{grid-template-columns:210px minmax(0,1fr); gap:34px}.wn-right{display:none}.wn-card-row{grid-template-columns:1fr}.wn-feature-primary{grid-template-columns:1fr}.wn-feature-primary .wn-visual{height:160px}.wn-article{grid-template-columns:210px minmax(0,1fr)} }
        @media(max-width:820px){ .wn-topbar{height:auto; padding:18px 20px; flex-wrap:wrap; gap:14px}.wn-nav,.wn-search{display:none}.wn-shell{display:block; padding:36px 20px 90px}.wn-side{position:relative; top:auto; height:auto; display:flex; gap:14px; overflow:auto; padding:0 0 22px; margin-bottom:24px; border-bottom:1px solid rgba(255,255,255,.08)}.wn-side h2{display:none}.wn-side a{white-space:nowrap; min-height:34px; padding:0 13px; border:1px solid rgba(255,255,255,.1); border-radius:32px}.wn-side small{display:none}.wn-hero{align-items:flex-start;text-align:left;min-height:210px;padding:20px 0 42px}.wn-hero h1{font-size:42px}.wn-hero p{font-size:18px}.wn-feature-primary{padding:18px;border-radius:20px}.wn-feature-primary h2{font-size:24px}.wn-feature-links{flex-direction:column;gap:10px}.wn-article{grid-template-columns:1fr;gap:16px;padding:24px 0}.wn-article .wn-visual{height:178px}.wn-meta{margin-top:18px}.wn-section-head h2{font-size:24px} }
      `}</style>

      <header className="wn-topbar">
        <Link href="/register" className="wn-brand"><span className="wn-brand-mark">f</span> Festag</Link>
        <nav className="wn-nav" aria-label="Hauptnavigation">
          <Link href="/whats-new">What’s new</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/login">Login</Link>
          <Link href="/dev/login">Developer</Link>
        </nav>
        <div className="wn-actions">
          <div className="wn-search">Updates suchen <MagnifyingGlass size={16} /></div>
          <Link className="wn-login" href="/login">App öffnen <ArrowUpRight size={15} /></Link>
          <button className="wn-theme" type="button" aria-label="Theme"><Moon size={18} /></button>
        </div>
      </header>

      <div className="wn-shell">
        <aside className="wn-side" aria-label="What’s new Menü">
          <h2>Festag Updates</h2>
          {categoryGroups.map((section) => (
            <a key={section.id} href={`#${section.id}`}><span>{section.label}</span><small>{section.articles.length}</small></a>
          ))}
        </aside>

        <div className="wn-main">
          <section className="wn-hero">
            <h1>What’s new in Festag</h1>
            <p>Produktupdates, Delivery-Logik und Design-Verbesserungen für ein ruhiges Kontrollsystem für Softwareentwicklung.</p>
          </section>

          <section className="wn-featured" aria-label="Featured Updates">
            <Link href={`#${featured[0].id}`} className="wn-feature-primary">
              <Visual tone={featured[0].tone} index={0} />
              <div>
                <h2>{featured[0].title}</h2>
                <p>{featured[0].summary}</p>
                <div className="wn-feature-links"><span>Voice Reports ansehen <ArrowUpRight size={14} /></span><span>Transkript-Logik lesen <ArrowUpRight size={14} /></span></div>
              </div>
            </Link>
            <div className="wn-card-row">
              {featured.slice(1).map((article, index) => (
                <Link key={article.id} href={`#${article.id}`} className="wn-small-card">
                  <SquaresFour size={26} weight="light" />
                  <div>
                    <h3>{article.title}</h3>
                    <p>{article.summary}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {categoryGroups.map((group) => (
            <section className="wn-section" id={group.id} key={group.id}>
              <div className="wn-section-head">
                <h2>{group.label}</h2>
                <a href="#top">View all</a>
              </div>
              {group.articles.map((article, index) => (
                <a className="wn-article" href={`#${article.id}`} id={article.id} key={article.id}>
                  <Visual tone={article.tone} index={index + articles.indexOf(article)} />
                  <div>
                    <h3>{article.title}</h3>
                    <p>{article.summary}</p>
                    <div className="wn-meta"><span><CalendarBlank size={15} /> {article.date}</span><span>{article.category}</span></div>
                  </div>
                </a>
              ))}
            </section>
          ))}
        </div>

        <aside className="wn-right" aria-label="Auf dieser Seite">
          <a href="#highlights">Highlights</a>
          <a href="#briefings">Projektbriefings</a>
          <a href="#voice">Voice Reports</a>
          <a href="#delivery">Delivery OS</a>
          <a href="#workspace">Workspace</a>
          <a href="#security">Sicherheit</a>
          <a href="#billing">Billing</a>
          <a href="#developer">Developer</a>
        </aside>
      </div>
    </main>
  )
}
