'use client'

/**
 * Context-aware FAB actions for the mobile bottom nav.
 *
 * Each route's pathname maps to a set of bottom-sheet items so the
 * centre + button on mobile feels like a real productivity OS, not a
 * generic plus button.
 */

import {
  Briefcase, ChatCircleDots, ClipboardText, FolderSimple, ListPlus,
  Microphone, Paperclip, ShareNetwork, Sparkle, Stack, UserPlus,
  WarningCircle,
} from '@phosphor-icons/react'
import type { ActionSheetItem } from '@/components/MobileActionSheet'

export type MobileFabContext = {
  pathname: string
  projectId?: string | null
}

export function mobileFabActions(ctx: MobileFabContext): ActionSheetItem[] {
  const p = ctx.pathname

  // Project detail page — actions scoped to the open project.
  if (p.startsWith('/project/') || p.startsWith('/projects/')) {
    const pid = ctx.projectId ?? p.split('/').filter(Boolean)[1]
    return [
      { label: 'Neuer Task',           meta: 'Aufgabe für dieses Projekt anlegen.', icon: <ListPlus size={16} />,   href: `/tasks?project=${pid}&new=1`, tone: 'primary' },
      { label: 'Tagro fragen',         meta: 'Frage zum aktuellen Projektstand.',   icon: <Sparkle size={16} />,    href: `/ai?project=${pid}` },
      { label: 'Statusbericht',        meta: 'Wochenbericht für dieses Projekt.',   icon: <ClipboardText size={16} />, href: `/reports?project=${pid}` },
      { label: 'Datei hochladen',      meta: 'Asset im Projekt ablegen.',           icon: <Paperclip size={16} />,  href: `/project/${pid}?tab=assets` },
      { label: 'Developer schreiben',  meta: 'Direkt im Projekt-Chat.',             icon: <ChatCircleDots size={16} />, href: `/ai?project=${pid}&mode=developer` },
      { label: 'Entscheidung melden',  meta: 'Tagro priorisiert die Klärung.',      icon: <WarningCircle size={16} />, href: `/project/${pid}?tab=decisions` },
    ]
  }

  // Communication / Tagro AI
  if (p === '/ai' || p.startsWith('/ai')) {
    return [
      { label: 'Neuer Tagro-Chat',      meta: 'AI-Fragen zum Projektstand.',         icon: <Sparkle size={16} />,        href: '/ai?new=tagro', tone: 'primary' },
      { label: 'Developer-Chat',        meta: 'Schreibe ans Entwicklerteam.',        icon: <ChatCircleDots size={16} />, href: '/ai?new=developer' },
      { label: 'Project-Owner-Chat',    meta: 'Freigaben, Qualität, Eskalation.',    icon: <ChatCircleDots size={16} />, href: '/ai?new=owner' },
      { label: 'Support kontaktieren',  meta: 'Konto, Abrechnung, Plattform.',       icon: <ChatCircleDots size={16} />, href: '/ai?new=support' },
    ]
  }

  // Inbox
  if (p === '/inbox') {
    return [
      { label: 'Tagro fragen',     meta: 'Schnelle Frage zum Status.',     icon: <Sparkle size={16} />,        href: '/ai', tone: 'primary' },
      { label: 'Neuer Task',       meta: 'Aufgabe direkt anlegen.',        icon: <ListPlus size={16} />,       href: '/tasks?new=1' },
      { label: 'Neues Projekt',    meta: 'Start mit Tagro-Setup.',         icon: <FolderSimple size={16} />,   href: '/projects?new=1' },
      { label: 'Support',          meta: 'Festag Team erreichen.',         icon: <ChatCircleDots size={16} />, href: '/ai?new=support' },
    ]
  }

  // Tasks
  if (p === '/tasks' || p.startsWith('/tasks')) {
    return [
      { label: 'Neuer Task',                 meta: 'Aufgabe anlegen.',                       icon: <ListPlus size={16} />,    href: '/tasks?new=1', tone: 'primary' },
      { label: 'Tasks aus Statusbericht',    meta: 'Tagro generiert Vorschläge.',            icon: <Sparkle size={16} />,     href: '/reports' },
      { label: 'Tagro priorisieren lassen',  meta: 'Welche Tasks zuerst?',                    icon: <Stack size={16} />,       href: '/ai?prompt=prioritize' },
    ]
  }

  // Projects
  if (p === '/projects' || p.startsWith('/projects')) {
    return [
      { label: 'Neues Projekt',           meta: 'Setup mit Tagro starten.',             icon: <FolderSimple size={16} />, href: '/projects?new=1', tone: 'primary' },
      { label: 'Tagro fragen',            meta: 'Welches Projekt braucht Aufmerksamkeit?', icon: <Sparkle size={16} />, href: '/ai' },
      { label: 'Tasks anlegen',           meta: 'Erst Aufgabe, später Projekt.',        icon: <ListPlus size={16} />,    href: '/tasks?new=1' },
    ]
  }

  // Home / Dashboard / default
  return [
    { label: 'Neues Projekt',         meta: 'Setup mit Tagro starten.',           icon: <FolderSimple size={16} />,   href: '/projects?new=1', tone: 'primary' },
    { label: 'Tagro fragen',          meta: 'Status, Risiken, Entscheidungen.',   icon: <Sparkle size={16} />,        href: '/ai' },
    { label: 'Statusbericht erstellen', meta: 'Aktueller Stand aller Projekte.', icon: <ClipboardText size={16} />,  href: '/reports' },
    { label: 'Mitglied einladen',     meta: 'Team-Mitglied oder Beobachter.',     icon: <UserPlus size={16} />,       href: '/observers' },
    { label: 'Briefing aufnehmen',    meta: 'Audio-Brief in zwei Minuten.',       icon: <Microphone size={16} />,     href: '/voice-reports' },
  ]
}

export function mobileFabTitle(ctx: MobileFabContext): { title: string; subtitle: string } {
  const p = ctx.pathname
  if (p.startsWith('/project/'))        return { title: 'Aktion in diesem Projekt', subtitle: 'Tagro übernimmt die Strukturierung.' }
  if (p.startsWith('/ai'))              return { title: 'Neuer Chat',                subtitle: 'Wähle, mit wem du sprichst.' }
  if (p === '/inbox')                   return { title: 'Schnellzugriff',            subtitle: 'Was möchtest du jetzt tun?' }
  if (p.startsWith('/tasks'))           return { title: 'Tasks',                     subtitle: 'Aufgabe anlegen oder priorisieren.' }
  if (p.startsWith('/projects'))        return { title: 'Projekte',                  subtitle: 'Was als nächstes?' }
  return { title: 'Schnellzugriff', subtitle: 'Tagro hilft bei jedem Schritt.' }
}
