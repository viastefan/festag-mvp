import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://xsdkoepwuvpuroijjain.supabase.co'

const TEST_PROJECT = {
  project_title: 'Test-Projekt — Booking Web-App',
  scope_summary: 'Eine schlanke Web-App für Online-Buchungen mit Kalender, Zahlungs-Integration und Admin-Dashboard. Dient als Demo-Projekt zum Testen des Festag-Workflows.',
  goals: [
    'Buchungsablauf in unter 60 Sekunden abschließbar',
    'Mobile-first responsive Design',
    'Stripe-Zahlungen integriert',
  ],
  success_criteria: [
    'Erste Buchung ist End-to-End möglich',
    '95+ Lighthouse Performance Score',
    'Admin kann Buchungen verwalten und exportieren',
  ],
  risks: [
    'Stripe-Webhook-Edge-Cases',
    'Zeitzonen-Handling bei internationalen Kunden',
  ],
  open_questions: [
    'Welche Sprachen werden unterstützt?',
    'Soll es einen Mehrbenutzer-Modus geben?',
  ],
  epics: [
    {
      title: 'Setup & Infrastruktur',
      description: 'Projekt-Setup, Hosting, CI/CD, DB-Schema',
      priority: 'high',
      estimated_effort: '1 Woche',
      tasks: [
        { title: 'Next.js Projekt aufsetzen', description: 'Repo, Vercel-Deploy, Env-Vars', priority: 'critical', estimated_hours: 4, acceptance_criteria: ['Repo läuft auf Vercel', 'Preview-Deploys aktiv'], tags: ['setup'], requires_approval: false },
        { title: 'Supabase Schema definieren', description: 'Tabellen für bookings, slots, customers', priority: 'high', estimated_hours: 6, acceptance_criteria: ['Migrations laufen', 'RLS aktiv'], tags: ['backend', 'db'], requires_approval: false },
      ],
    },
    {
      title: 'Buchungs-Flow',
      description: 'Kunden-facing UI für Slot-Auswahl und Buchung',
      priority: 'high',
      estimated_effort: '2-3 Wochen',
      tasks: [
        { title: 'Kalender-Komponente', description: 'Verfügbare Slots anzeigen, Auswahl ermöglichen', priority: 'critical', estimated_hours: 16, acceptance_criteria: ['Slots werden korrekt geladen', 'Auswahl funktioniert mobil'], tags: ['frontend'], requires_approval: false },
        { title: 'Stripe-Integration', description: 'Checkout-Session und Webhook-Handler', priority: 'critical', estimated_hours: 12, acceptance_criteria: ['Test-Zahlung erfolgreich', 'Webhook bestätigt Buchung'], tags: ['backend', 'payments'], requires_approval: true },
        { title: 'Bestätigungs-E-Mail', description: 'Resend-Integration mit Buchungs-PDF', priority: 'medium', estimated_hours: 6, acceptance_criteria: ['E-Mail kommt an', 'PDF-Anhang lesbar'], tags: ['backend'], requires_approval: false },
      ],
    },
    {
      title: 'Admin-Dashboard',
      description: 'Übersicht und Verwaltung von Buchungen',
      priority: 'medium',
      estimated_effort: '1-2 Wochen',
      tasks: [
        { title: 'Buchungs-Tabelle', description: 'Sortier- und filterbare Liste aller Buchungen', priority: 'high', estimated_hours: 10, acceptance_criteria: ['Filterung nach Status', 'CSV-Export funktioniert'], tags: ['frontend', 'admin'], requires_approval: false },
        { title: 'Slot-Konfiguration', description: 'Admin definiert Verfügbarkeit pro Wochentag', priority: 'medium', estimated_hours: 8, acceptance_criteria: ['Wiederkehrende Slots speicherbar', 'Ausnahmen definierbar'], tags: ['frontend', 'admin'], requires_approval: false },
      ],
    },
  ],
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json()
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) return NextResponse.json({ error: 'service key missing' }, { status: 500 })
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    const sb = createClient(SUPABASE_URL, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

    const t = TEST_PROJECT

    const { data: project, error: projErr } = await sb.from('projects').insert({
      user_id: userId,
      title: t.project_title,
      description: t.scope_summary,
      status: 'intake',
      goals: t.goals,
      success_criteria: t.success_criteria,
      risks: t.risks,
      open_questions: t.open_questions,
      scope_summary: t.scope_summary,
      ai_decomposed_at: new Date().toISOString(),
    }).select().single()

    if (projErr) return NextResponse.json({ error: projErr.message }, { status: 500 })

    const projectId = project.id

    for (let ei = 0; ei < t.epics.length; ei++) {
      const ep = t.epics[ei]
      const { data: epic } = await sb.from('epics').insert({
        project_id: projectId,
        title: ep.title,
        description: ep.description,
        priority: ep.priority,
        estimated_effort: ep.estimated_effort,
        order_index: ei,
      }).select().single()

      if (!epic) continue

      for (const task of ep.tasks) {
        await sb.from('tasks').insert({
          project_id: projectId,
          epic_id: epic.id,
          title: task.title,
          description: task.description,
          status: 'todo',
          priority: task.priority,
          estimated_hours: task.estimated_hours,
          acceptance_criteria: task.acceptance_criteria,
          tags: task.tags,
          requires_approval: task.requires_approval,
        })
      }
    }

    await sb.from('activity_feed').insert({
      user_id: userId,
      project_id: projectId,
      type: 'project_status',
      message: `Test-Projekt "${t.project_title}" wurde angelegt (${t.epics.length} Epics, ${t.epics.reduce((a, e) => a + e.tasks.length, 0)} Tasks)`,
    }).catch(() => {})

    return NextResponse.json({ projectId, decomposed: t })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
