export type VoiceBriefingMode = 'full' | 'short' | 'decision_only' | 'risk_only'
export type VoiceBriefingUiState = 'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'error' | 'unavailable'

export type VoiceBriefingTask = {
  id?: string
  title: string
  status?: string | null
  priority?: string | null
  updated_at?: string | null
}

export type VoiceBriefingProject = {
  id: string
  title: string
  status?: string | null
  description?: string | null
  color?: string | null
}

export type VoiceBriefingReport = {
  id?: string
  content: string
  created_at?: string | null
}

export type VoiceBriefingData = {
  project: VoiceBriefingProject | null
  latestReport: VoiceBriefingReport | null
  tasks: VoiceBriefingTask[]
  devUpdates: string[]
  phase: string
  progress: number
  completedTasks: VoiceBriefingTask[]
  activeTasks: VoiceBriefingTask[]
  openTasks: VoiceBriefingTask[]
  blockers: VoiceBriefingTask[]
  decisions: VoiceBriefingTask[]
  milestones: string[]
  nextPayment?: string | null
}

export type VoiceOptions = {
  voice?: string
  format?: 'mp3' | 'wav' | 'opus'
  speed?: number
}

export type VoiceSynthesisResult = {
  providerName: string
  audioUrl: string | null
  audioBase64?: string | null
  mimeType?: string | null
  durationSeconds?: number | null
  generatedAt: string
}

export type VoiceReportSnapshot = {
  id?: string
  projectId: string | null
  sourceReportId?: string | null
  mode: VoiceBriefingMode
  statusSnapText: string
  audioScript: string
  transcript: string
  audioUrl: string | null
  audioProvider: string | null
  voiceId?: string | null
  durationSeconds: number | null
  dataBasis: {
    projectName?: string | null
    projectPhase?: string | null
    progress?: number
    reportCreatedAt?: string | null
    taskCount: number
    completedTaskCount: number
    activeTaskCount: number
    blockerCount: number
    decisionCount: number
    generatedFrom: Array<'project' | 'status_report' | 'tasks' | 'dev_updates' | 'milestones' | 'payments'>
  }
  deliveryStatus: 'manual' | 'queued' | 'sent' | 'failed' | 'not_scheduled'
  audioStatus: 'not_generated' | 'ready' | 'failed'
  errorMessage?: string | null
  createdAt: string
}

export interface VoiceProvider {
  providerName: string
  supportedVoices: string[]
  supportsStreaming: boolean
  synthesizeSpeech(text: string, options?: VoiceOptions): Promise<VoiceSynthesisResult>
}

function stripMarkdown(value: string) {
  return value
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*_`\-[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function firstSentences(value: string, max = 3) {
  const sentences = stripMarkdown(value).match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? []
  return sentences.slice(0, max).join(' ').trim()
}

function estimateDurationSeconds(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  return Math.max(25, Math.round((words / 145) * 60))
}

function statusLabel(status?: string | null) {
  const value = String(status ?? '').toLowerCase()
  if (['planning', 'intake', 'new'].includes(value)) return 'Planung'
  if (['active', 'in_progress', 'doing'].includes(value)) return 'in Umsetzung'
  if (['review', 'testing'].includes(value)) return 'in Prüfung'
  if (['done', 'completed'].includes(value)) return 'abgeschlossen'
  return 'Intake'
}

function normalizeTaskStatus(status?: string | null) {
  const value = String(status ?? '').toLowerCase()
  if (['done', 'completed', 'checked', 'verified'].includes(value)) return 'done'
  if (['doing', 'active', 'in_progress', 'review'].includes(value)) return 'active'
  if (['blocked', 'risk'].includes(value)) return 'blocked'
  if (['waiting', 'needs_decision', 'decision_required'].includes(value)) return 'waiting'
  return 'open'
}

export function buildVoiceBriefingData(input: {
  project: VoiceBriefingProject | null
  latestReport?: VoiceBriefingReport | null
  tasks?: VoiceBriefingTask[]
  devUpdates?: string[]
  milestones?: string[]
  nextPayment?: string | null
}): VoiceBriefingData {
  const tasks = input.tasks ?? []
  const completedTasks = tasks.filter((task) => normalizeTaskStatus(task.status) === 'done')
  const activeTasks = tasks.filter((task) => normalizeTaskStatus(task.status) === 'active')
  const blockers = tasks.filter((task) => normalizeTaskStatus(task.status) === 'blocked')
  const decisions = tasks.filter((task) => normalizeTaskStatus(task.status) === 'waiting')
  const openTasks = tasks.filter((task) => ['open', 'waiting', 'blocked'].includes(normalizeTaskStatus(task.status)))
  const progress = tasks.length ? Math.round((completedTasks.length / tasks.length) * 100) : 0

  return {
    project: input.project,
    latestReport: input.latestReport ?? null,
    tasks,
    devUpdates: input.devUpdates ?? [],
    phase: statusLabel(input.project?.status),
    progress,
    completedTasks,
    activeTasks,
    openTasks,
    blockers,
    decisions,
    milestones: input.milestones ?? [],
    nextPayment: input.nextPayment ?? null,
  }
}

export class OpenAIVoiceProvider implements VoiceProvider {
  providerName = 'OpenAI'
  supportedVoices = ['alloy', 'verse', 'aria', 'sage']
  supportsStreaming = false

  async synthesizeSpeech(_text: string, _options?: VoiceOptions): Promise<VoiceSynthesisResult> {
    // Server-side TTS is intentionally kept behind the provider boundary.
    // The MVP UI can use the existing browser speech synthesis until API billing
    // and storage are enabled for production audio files.
    return {
      providerName: this.providerName,
      audioUrl: null,
      audioBase64: null,
      mimeType: null,
      durationSeconds: null,
      generatedAt: new Date().toISOString(),
    }
  }
}

export class ElevenLabsVoiceProvider implements VoiceProvider {
  providerName = 'ElevenLabs'
  supportedVoices: string[] = []
  supportsStreaming = true
  async synthesizeSpeech(text: string, options?: VoiceOptions) {
    void text; void options
    throw new Error('ElevenLabs provider is prepared but not configured yet.')
  }
}

export class CartesiaVoiceProvider implements VoiceProvider {
  providerName = 'Cartesia'
  supportedVoices: string[] = []
  supportsStreaming = true
  async synthesizeSpeech(text: string, options?: VoiceOptions) {
    void text; void options
    throw new Error('Cartesia provider is prepared but not configured yet.')
  }
}

export class VoiceBriefingService {
  constructor(private provider: VoiceProvider = new OpenAIVoiceProvider()) {}

  async getProjectBriefingData(projectId: string): Promise<VoiceBriefingData> {
    void projectId
    throw new Error('Pass project data from the app layer or implement a Supabase adapter for this environment.')
  }

  generateVoiceBriefingText(data: VoiceBriefingData, mode: VoiceBriefingMode = 'full') {
    if (!data.project || !data.latestReport) return ''

    const projectName = data.project.title
    const status = `Dein Projekt ${projectName} ist aktuell in der Phase ${data.phase}. Der Fortschritt liegt bei ${data.progress} Prozent.`
    const summary = data.latestReport?.content ? firstSentences(data.latestReport.content, mode === 'short' ? 2 : 4) : ''
    const completed = data.completedTasks.length
      ? `Seit dem letzten Briefing wurden ${data.completedTasks.length} Aufgaben abgeschlossen. Wichtig: ${data.completedTasks.slice(0, 3).map((task) => task.title).join(', ')}.`
      : 'Seit dem letzten Briefing ist noch keine abgeschlossene Aufgabe markiert.'
    const active = data.activeTasks.length
      ? `Aktuell in Arbeit sind vor allem ${data.activeTasks.slice(0, 3).map((task) => task.title).join(', ')}.`
      : 'Aktuell ist keine Aufgabe ausdrücklich als in Arbeit markiert.'
    const risks = data.blockers.length
      ? `Es gibt ${data.blockers.length} Blocker oder Risiken. Der wichtigste Punkt ist: ${data.blockers[0].title}.`
      : 'Aktuell sind keine kritischen Blocker markiert.'
    const decisions = data.decisions.length
      ? `Es sind ${data.decisions.length} Entscheidungen offen. Bitte prüfe zuerst: ${data.decisions[0].title}.`
      : 'Aktuell wartet keine sichtbare Entscheidung auf dich.'
    const next = data.openTasks.length
      ? `Mein Vorschlag: Als Nächstes ${data.openTasks[0].title} klären, damit der Projektfluss sauber bleibt.`
      : 'Mein Vorschlag: Das Projektbriefing aktualisieren, sobald neue Aufgaben oder Entwickler-Updates vorliegen.'
    const budget = data.nextPayment
      ? `Beim Budget ist der nächste relevante Punkt: ${data.nextPayment}.`
      : 'Zum Budget oder zur nächsten Meilensteinzahlung liegt aktuell kein neuer Hinweis vor.'

    if (mode === 'decision_only') return [decisions, next].join(' ')
    if (mode === 'risk_only') return [risks, next].join(' ')
    if (mode === 'short') return [`Guten Morgen.`, status, risks, decisions, next].join(' ')

    return [
      'Guten Morgen. Hier ist dein Tagro Voice Report.',
      status,
      summary,
      completed,
      active,
      risks,
      decisions,
      budget,
      next,
      'Kurz gesagt: Tagro hält den Projektstand im Blick, damit du nicht täglich in Tickets eintauchen musst.',
    ].filter(Boolean).join(' ')
  }

  buildStatusSnapText(data: VoiceBriefingData) {
    if (!data.project || !data.latestReport) return ''
    return [
      `Projekt: ${data.project.title}`,
      `Phase: ${data.phase}`,
      `Fortschritt: ${data.progress}%`,
      `Aufgaben: ${data.completedTasks.length} erledigt, ${data.activeTasks.length} in Arbeit, ${data.openTasks.length} offen`,
      `Blocker/Risiken: ${data.blockers.length}`,
      `Offene Entscheidungen: ${data.decisions.length}`,
      `Letztes Projektbriefing: ${data.latestReport.created_at ?? 'unbekannt'}`,
    ].join('\n')
  }

  createVoiceReportSnapshot(input: {
    data: VoiceBriefingData
    mode?: VoiceBriefingMode
    audio?: VoiceSynthesisResult | null
    errorMessage?: string | null
    deliveryStatus?: VoiceReportSnapshot['deliveryStatus']
  }): VoiceReportSnapshot | null {
    const mode = input.mode ?? 'full'
    const audioScript = this.generateVoiceBriefingText(input.data, mode)
    if (!input.data.project || !input.data.latestReport || !audioScript) return null

    const generatedFrom: VoiceReportSnapshot['dataBasis']['generatedFrom'] = ['project', 'status_report']
    if (input.data.tasks.length) generatedFrom.push('tasks')
    if (input.data.devUpdates.length) generatedFrom.push('dev_updates')
    if (input.data.milestones.length) generatedFrom.push('milestones')
    if (input.data.nextPayment) generatedFrom.push('payments')

    return {
      projectId: input.data.project.id,
      sourceReportId: input.data.latestReport.id ?? null,
      mode,
      statusSnapText: this.buildStatusSnapText(input.data),
      audioScript,
      transcript: audioScript,
      audioUrl: input.audio?.audioUrl ?? null,
      audioProvider: input.audio?.providerName ?? this.provider.providerName,
      durationSeconds: input.audio?.durationSeconds ?? estimateDurationSeconds(audioScript),
      dataBasis: {
        projectName: input.data.project.title,
        projectPhase: input.data.phase,
        progress: input.data.progress,
        reportCreatedAt: input.data.latestReport.created_at ?? null,
        taskCount: input.data.tasks.length,
        completedTaskCount: input.data.completedTasks.length,
        activeTaskCount: input.data.activeTasks.length,
        blockerCount: input.data.blockers.length,
        decisionCount: input.data.decisions.length,
        generatedFrom,
      },
      deliveryStatus: input.deliveryStatus ?? 'manual',
      audioStatus: input.audio?.audioUrl ? 'ready' : input.errorMessage ? 'failed' : 'not_generated',
      errorMessage: input.errorMessage ?? null,
      createdAt: new Date().toISOString(),
    }
  }

  async generateAudioFromText(text: string, voiceOptions?: VoiceOptions) {
    return this.provider.synthesizeSpeech(text, voiceOptions)
  }

  async getOrCreateLatestAudioBriefing(projectId: string, mode: VoiceBriefingMode = 'full') {
    const data = await this.getProjectBriefingData(projectId)
    const text = this.generateVoiceBriefingText(data, mode)
    const audio = text ? await this.generateAudioFromText(text) : null
    const snapshot = this.createVoiceReportSnapshot({ data, mode, audio })
    return { data, text, transcript: snapshot?.transcript ?? text, audio, snapshot, mode }
  }

  async regenerateAudioBriefing(projectId: string) {
    return this.getOrCreateLatestAudioBriefing(projectId, 'full')
  }
}

export const voiceBriefingService = new VoiceBriefingService()
