'use client'

import { useEffect } from 'react'
import type { ReactNode } from 'react'

import { createClient } from '@/lib/supabase/client'
import {
  LANGUAGE_EVENT,
  applyLanguageMode,
  getLanguageMode,
  isLanguageMode,
  setLanguageMode,
  type LanguageMode,
} from '@/lib/language'

const TRANSLATIONS: Record<string, string> = {
  // Settings sidebar
  'Zurück zur App': 'Back to app',
  'Konto': 'Account',
  'Profil': 'Profile',
  'Erscheinung': 'Appearance',
  'Sicherheit': 'Security',
  'Benachrichtigungen': 'Notifications',
  'Verbundene Konten': 'Connected accounts',
  'Arbeitsbereich': 'Workspace',
  'Unternehmen': 'Company',
  'Abrechnung & Steuer': 'Billing & tax',
  'Einstellungen': 'Settings',

  // App sidebar and shell
  'Statusabfrage': 'Status check',
  'Inbox': 'Inbox',
  'Projekte': 'Projects',
  'Statusberichte': 'Status reports',
  'Tasks': 'Tasks',
  'Entscheidungen': 'Decisions',
  'Mitwirkende': 'Collaborators',
  'Chat': 'Chat',
  'Notizen': 'Notes',
  'Preisschätzer': 'Price estimator',
  'Connectors': 'Connectors',
  'Add-ons': 'Add-ons',
  'Kunden': 'Clients',
  'Nachrichten': 'Messages',
  'Meine Tasks': 'My tasks',
  'Meine Projekte': 'My projects',
  'Zeiterfassung': 'Time tracking',
  'Mehr': 'More',
  'Home': 'Home',
  'Dashboard': 'Dashboard',
  'Profil & Konto': 'Profile & account',
  'Name, Avatar, Sprache': 'Name, avatar, language',
  'Copilot': 'Copilot',
  'Copilot öffnen': 'Open Copilot',
  'Theme wechseln': 'Change theme',
  'Theme Auswahl': 'Theme selection',
  'Sidebar ausklappen': 'Expand sidebar',
  'Light': 'Light',
  'Read': 'Read',
  'Darkmode': 'Dark mode',
  'Einführung starten': 'Start introduction',
  'Hilfe suchen...': 'Search for help...',
  'Festag Docs': 'Festag docs',
  'Docs': 'Docs',
  'News': 'News',
  'Blogbeiträge': 'Blog posts',
  'Hilfeartikel': 'Help articles',
  'Kontakt': 'Contact',
  'Tastenkürzel': 'Keyboard shortcuts',
  'Festag Status': 'Festag status',
  'Apps laden': 'Download apps',
  'G dann S': 'G then S',
  'Was ist neu': "What's new",
  'Projektbriefings': 'Project briefings',
  'Code Intelligence': 'Code Intelligence',
  'Vollständiger Changelog': 'Full changelog',
  'Support kontaktieren': 'Contact support',
  'Mitglieder einladen': 'Invite members',
  'Desktop-App laden': 'Download desktop app',
  'Abmelden': 'Log out',

  // Settings profile
  'Grunddaten': 'Basic details',
  'Profilbild': 'Profile picture',
  'PNG oder JPG, max. 4 MB. Wird in Kommentaren und im Workspace angezeigt.': 'PNG or JPG, max. 4 MB. Shown in comments and in the workspace.',
  'Lade hoch…': 'Uploading...',
  'Ersetzen': 'Replace',
  'Hochladen': 'Upload',
  'Bild entfernen': 'Remove picture',
  'E-Mail': 'Email',
  'Wird für Magic-Link-Anmeldungen genutzt.': 'Used for magic-link sign-ins.',
  'Wird für Magic-Link-Anmeldungen genutzt. Änderungen müssen per Link bestätigt werden.': 'Used for magic-link sign-ins. Changes must be confirmed by link.',
  'E-Mail-Änderung wird vorbereitet…': 'Preparing email change...',
  'E-Mail kann nicht leer sein.': 'Email cannot be empty.',
  'Bitte eine gültige E-Mail-Adresse eingeben.': 'Please enter a valid email address.',
  'Bestätigungslink gesendet. Danach nutzt der Login diese Adresse.': 'Confirmation link sent. After confirmation, sign-in uses this address.',
  'E-Mail konnte nicht geändert werden.': 'Email could not be changed.',
  'E-Mail-Bestätigung gesendet': 'Email confirmation sent',
  'Profilfarbe': 'Profile color',
  'Erscheint hinter deinen Initialen, wenn kein Bild gesetzt ist.': 'Shown behind your initials when no picture is set.',
  'Anzeigename': 'Display name',
  'So erscheint dein Profil in Kommentaren und Projektfreigaben.': 'This is how your profile appears in comments and project shares.',
  'Noch nicht gesetzt': 'Not set yet',
  'Vollständiger Name': 'Full name',
  'z. B. Stefan Dirnberger': 'e.g. Stefan Dirnberger',
  'Kontakt': 'Contact',
  'Position': 'Position',
  'Optional. Z. B. Startupgründer, Agentur-Lead.': 'Optional. e.g. startup founder, agency lead.',
  'z. B. Startupgründer': 'e.g. startup founder',
  'Telefon': 'Phone',
  'Optional, z. B. +49 151 23456789': 'Optional, e.g. +49 151 23456789',
  'Optional. Wird Mitwirkenden in deinem Workspace angezeigt.': 'Optional. Shown to collaborators in your workspace.',
  'Über dich': 'About you',
  'Kurze Bio': 'Short bio',
  'Ein bis zwei Sätze über dich. Tagro nutzt das als Kontext, wenn neue Mitwirkende dazukommen.': 'One or two sentences about you. Tagro uses this as context when new collaborators join.',
  'z. B. „Startupgründer aus München, Schwerpunkt SaaS und Operations.': 'e.g. "Startup founder from Munich, focused on SaaS and operations.',
  'Lokale Einstellungen': 'Local settings',
  'Zeitzone': 'Time zone',
  'Beeinflusst, wann Tagro Daily-Notes und tägliche Briefings ausspielt.': 'Controls when Tagro sends daily notes and daily briefings.',
  'Sprache': 'Language',
  'In welcher Sprache Tagro mit dir spricht.': 'The language Tagro uses with you.',
  'Deutsch': 'German',
  'English': 'English',
  'Profilvollständigkeit': 'Profile completeness',
  'Ein vollständiges Profil hilft Tagro bei Zuordnung, Kommunikation und Projektkontext.': 'A complete profile helps Tagro with assignment, communication, and project context.',
  'Status': 'Status',
  'Account Kontext': 'Account context',
  'Rolle': 'Role',
  'Anmeldung': 'Sign-in',
  'Empfohlen': 'Recommended',
  'Hinterlege Position und Telefon, damit Developer bei Rückfragen schneller den richtigen Kontext haben.': 'Add your position and phone number so developers have the right context faster when questions come up.',
  'Speichert automatisch…': 'Saving automatically...',
  'Alle Änderungen gespeichert': 'All changes saved',
  'Gespeichert': 'Saved',
  'Profil gespeichert': 'Profile saved',
  'Profilbild aktualisiert': 'Profile picture updated',
  'Profilbild entfernt': 'Profile picture removed',
  'Profilbild konnte nicht entfernt werden.': 'Profile picture could not be removed.',
  'Profilfarbe gespeichert': 'Profile color saved',
  'Profilfarbe auf diesem Gerät gespeichert': 'Profile color saved on this device',
  'Konnte nicht speichern.': 'Could not save.',
  'Bitte ein Bild auswählen.': 'Please choose an image.',
  'Maximal 4 MB.': 'Maximum 4 MB.',
  'Bild konnte nicht hochgeladen werden.': 'Image could not be uploaded.',

  // Auth and public shell
  'Heller Modus': 'Light mode',
  'Dunkler Modus': 'Dark mode',
  'Festag Anmeldung': 'Festag sign-in',
  'Willkommen zurück': 'Welcome back',
  'Mit Google verbinden': 'Continue with Google',
  'E-Mail verwenden': 'Use email',
  'Mit Ihrer Anmeldung bestätigen Sie unsere': 'By signing in, you agree to our',
  'AGB': 'Terms',
  'und': 'and',
  'Nutzungsbestimmungen': 'Terms of use',
  'Noch kein Zugang?': 'No access yet?',
  'Hier registrieren': 'Register here',
  'Dev Zugang': 'Developer access',
  'SSL verschlüsselt': 'SSL encrypted',
  'SSL · End-to-End verschlüsselt': 'SSL · end-to-end encrypted',
  'Aktuell nur in der DACH-Region verfügbar': 'Currently available only in the DACH region',

  // Appearance
  'Design': 'Design',
  'Wirkt sich auf das gesamte Dashboard aus. Jederzeit änderbar.': 'Applies to the whole dashboard. You can change it anytime.',
  'Hell': 'Light',
  'Klar, reduziert.': 'Clear and reduced.',
  'Lesemodus': 'Reading mode',
  'Warm, ruhig.': 'Warm and calm.',
  'Dunkel': 'Dark',
  'Technisch, kontraststark.': 'Technical, high contrast.',
  'Schrift': 'Font',
  'Aeonik fühlt sich ruhig an, SF Pro folgt deinem System.': 'Aeonik feels calm; SF Pro follows your system.',
  'Design gespeichert': 'Design saved',
  'Schrift gespeichert': 'Font saved',

  // Security
  'Du meldest dich per Magic-Link oder Passkey an. Keine Passwörter, kein Phishing.': 'You sign in with a magic link or passkey. No passwords, no phishing.',
  'Passkeys': 'Passkeys',
  'Speichere einen Passkey auf diesem Gerät, um dich beim nächsten Mal mit Touch-ID oder Face-ID anzumelden.': 'Save a passkey on this device to sign in with Touch ID or Face ID next time.',
  'Noch kein Passkey angelegt.': 'No passkey created yet.',
  'Gerät': 'Device',
  'Entfernen': 'Remove',
  'Wird angelegt…': 'Creating...',
  'Passkey hinzufügen': 'Add passkey',
  'Passkey hinzugefügt': 'Passkey added',
  'Passkey entfernt': 'Passkey removed',
  'Passkey-Anmeldung ist noch nicht aktiviert. Wir melden uns wenn es verfügbar ist.': 'Passkey sign-in is not enabled yet. We will let you know when it is available.',
  'Passkey konnte nicht angelegt werden.': 'Passkey could not be created.',
  'Konnte Passkey nicht entfernen.': 'Could not remove passkey.',
  'Onboarding neu starten': 'Restart onboarding',
  'Öffnet das geführte Setup erneut — nützlich, wenn du Workspace-Modus, Profil oder das erste Projekt nochmal anpassen willst. Bestehende Projekte und Daten bleiben unberührt.': 'Opens the guided setup again. Useful if you want to adjust workspace mode, profile, or the first project. Existing projects and data stay untouched.',
  'Onboarding öffnen': 'Open onboarding',
  'Einführung erneut starten': 'Restart introduction',
  'Spielt die kurze Tour ab, die Dashboard, Projekte, Statusabfrage, Tagro und Teams erklärt. Bestehende Daten bleiben unberührt.': 'Replays the short tour explaining dashboard, projects, status check, Tagro, and teams. Existing data stays untouched.',
  'Tour starten': 'Start tour',
  'Konto löschen': 'Delete account',
  'Beendet deinen Festag-Zugang endgültig. Workspaces, Projekte, Briefings, Inbox-Items und Tagro-Memory werden mitgelöscht. Diese Aktion ist nicht rückgängig zu machen.': 'Permanently ends your Festag access. Workspaces, projects, briefings, inbox items, and Tagro memory are deleted as well. This action cannot be undone.',
  'Bitte erneut anmelden.': 'Please sign in again.',

  // Notifications and connected accounts
  'E-Mail-Benachrichtigungen': 'Email notifications',
  'Tagro-Updates, Aufgaben, Projektbriefings.': 'Tagro updates, tasks, project briefings.',
  'Push-Benachrichtigungen': 'Push notifications',
  'Nur im Browser, nicht für E-Mail-Empfang nötig.': 'Browser only; not required for email delivery.',
  'Benachrichtigungen gespeichert': 'Notifications saved',
  'Google': 'Google',
  'Anmeldung mit deinem Google-Account.': 'Sign in with your Google account.',
  'Verbunden': 'Connected',
  'Nicht verbunden': 'Not connected',

  // Workspace
  'Aktueller Workspace-Typ': 'Current workspace type',
  'Workspace-Name': 'Workspace name',
  'Erscheint in Briefings, E-Mails und Workspace-Wechsler.': 'Appears in briefings, emails, and the workspace switcher.',
  'Plan': 'Plan',
  'Festag MVP — auf Anfrage.': 'Festag MVP by request.',
  'Workspace erweitern': 'Extend workspace',
  'Add-ons erweitern deinen Workspace, ohne den Modus zu wechseln.': 'Add-ons extend your workspace without changing the mode.',
  'Anfragen': 'Request',
  'Mitglieder & Rollen': 'Members & roles',
  'Lade andere mit klaren Rollen zu deinem Workspace ein.': 'Invite others to your workspace with clear roles.',
  'Einladen': 'Invite',
  'Workspace-Wechsel anfragen': 'Request workspace switch',
  'Ein Wechsel des Workspace-Typs kann Rollen, Abrechnung, Kundenbereiche und Projektlogik beeinflussen. Festag prüft den Wechsel, damit keine Daten oder Zugriffsrechte verloren gehen.': 'Changing workspace type can affect roles, billing, client areas, and project logic. Festag reviews the switch so no data or access rights are lost.',
  'Wechsel anfragen': 'Request switch',
  'Beendet die Sitzung in diesem Browser.': 'Ends the session in this browser.',
  'Privat': 'Private',
  'Client': 'Client',
  'Developer': 'Developer',
  'Admin': 'Admin',
  'Owner': 'Owner',
  'Approver': 'Approver',
  'Finance': 'Finance',
  'Member': 'Member',
  'Viewer': 'Viewer',
  '(du)': '(you)',

  // Company and billing
  'Firmenname': 'Company name',
  'Rechtsform': 'Legal form',
  'Optional. Erscheint auf Rechnungen und Verträgen.': 'Optional. Appears on invoices and contracts.',
  '— bitte wählen —': '— please choose —',
  'Branche': 'Industry',
  'Teamgröße': 'Team size',
  'Website': 'Website',
  'Beschreibung': 'Description',
  'Kurze Beschreibung, die Tagro für Kontext nutzt.': 'Short description that Tagro uses as context.',
  'Was macht euer Unternehmen?': 'What does your company do?',
  'Unternehmen gespeichert': 'Company saved',
  'Briefing & Voice Reports': 'Briefing & voice reports',
  'Tagro Briefings sind das tägliche Kontrollsystem für Softwareprojekte. API-basierte Voice Reports werden separat kalkuliert; ein ChatGPT-Abo deckt die Festag-App-API nicht automatisch ab.': 'Tagro briefings are the daily control system for software projects. API-based voice reports are calculated separately; a ChatGPT subscription does not automatically cover the Festag app API.',
  'Projektbriefings': 'Project briefings',
  'Im Projekt enthalten': 'Included in the project',
  'Voice Reports': 'Voice reports',
  'Verfügbar über Growth Care oder Business': 'Available through Growth Care or Business',
  'Automatische Zustellung': 'Automatic delivery',
  'Nicht aktiv': 'Inactive',
  'Weekly Executive Summary': 'Weekly executive summary',
  'USt-IdNr.': 'VAT ID',
  'Format z. B. DE123456789. Erscheint auf Rechnungen.': 'Format e.g. DE123456789. Appears on invoices.',
  'Steuernummer': 'Tax number',
  'Optional, falls keine USt-IdNr. vorhanden.': 'Optional if no VAT ID is available.',
  'Rechnungsadresse': 'Billing address',
  'Wird auf allen Festag-Rechnungen verwendet.': 'Used on all Festag invoices.',
  'Straße und Hausnummer': 'Street and house number',
  'PLZ': 'ZIP',
  'z. B. 80331': 'e.g. 80331',
  'Stadt': 'City',
  'z. B. München': 'e.g. Munich',
  'Land': 'Country',
  'Abrechnung gespeichert': 'Billing saved',

  // Common statuses
  'In Arbeit': 'In progress',
  'In Planung': 'Planning',
  'Planung': 'Planning',
  'Testing': 'Testing',
  'Abgeschlossen': 'Completed',
  'Geplant': 'Planned',
  'Aktiver Kontostatus': 'Active account status',
  'AKTUELLER PLAN': 'CURRENT PLAN',
}

function translateDynamic(source: string) {
  const complete = source.match(/^(\d+)% vollständig$/)
  if (complete) return `${complete[1]}% complete`

  const members = source.match(/^(\d+) Mitglieder? · Rollen werden pro Workspace gesetzt\.$/)
  if (members) return `${members[1]} member${members[1] === '1' ? '' : 's'} · Roles are set per workspace.`

  if (source.startsWith('seit ')) return source.replace(/^seit /, 'since ')
  if (source.startsWith('vor ')) return source.replace(/^vor /, '')
  return null
}

function translatePhrase(source: string, mode: LanguageMode) {
  if (mode === 'de') return source
  const normalized = source.replace(/\u00a0/g, ' ')
  return TRANSLATIONS[source] ?? TRANSLATIONS[normalized] ?? translateDynamic(source) ?? source
}

function splitWhitespace(value: string) {
  const leading = value.match(/^\s*/)?.[0] ?? ''
  const trailing = value.match(/\s*$/)?.[0] ?? ''
  return {
    leading,
    inner: value.slice(leading.length, value.length - trailing.length),
    trailing,
  }
}

function shouldSkipTextElement(element: Element | null) {
  if (!element) return true
  return Boolean(element.closest('script,style,noscript,svg,canvas,textarea,input,[contenteditable="true"],[data-no-translate]'))
}

function shouldSkipAttributeElement(element: Element | null) {
  if (!element) return true
  return Boolean(element.closest('script,style,noscript,svg,canvas,[data-no-translate]'))
}

export default function LanguageProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const textOriginals = new WeakMap<Text, string>()
    const attrOriginals = new WeakMap<Element, Partial<Record<string, string>>>()
    let currentMode = getLanguageMode()
    let applying = false
    let scheduled = false
    let hydrationReady = false

    function translateTextNode(node: Text) {
      if (shouldSkipTextElement(node.parentElement)) return
      const original = textOriginals.get(node) ?? node.data
      if (!textOriginals.has(node)) textOriginals.set(node, original)
      if (!original.trim()) return

      const { leading, inner, trailing } = splitWhitespace(original)
      const next = `${leading}${translatePhrase(inner, currentMode)}${trailing}`
      if (node.data !== next) node.data = next
    }

    function translateAttributes(element: Element) {
      if (shouldSkipAttributeElement(element)) return
      const names = ['placeholder', 'title', 'aria-label']
      const originals = attrOriginals.get(element) ?? {}

      for (const name of names) {
        const current = element.getAttribute(name)
        if (!current) continue
        if (originals[name] === undefined) originals[name] = current
        const original = originals[name] ?? current
        const next = translatePhrase(original, currentMode)
        if (current !== next) element.setAttribute(name, next)
      }

      if (!attrOriginals.has(element) && Object.keys(originals).length > 0) {
        attrOriginals.set(element, originals)
      }
    }

    function translateTree(root: ParentNode) {
      applying = true
      try {
        if (root instanceof Element) translateAttributes(root)

        const textWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
        let textNode = textWalker.nextNode()
        while (textNode) {
          translateTextNode(textNode as Text)
          textNode = textWalker.nextNode()
        }

        const elementWalker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT)
        let element = elementWalker.nextNode()
        while (element) {
          translateAttributes(element as Element)
          element = elementWalker.nextNode()
        }
      } finally {
        applying = false
      }
    }

    function scheduleTranslate() {
      if (!hydrationReady) return
      if (scheduled || !document.body) return
      scheduled = true
      window.requestAnimationFrame(() => {
        scheduled = false
        translateTree(document.body)
      })
    }

    function applyMode(mode: LanguageMode) {
      currentMode = mode
      applyLanguageMode(mode)
      scheduleTranslate()
    }

    applyLanguageMode(currentMode)

    const hydrationTimer = window.setTimeout(() => {
      hydrationReady = true
      scheduleTranslate()
    }, 900)

    const onLanguage = (event: Event) => {
      if (event instanceof CustomEvent && isLanguageMode(event.detail)) {
        applyMode(event.detail)
      }
    }
    window.addEventListener(LANGUAGE_EVENT, onLanguage)

    const observer = new MutationObserver(() => {
      if (!applying && hydrationReady) scheduleTranslate()
    })
    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['placeholder', 'title', 'aria-label'],
      })
    }

    let cancelled = false
    ;(async () => {
      try {
        const sb = createClient()
        const { data: { session } } = await sb.auth.getSession()
        if (cancelled || !session?.user) return
        const { data } = await (sb as any)
          .from('profiles')
          .select('language_pref')
          .eq('id', session.user.id)
          .maybeSingle()
        const pref = (data as any)?.language_pref
        if (!cancelled && isLanguageMode(pref) && pref !== currentMode) {
          setLanguageMode(pref)
        }
      } catch {}
    })()

    return () => {
      cancelled = true
      window.clearTimeout(hydrationTimer)
      observer.disconnect()
      window.removeEventListener(LANGUAGE_EVENT, onLanguage)
    }
  }, [])

  return <>{children}</>
}
