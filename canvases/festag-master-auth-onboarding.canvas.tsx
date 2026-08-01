import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactElement } from 'react'
import { Button, Row, Stack, Text, useCanvasState, useHostTheme } from 'cursor/canvas'

/**
 * FESTAG MASTER — Auth + Tagro Intelligence Layer
 * Register = identity only. Then: describe your goal → Tagro builds a Workspace Blueprint.
 * Clarify only when confidence is low. Appearance follows OS / host (prefer Read/light).
 */

type Appearance = 'dark' | 'light'

/** OS + Cursor host → Festag phone chrome. Prefers light/read when unclear. */
function useSystemAppearance(): Appearance {
	const host = useHostTheme()
	const [sys, setSys] = useState<Appearance>(() => {
		if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
			return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
		}
		/* Host SDK falls back to dark — Festag prefers ivory/read when unknown */
		return host.kind === 'dark' ? 'dark' : 'light'
	})
	useEffect(() => {
		if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
		const mq = window.matchMedia('(prefers-color-scheme: dark)')
		const apply = () => setSys(mq.matches ? 'dark' : 'light')
		apply()
		mq.addEventListener('change', apply)
		return () => mq.removeEventListener('change', apply)
	}, [])
	return sys
}

/** Same fluid mark as live Login/Register header. */
const MARK =
	'/Users/stefandirnberger/Documents/festag-mvp/public/brand/festag-mark-fluid.png'

type StepId = 'auth' | 'intent' | 'clarify' | 'connect' | 'preparing'

const STEPS: Array<{ id: StepId; label: string }> = [
	{ id: 'auth', label: 'Register' },
	{ id: 'intent', label: 'Ziel' },
	{ id: 'clarify', label: 'Passt das?' },
	{ id: 'connect', label: 'Quellen' },
	{ id: 'preparing', label: 'Prepare' },
]

/** User-facing page control — auth stays off-screen; each onboarding slide gets a bead */
const FLOW_DOTS: Array<{ id: 'intent' | 'clarify' | 'connect' | 'preparing'; label: string }> = [
	{ id: 'intent', label: 'Ziel' },
	{ id: 'clarify', label: 'Passt das?' },
	{ id: 'connect', label: 'Quellen' },
	{ id: 'preparing', label: 'Prepare' },
]

function flowDotIndex(sid: StepId): number {
	if (sid === 'intent') return 0
	if (sid === 'clarify') return 1
	if (sid === 'connect') return 2
	if (sid === 'preparing') return 3
	return -1
}

/** Mac Return / Enter — same geometry as AuthEnterGlyph (Cursor-style) */
function EnterReturnIcon({ size = 14 }: { size?: number }) {
	return (
		<svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
			<path
				d="M3.5 9.75h6.25A2.75 2.75 0 0 0 12.5 7V3.5"
				stroke="currentColor"
				strokeWidth="1.15"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M5.75 7.25 3.5 9.75l2.25 2.5"
				stroke="currentColor"
				strokeWidth="1.15"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	)
}

function ContinueHint({ onContinue }: { color?: string; onContinue?: () => void }) {
	return (
		<button
			type="button"
			onClick={() => onContinue?.()}
			style={{
				width: '100%',
				height: 46,
				margin: '16px 0 0',
				padding: '0 16px',
				display: 'inline-flex',
				alignItems: 'center',
				justifyContent: 'space-between',
				gap: 10,
				borderRadius: 8,
				border: '1px solid rgba(30, 30, 32, 0.08)',
				background: '#ffffff',
				color: '#1e1e20',
				boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
				fontFamily: 'Aeonik, system-ui, sans-serif',
				fontSize: 14.5,
				fontWeight: 400,
				letterSpacing: '0.01em',
				lineHeight: 1,
				cursor: 'pointer',
			}}
		>
			<span>Weiter</span>
			<span aria-hidden style={{ display: 'inline-flex', color: 'inherit', opacity: 0.72 }}>
				<EnterReturnIcon size={14} />
			</span>
		</button>
	)
}

function stepIndex(id: StepId): number {
	return STEPS.findIndex((s) => s.id === id)
}

const GOAL_EXAMPLES = [
	'Ich entwickle Websites für Kunden.',
	'Ich suche einen Freelancer für mein Startup.',
	'Ich organisiere Kundenprojekte zentral.',
	'Ich arbeite allein an einer SaaS.',
	'Wir sind eine Agentur mit acht Mitarbeitern.',
	'Ich suche einen Entwickler für mein Projekt.',
	'Ich möchte GitHub und Supabase anbinden.',
	'Ich leite ein Produktteam.',
	'Ich brauche klare Statusberichte für Kunden.',
	'Ich baue meine erste App.',
]

const CLARIFY_OPTIONS = ['Developer', 'Agentur', 'Startup', 'Unternehmen'] as const

/** Header copy per clarify choice — short, like onboarding live */
const CLARIFY_HEADER: Record<(typeof CLARIFY_OPTIONS)[number], { lead: string; muted: string }> = {
	Developer: {
		lead: 'Selbst entwickeln.',
		muted: 'Execution Panel zuerst — nah am Code.',
	},
	Agentur: {
		lead: 'Für Kunden liefern.',
		muted: 'Delivery zuerst — ruhige Statusberichte.',
	},
	Startup: {
		lead: 'Produkt-Team führen.',
		muted: 'Tempo mit Klarheit — ohne PM-Overhead.',
	},
	Unternehmen: {
		lead: 'Mehrere Streams steuern.',
		muted: 'Überblick zuerst — ein Workspace-Graph.',
	},
}

const CONNECT_HEADER_IDLE = {
	lead: 'Quellen verbinden.',
	muted: 'Was nutzt du schon?',
}

const CONNECT_HEADERS: Record<string, { lead: string; muted: string }> = {
	GitHub: { lead: 'GitHub anbinden.', muted: 'Repos und Status nah am Code.' },
	Figma: { lead: 'Figma anbinden.', muted: 'Designs und Freigaben im Projekt.' },
	Slack: { lead: 'Slack anbinden.', muted: 'Signale aus dem Team-Chat.' },
	Linear: { lead: 'Linear anbinden.', muted: 'Issues und Sprints im Graph.' },
	Notion: { lead: 'Notion anbinden.', muted: 'Docs bleiben im Workspace.' },
	'Google Calendar': { lead: 'Kalender anbinden.', muted: 'Termine und Deadlines sichtbar.' },
	Vercel: { lead: 'Vercel anbinden.', muted: 'Deploys und Previews im Blick.' },
	Supabase: { lead: 'Supabase anbinden.', muted: 'Daten und Auth im Blick.' },
	Jira: { lead: 'Jira anbinden.', muted: 'Tickets und Boards im Graph.' },
	Discord: { lead: 'Discord anbinden.', muted: 'Community-Signale im Workspace.' },
}

function connectHeaderFor(connected: string[]): { lead: string; muted: string } {
	if (connected.length === 0) return CONNECT_HEADER_IDLE
	if (connected.length === 1) {
		return CONNECT_HEADERS[connected[0]] ?? {
			lead: `${connected[0]} anbinden.`,
			muted: 'Im Workspace verfügbar.',
		}
	}
	if (connected.length === 2) {
		return {
			lead: `${connected[0]} und ${connected[1]}.`,
			muted: 'Weitere ergänzt du später.',
		}
	}
	return {
		lead: `${connected.length} Quellen verbunden.`,
		muted: 'Weitere ergänzt du später.',
	}
}

/** Primary caret / blink / focus stroke — lighter than fill `#5B647D` for thin lines */
const CARET_PRIMARY = '#7E889F'

/**
 * Canonical form field — Arbeits-E-Mail SSOT.
 * Every boxed input/textarea uses this height, type, pad, and click focus.
 */
const FIELD_H = 46
const FIELD_FONT = 15
const FIELD_PAD_X = 14
const FIELD_RADIUS = 8
const FIELD_LINE_H = Math.round(FIELD_FONT * 1.45)
const FIELD_GROW_STEP = FIELD_LINE_H * 2
const FIELD_PAD_Y = Math.max(0, Math.round((FIELD_H - 2 - FIELD_LINE_H) / 2))

/** Intent goal field — login email stroke, taller (2 lines) + grow */
const INTENT_FIELD_FONT = 17
const INTENT_LINE_H = Math.round(INTENT_FIELD_FONT * 1.45) // 25
const INTENT_GROW_STEP = INTENT_LINE_H * 2
const INTENT_SHELL_H = 78
const INTENT_PAD_Y = 14
const INTENT_PAD_X = 14
const INTENT_FIELD_MIN_H = INTENT_LINE_H * 2
const INTENT_FIELD_STEP_H = INTENT_GROW_STEP
const INTENT_LOGIN_H = FIELD_H
const INTENT_CARET_H = 20
/** Login email placeholder gray (#8891a0) */
const PLACEHOLDER = '#8891a0'

/** Always 2px — idle hairline, focus/filled accent (blur with value keeps stroke). */
function inputStroke(
	t: Theme,
	opts: { focused?: boolean; filled?: boolean } = {},
): Pick<CSSProperties, 'border' | 'boxShadow' | 'transition'> {
	const { focused = false, filled = false } = opts
	/* Live auth accent — filled keeps stroke after blur. */
	const stroke = focused || filled ? CARET_PRIMARY : t.hairline
	return {
		border: `2px solid ${stroke}`,
		boxShadow: 'none',
		transition: 'border-color .18s ease',
	}
}

/** Weiter only lights when the work email looks real — not just any short string. */
function isValidWorkEmail(raw: string): boolean {
	const e = raw.trim()
	return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)
}

type TagroBlueprint = {
	workspaceType: string
	confidence: number
	mode: 'developer' | 'client' | 'hybrid' | ''
	signals: Array<{ label: string; score: number }>
	modules: string[]
	integrations: string[]
	navigation: string[]
	primaryGoal: string
	needs: string[]
	needsClarify: boolean
	intentSummary: string
}

function analyzeIntent(raw: string, clarifyPick = ''): TagroBlueprint {
	const s = raw.trim().toLowerCase()
	const empty: TagroBlueprint = {
		workspaceType: '—',
		confidence: 0,
		mode: '',
		signals: [],
		modules: [],
		integrations: [],
		navigation: ['Dashboard', 'Projects', 'Tagro'],
		primaryGoal: '',
		needs: [],
		needsClarify: false,
		intentSummary: '',
	}
	if (s.length < 4 && !clarifyPick) return empty

	let agency = 0
	let freelancer = 0
	let startup = 0
	let company = 0
	let developer = 0
	let client = 0
	let github = 0
	let figma = 0
	let portal = 0

	if (/agentur|agency|mitarbeiter|kundenprojekt/.test(s)) agency += 42
	if (/kunde|kunden|client|extern/.test(s)) {
		agency += 18
		client += 28
		portal += 35
	}
	if (/freelance|freelancer|allein|solo|selbstständig/.test(s)) freelancer += 48
	if (/startup|gründung|mvp|saas/.test(s)) startup += 44
	if (/unternehmen|firma|company|enterprise|konzern|team leiten|produktteam/.test(s)) company += 40
	if (/entwickl|bau|software|app|code|github|frontend|backend|webseite|website/.test(s)) developer += 40
	if (/suche.*(freelancer|entwickler)|brauche.*(freelancer|entwickler)/.test(s)) {
		client += 35
		portal += 25
	}
	if (/github|supabase|vercel|repo/.test(s)) github += 55
	if (/figma|design/.test(s)) figma += 40
	if (/organisieren|projektmanagement|status|rechnung|invoice/.test(s)) {
		agency += 12
		portal += 20
	}

	if (clarifyPick === 'Agentur') agency += 55
	if (clarifyPick === 'Developer') {
		developer += 55
		freelancer += 40
	}
	if (clarifyPick === 'Startup') startup += 55
	if (clarifyPick === 'Unternehmen') company += 55

	const typeScores: Array<[string, number]> = [
		['Agency', agency],
		['Developer', Math.max(freelancer, developer)],
		['Startup', startup],
		['Company', company],
	]
	typeScores.sort((a, b) => b[1] - a[1])
	const topType = typeScores[0][0]
	const topScore = typeScores[0][1]
	const second = typeScores[1][1]
	const confidence = Math.min(98, Math.max(0, Math.round(topScore + (topScore - second) * 0.35)))

	let mode: TagroBlueprint['mode'] = ''
	if (developer >= 28 && client >= 28) mode = 'hybrid'
	else if (client > developer + 8) mode = 'client'
	else if (developer > 20) mode = 'developer'
	else if (topType === 'Agency' || topType === 'Developer') mode = 'hybrid'
	else if (topType === 'Company') mode = 'client'
	else if (topType === 'Startup') mode = 'developer'

	const signals: Array<{ label: string; score: number }> = []
	if (agency > 12) signals.push({ label: 'Agency', score: Math.min(99, agency + 20) })
	if (developer > 12 || freelancer > 12)
		signals.push({ label: 'Developer', score: Math.min(99, Math.max(developer, freelancer) + 22) })
	if (startup > 12) signals.push({ label: 'Startup', score: Math.min(99, startup + 22) })
	if (company > 12) signals.push({ label: 'Company', score: Math.min(99, company + 20) })
	if (github > 20) signals.push({ label: 'Needs GitHub', score: Math.min(99, github + 20) })
	if (portal > 20) signals.push({ label: 'Likely Client Portal', score: Math.min(99, portal + 18) })
	if (figma > 20) signals.push({ label: 'Needs Figma', score: Math.min(99, figma + 18) })
	signals.sort((a, b) => b.score - a.score)

	const modulesByType: Record<string, string[]> = {
		Agency: ['Projects', 'Clients', 'Tasks', 'Status Reports', 'Files', 'Billing'],
		Developer: ['Projects', 'Tasks', 'Files', 'Invoices', 'Messages'],
		Startup: ['Projects', 'Tasks', 'Roadmap', 'Git', 'AI'],
		Company: ['Overview', 'Projects', 'People', 'Reports', 'Files'],
	}
	const navByMode: Record<string, string[]> = {
		developer: ['Dashboard', 'Projects', 'Git', 'Tasks', 'Tagro'],
		client: ['Dashboard', 'Projects', 'Progress', 'Files', 'Tagro'],
		hybrid: ['Dashboard', 'Projects', 'Clients', 'Tasks', 'Tagro'],
		'': ['Dashboard', 'Projects', 'Tagro'],
	}
	const integByType: Record<string, string[]> = {
		Agency: ['GitHub', 'Figma', 'Slack', 'Google Calendar', 'Notion'],
		Developer: ['GitHub', 'Figma', 'Slack', 'Google Calendar'],
		Startup: ['GitHub', 'Linear', 'Supabase', 'Vercel', 'Notion'],
		Company: ['Microsoft', 'Jira', 'Slack', 'Google Calendar', 'GitHub'],
	}

	const modules = modulesByType[topType] || ['Projects', 'Tasks', 'Files']
	const integrations = [
		...(github > 20 ? ['GitHub', 'Supabase'] : []),
		...(figma > 20 ? ['Figma'] : []),
		...(integByType[topType] || INTEGRATIONS.default),
	]
	const seen = new Set<string>()
	const integrationsUnique = integrations.filter((x) => (seen.has(x) ? false : (seen.add(x), true))).slice(0, 6)

	const needs: string[] = []
	if (client > 15) needs.push('Clients')
	if (developer > 15) needs.push('Delivery')
	if (portal > 20) needs.push('Status & Freigaben')
	if (freelancer > 20 || /freelancer|entwickler/.test(s)) needs.push('Collaborators')
	if (github > 20) needs.push('Repos')

	let primaryGoal = 'Workspace einrichten'
	if (/webseite|website|app|saas|produkt/.test(s)) primaryGoal = 'Digitale Produkte bauen'
	else if (/suche|brauche/.test(s)) primaryGoal = 'Mitwirkende finden'
	else if (/organisieren|projektmanagement/.test(s)) primaryGoal = 'Arbeit organisieren'
	else if (/kunde/.test(s)) primaryGoal = 'Kundenarbeit liefern'

	const needsClarify = s.length >= 6 && confidence > 0 && confidence < 72 && !clarifyPick

	return {
		workspaceType: topScore > 8 ? topType : '—',
		confidence: topScore > 8 ? confidence : 0,
		mode,
		signals: signals.slice(0, 5),
		modules,
		integrations: integrationsUnique,
		navigation: navByMode[mode] || navByMode[''],
		primaryGoal,
		needs: needs.slice(0, 4),
		needsClarify,
		intentSummary: raw.trim().slice(0, 160),
	}
}

const INTEGRATIONS: Record<string, string[]> = {
	developer: ['GitHub', 'Linear', 'Supabase', 'Vercel', 'Jira', 'Slack'],
	client: ['Slack', 'Figma', 'Notion', 'Google Drive', 'Google Calendar'],
	hybrid: ['GitHub', 'Slack', 'Figma', 'Notion', 'Linear', 'Google Calendar'],
	Agency: ['Slack', 'Figma', 'Notion', 'GitHub', 'Linear'],
	Startup: ['Notion', 'GitHub', 'Linear', 'Slack', 'Vercel'],
	Company: ['Microsoft', 'Jira', 'Slack', 'GitHub', 'Google Calendar'],
	default: ['GitHub', 'Linear', 'Jira', 'Slack', 'Figma', 'Notion', 'Discord', 'Google Calendar'],
}

const PREP_LINES = [
	'Blueprint anwenden…',
	'Module einrichten…',
	'Navigation anpassen…',
	'Empfehlungen aufbauen…',
	'Gleich soweit…',
]

export default function FestagMasterAuthOnboarding() {
	const [step, setStep] = useCanvasState('step', 0)
	const [authMode, setAuthMode] = useCanvasState<'login' | 'register'>('authMode', 'login')
	const [displayName, setDisplayName] = useCanvasState('displayName', '')
	const [email, setEmail] = useCanvasState('email', '')
	const [intentText, setIntentText] = useCanvasState('intentText', '')
	const [clarifyPick, setClarifyPick] = useCanvasState('clarifyPick', '')
	const [connected, setConnected] = useCanvasState<string[]>('connected', [])
	const [heroTick, setHeroTick] = useState(0)
	const [prepProgress, setPrepProgress] = useCanvasState('prepProgress', 0)
	const [prepReady, setPrepReady] = useCanvasState('prepReady', false)
	/* auto = follow phone/laptop OS; lock to light (Read) or dark when chrome buttons used */
	const [appearanceLock, setAppearanceLock] = useCanvasState<'auto' | Appearance>(
		'appearanceLock',
		'auto',
	)
	const [deviceFrame, setDeviceFrame] = useCanvasState<'desktop' | 'mobile'>(
		'deviceFrame',
		'desktop',
	)
	const systemAppearance = useSystemAppearance()
	const appearance: Appearance =
		appearanceLock === 'auto' ? systemAppearance : appearanceLock
	const isDesktop = deviceFrame === 'desktop'
	const [dragX, setDragX] = useState(0)
	const [dragging, setDragging] = useState(false)
	const [intentReady, setIntentReady] = useState(false)
	const [docsOpen, setDocsOpen] = useState(false)
	const touchRef = useRef<{ x: number; y: number; locked: boolean | null } | null>(null)
	const t = useMemo(() => themeFor(appearance), [appearance])

	const i = Math.min(Math.max(step, 0), STEPS.length - 1)
	const sid = STEPS[i].id
	const name = displayName.trim() || 'Stefan'
	const blueprint = useMemo(
		() => analyzeIntent(intentText, clarifyPick),
		[intentText, clarifyPick],
	)
	const rankedIntegrations = useMemo(() => {
		const seen = new Set<string>()
		const out: string[] = []
		for (const x of [...blueprint.integrations, ...INTEGRATIONS.default]) {
			if (!seen.has(x)) {
				seen.add(x)
				out.push(x)
			}
		}
		return out.slice(0, 8)
	}, [blueprint.integrations])

	const flowDots = FLOW_DOTS
	const flowActive = flowDotIndex(sid)

	useEffect(() => {
		setHeroTick((n) => n + 1)
	}, [sid, authMode])

	useEffect(() => {
		function onKey(ev: Event) {
			const e = ev as KeyboardEvent
			if (e.key !== 'Enter' || e.shiftKey || e.metaKey || e.ctrlKey || e.altKey) return
			const el = e.target as HTMLElement | null
			if (el && (el.tagName === 'TEXTAREA' || el.isContentEditable)) return

			const canClarify = sid === 'clarify' && Boolean(clarifyPick)
			const canConnect = sid === 'connect' && connected.length > 0
			if (!canClarify && !canConnect) return

			e.preventDefault()
			if (canClarify) go(stepIndex('connect'))
			else go(stepIndex('preparing'))
		}
		window.addEventListener('keydown', onKey)
		return () => window.removeEventListener('keydown', onKey)
	}, [sid, clarifyPick, connected.length])

	function go(n: number) {
		setDragX(0)
		setStep(Math.min(Math.max(n, 0), STEPS.length - 1))
	}

	function goAfterIntent() {
		const bp = analyzeIntent(intentText, clarifyPick)
		if (bp.needsClarify) go(stepIndex('clarify'))
		else go(stepIndex('connect'))
	}

	function toggleSource(src: string) {
		setConnected(
			connected.includes(src)
				? connected.filter((x) => x !== src)
				: [...connected, src],
		)
	}

	function canContinue() {
		if (sid === 'auth') {
			const emailOk = isValidWorkEmail(email)
			if (authMode === 'register') return name.trim().length > 1 && emailOk
			return emailOk
		}
		return true
	}

	/** Forward swipe only when the step has a real choice / fill. */
	function canSwipeForward() {
		/* Intent: not “enough characters” alone — Tagro waits until typing settles */
		if (sid === 'intent') return intentReady
		if (sid === 'clarify') return Boolean(clarifyPick)
		if (sid === 'connect') return connected.length > 0
		if (sid === 'preparing') return prepReady
		return false
	}

	function canSwipeBack() {
		return sid !== 'auth'
	}

	function advance() {
		if (sid === 'intent') {
			goAfterIntent()
			return
		}
		if (sid === 'clarify') {
			go(stepIndex('connect'))
			return
		}
		if (sid === 'connect') {
			go(stepIndex('preparing'))
			return
		}
		if (sid === 'preparing' && prepReady) {
			go(stepIndex('auth'))
		}
	}

	function retreat() {
		if (sid === 'preparing') {
			go(stepIndex('connect'))
			return
		}
		if (sid === 'connect') {
			/* Prefer Passt-das when that slide was visited; else Ziel */
			go(stepIndex(clarifyPick ? 'clarify' : 'intent'))
			return
		}
		if (sid === 'clarify') {
			go(stepIndex('intent'))
			return
		}
		if (sid === 'intent') {
			go(stepIndex('auth'))
		}
	}

	function onClarifyPick(v: string) {
		setClarifyPick(v)
	}

	function onFlowDotClick(dotId: (typeof FLOW_DOTS)[number]['id']) {
		const targetFlow = FLOW_DOTS.findIndex((d) => d.id === dotId)
		if (targetFlow < 0) return
		/* Canvas navigation mode — jump to any flow page, including Prepare. */
		go(stepIndex(dotId))
	}

	function isSwipeBlockedTarget(target: EventTarget | null) {
		const el = target as { closest?: (s: string) => unknown } | null
		if (!el?.closest) return false
		return Boolean(
			el.closest('input, textarea, button, a, [role="status"]'),
		)
	}

	function onPointerDown(clientX: number, clientY: number, target?: EventTarget | null) {
		if (sid === 'auth' || docsOpen) return
		if (isSwipeBlockedTarget(target ?? null)) {
			touchRef.current = null
			return
		}
		touchRef.current = { x: clientX, y: clientY, locked: null }
	}

	function onPointerMove(clientX: number, clientY: number) {
		const start = touchRef.current
		if (!start) return
		const dx = clientX - start.x
		const dy = clientY - start.y
		if (start.locked === null) {
			if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return
			start.locked = Math.abs(dx) > Math.abs(dy) * 1.15
			if (!start.locked) {
				touchRef.current = null
				return
			}
			setDragging(true)
		}
		if (!start.locked) return
		const blockFwd = dx < 0 && !canSwipeForward()
		const blockBack = dx > 0 && !canSwipeBack()
		const resistance = blockFwd || blockBack ? 0.22 : 1
		setDragX(dx * resistance)
	}

	function onPointerUp() {
		const start = touchRef.current
		touchRef.current = null
		const dx = dragX
		const wasDragging = dragging
		setDragging(false)
		if (start?.locked && wasDragging && Math.abs(dx) > 56) {
			if (dx < 0 && canSwipeForward()) {
				advance()
				return
			}
			if (dx > 0 && canSwipeBack()) {
				retreat()
				return
			}
		}
		setDragX(0)
	}

	return (
		<Stack
			gap={16}
			style={{
				padding: 20,
				minHeight: '100%',
				fontFamily: 'Aeonik, system-ui, sans-serif',
				fontWeight: 400,
				letterSpacing: '0.01em',
			}}
		>
			<style>{CSS}</style>
			<Row gap={12} align="center" wrap>
				<Text
					style={{
						fontSize: 15,
						fontFamily: 'Aeonik, system-ui, sans-serif',
						fontWeight: 400,
						letterSpacing: '0.01em',
					}}
				>
					Festag Master — Auth & Onboarding
				</Text>
				<Text
					tone="tertiary"
					style={{
						fontSize: 12,
						fontFamily: 'Aeonik, system-ui, sans-serif',
						fontWeight: 400,
						letterSpacing: '0.01em',
					}}
				>
					Identity → Goal → Tagro Blueprint → Sources → Prepare
				</Text>
				<div style={{ flex: 1, minWidth: 8 }} />
				{/* Theme — follows OS by default; Read = warm ivory #FBF7EE */}
				<Row gap={6} align="center">
					<Text
						tone="tertiary"
						style={{
							fontSize: 12,
							fontFamily: 'Aeonik, system-ui, sans-serif',
							fontWeight: 400,
							letterSpacing: '0.01em',
						}}
					>
						Frame
					</Text>
					<Button
						variant={deviceFrame === 'desktop' ? 'primary' : 'secondary'}
						onClick={() => setDeviceFrame('desktop')}
					>
						Desktop
					</Button>
					<Button
						variant={deviceFrame === 'mobile' ? 'primary' : 'secondary'}
						onClick={() => setDeviceFrame('mobile')}
					>
						Mobile
					</Button>
				</Row>
				<div style={{ width: 12 }} />
				<Row gap={6} align="center">
					<Text
						tone="tertiary"
						style={{
							fontSize: 12,
							fontFamily: 'Aeonik, system-ui, sans-serif',
							fontWeight: 400,
							letterSpacing: '0.01em',
						}}
					>
						Appearance
					</Text>
					<Button
						variant={appearanceLock === 'auto' ? 'primary' : 'secondary'}
						onClick={() => setAppearanceLock('auto')}
					>
						Auto
					</Button>
					<Button
						variant={appearanceLock === 'light' ? 'primary' : 'secondary'}
						onClick={() => setAppearanceLock('light')}
					>
						Read
					</Button>
					<Button
						variant={appearanceLock === 'dark' ? 'primary' : 'secondary'}
						onClick={() => setAppearanceLock('dark')}
					>
						Night
					</Button>
				</Row>
			</Row>

			<Row gap={6} wrap>
				{STEPS.map((s, idx) => (
					<span key={s.id}>
						<Button
							variant={idx === i ? 'primary' : 'secondary'}
							onClick={() => go(idx)}
						>
							{idx + 1}. {s.label}
						</Button>
					</span>
				))}
			</Row>
			{sid === 'auth' ? (
				<Row gap={8}>
					<Button
						variant={authMode === 'login' ? 'primary' : 'secondary'}
						onClick={() => setAuthMode('login')}
					>
						Login
					</Button>
					<Button
						variant={authMode === 'register' ? 'primary' : 'secondary'}
						onClick={() => setAuthMode('register')}
					>
						Register
					</Button>
				</Row>
			) : null}

			<Row gap={24} align="start" wrap>
				<div style={isDesktop ? desktopShell(t) : phoneShell(t)}>
					<div
						className="master-phone"
						style={{
							...(isDesktop ? desktopScreen(t) : phoneScreen(t)),
							transform: sid === 'auth' || isDesktop ? undefined : `translateX(${dragX}px)`,
							transition: dragging
								? 'none'
								: 'transform .42s cubic-bezier(.22,1,.36,1)',
							willChange: dragging ? 'transform' : 'auto',
							touchAction: sid === 'auth' || isDesktop ? 'auto' : 'pan-y',
						}}
						onTouchStart={(e: {
							touches: Array<{ clientX: number; clientY: number }>
							target: EventTarget | null
						}) => {
							if (isDesktop) return
							const p = e.touches[0]
							if (p) onPointerDown(p.clientX, p.clientY, e.target)
						}}
						onTouchMove={(e: { touches: Array<{ clientX: number; clientY: number }> }) => {
							if (isDesktop) return
							const p = e.touches[0]
							if (p) onPointerMove(p.clientX, p.clientY)
						}}
						onTouchEnd={() => {
							if (isDesktop) return
							onPointerUp()
						}}
						onTouchCancel={() => {
							if (isDesktop) return
							touchRef.current = null
							setDragging(false)
							setDragX(0)
						}}
						onMouseDown={(e: { clientX: number; clientY: number; target: EventTarget | null }) => {
							if (isDesktop) return
							onPointerDown(e.clientX, e.clientY, e.target)
						}}
						onMouseMove={(e: { clientX: number; clientY: number }) => {
							if (isDesktop || !touchRef.current) return
							onPointerMove(e.clientX, e.clientY)
						}}
						onMouseUp={() => {
							if (isDesktop) return
							onPointerUp()
						}}
						onMouseLeave={() => {
							if (isDesktop) return
							if (touchRef.current) onPointerUp()
						}}
					>
						{sid !== 'preparing' ? (
						<div
							style={{
								...headerBar,
								...(isDesktop
									? {
											width: '100%',
											maxWidth: 'none',
											margin: 0,
											paddingLeft: 36,
											paddingRight: 36,
											justifyContent: 'space-between',
											boxSizing: 'border-box' as const,
										}
									: null),
							}}
						>
							<button
								type="button"
								aria-label="Zur Anmeldung"
								onClick={() => {
									setAuthMode('login')
									go(stepIndex('auth'))
								}}
								style={{
									display: 'inline-flex',
									alignItems: 'center',
									justifyContent: 'center',
									width: 40,
									height: 40,
									margin: 0,
									padding: 0,
									border: 'none',
									background: 'transparent',
									cursor: 'pointer',
								}}
							>
								<img
									src={MARK}
									alt=""
									width={36}
									height={36}
									style={{
										width: 36,
										height: 36,
										objectFit: 'contain',
										/* Match Login light — fluid mark inked on ivory */
										filter: t.mode === 'light' ? 'brightness(0) saturate(100%)' : 'none',
										opacity: 0.9,
									}}
								/>
							</button>
							<div style={{ flex: 1 }} />
							<button
								type="button"
								aria-label="Dokumentation"
								aria-expanded={docsOpen}
								onClick={() => setDocsOpen(true)}
								style={{
									width: 36,
									height: 36,
									borderRadius: 8,
									border: 'none',
									background: 'transparent',
									display: 'inline-flex',
									alignItems: 'center',
									justifyContent: 'center',
									cursor: 'pointer',
									padding: 0,
								}}
							>
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
									<path
										d="M4 5.5A2.5 2.5 0 0 1 6.5 3H12v16.5H6.5A2.5 2.5 0 0 0 4 22V5.5Z"
										stroke={t.ink}
										strokeOpacity={0.55}
										strokeWidth="1.6"
										strokeLinejoin="round"
									/>
									<path
										d="M20 5.5A2.5 2.5 0 0 0 17.5 3H12v16.5h5.5A2.5 2.5 0 0 1 20 22V5.5Z"
										stroke={t.ink}
										strokeOpacity={0.55}
										strokeWidth="1.6"
										strokeLinejoin="round"
									/>
								</svg>
							</button>
						</div>
						) : null}

						<div
							style={{
								...contentArea,
								...(sid === 'preparing'
									? {
											padding: '0 28px 28px',
											justifyContent: 'center',
										}
									: {
											justifyContent: 'center',
											paddingTop: isDesktop ? 28 : 16,
											paddingBottom: sid === 'auth' ? 28 : 100,
										}),
							}}
						>
							<div
								style={{
									...contentCard,
									...(sid === 'preparing'
										? {
												margin: 0,
												flex: 1,
												maxWidth: '100%',
												justifyContent: 'center',
												minHeight: 0,
											}
										: {
												flex: '0 1 auto',
												maxHeight: '100%',
											}),
								}}
								key={`${sid}-${authMode}-${heroTick}`}
							>
								{sid === 'auth' ? (
									<AuthStage
										t={t}
										mode={authMode}
										name={displayName}
										email={email}
										onName={setDisplayName}
										onEmail={setEmail}
										onSwitchMode={(m: 'login' | 'register') => setAuthMode(m)}
										onProvider={(provider) => {
											const person =
												provider === 'apple'
													? {
															name: 'Stefan Dirnberger',
															email: 'stefan@icloud.com',
														}
													: {
															name: 'Stefan Dirnberger',
															email: 'stefan@gmail.com',
														}
											setDisplayName(person.name)
											setEmail(person.email)
											if (authMode === 'login') {
												go(STEPS.findIndex((s) => s.id === 'preparing'))
											} else {
												go(STEPS.findIndex((s) => s.id === 'intent'))
											}
										}}
										onWeiter={() => {
											if (!canContinue()) return
											if (authMode === 'login') go(STEPS.findIndex((s) => s.id === 'preparing'))
											else go(i + 1)
										}}
									/>
								) : null}
								{sid === 'intent' ? (
									<IntentCanvasStage
										t={t}
										value={intentText}
										onChange={(v) => {
											setIntentText(v)
											setIntentReady(false)
										}}
										onReadyChange={setIntentReady}
										onAdvance={goAfterIntent}
										ready={intentReady}
									/>
								) : null}
								{sid === 'clarify' ? (
									<ClarifyStage
										t={t}
										value={clarifyPick}
										onPick={onClarifyPick}
										onContinue={advance}
										blueprint={blueprint}
									/>
								) : null}
								{sid === 'connect' ? (
									<ConnectStage
										t={t}
										sources={rankedIntegrations}
										connected={connected}
										onToggle={toggleSource}
										onContinue={advance}
									/>
								) : null}
								{sid === 'preparing' ? (
									<PreparingStage
										t={t}
										onProgress={(p, ready) => {
											setPrepProgress(p)
											setPrepReady(ready)
										}}
									/>
								) : null}
							</div>
						</div>

						{flowActive >= 0 ? (
							<div
								style={{
									position: 'absolute',
									left: 0,
									right: 0,
									bottom: 0,
									zIndex: 6,
									display: 'flex',
									flexDirection: 'column',
									alignItems: 'center',
									gap: 8,
									padding: isDesktop
										? '16px 24px 24px'
										: '10px 20px calc(12px + 12px)',
									background: 'transparent',
									boxSizing: 'border-box',
									pointerEvents: 'none',
								}}
							>
								{sid === 'preparing' ? (
									/* Slim continuous bar — same ink language as the old beads */
									<button
										type="button"
										aria-label={
											prepReady ? 'Festag öffnen' : 'Workspace wird eingerichtet'
										}
										aria-busy={!prepReady}
										aria-valuemin={0}
										aria-valuemax={100}
										aria-valuenow={Math.round(prepProgress * 100)}
										onClick={() => {
											if (prepReady) go(0)
										}}
										style={{
											display: 'flex',
											flexDirection: 'row',
											alignItems: 'center',
											justifyContent: 'center',
											height: 36,
											minHeight: 36,
											padding: 0,
											border: 'none',
											background: 'transparent',
											boxShadow: 'none',
											cursor: prepReady ? 'pointer' : 'default',
											pointerEvents: 'auto',
											fontFamily: 'inherit',
										}}
									>
										<span
											aria-hidden
											style={{
												position: 'relative',
												display: 'block',
												width: 112,
												height: 3,
												borderRadius: 999,
												background: t.dotIdle,
												overflow: 'hidden',
											}}
										>
											<span
												style={{
													position: 'absolute',
													left: 0,
													top: 0,
													bottom: 0,
													width: `${Math.round((prepReady ? 1 : prepProgress) * 100)}%`,
													borderRadius: 999,
													background: t.ink,
													opacity: prepReady ? 0.9 : 0.72,
													transition:
														'width .28s cubic-bezier(.22,1,.36,1), opacity .2s ease',
												}}
											/>
										</span>
									</button>
								) : (
									<div
										style={{
											position: 'relative',
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'center',
											pointerEvents: 'none',
										}}
									>
										{sid === 'clarify' || sid === 'connect' ? (
											<button
												type="button"
												aria-label="Zurück"
												onClick={retreat}
												style={{
													position: 'absolute',
													right: 'calc(100% + 12px)',
													top: '50%',
													transform: 'translateY(-50%)',
													display: 'inline-flex',
													alignItems: 'center',
													justifyContent: 'center',
													width: isDesktop ? 30 : 28,
													height: isDesktop ? 30 : 28,
													margin: 0,
													padding: 0,
													border: 'none',
													borderRadius: 8,
													background: 'transparent',
													color: t.mode === 'light'
														? 'rgba(26, 25, 23, 0.38)'
														: 'rgba(230, 230, 234, 0.38)',
													cursor: 'pointer',
													pointerEvents: 'auto',
												}}
											>
												<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
													<path
														d="M10 3.5 5.5 8 10 12.5"
														stroke="currentColor"
														strokeWidth="1.5"
														strokeLinecap="round"
														strokeLinejoin="round"
													/>
												</svg>
											</button>
										) : null}
										<div
											style={{
												...appleDotsTrack(t),
												position: 'relative',
												left: 'auto',
												transform: 'none',
												bottom: 'auto',
												pointerEvents: 'auto',
												background: 'transparent',
												boxShadow: 'none',
												border: 'none',
												padding: 0,
												minHeight: 8,
											}}
											role="tablist"
											aria-label="Onboarding-Fortschritt"
										>
											{flowDots.map((s, di) => {
												const active = di === flowActive
												const done = di < flowActive
												return (
													<button
														key={s.id}
														type="button"
														aria-label={`${s.label}${active ? ', aktuelle Folie' : ''}`}
														aria-current={active ? 'step' : undefined}
														onClick={() => onFlowDotClick(s.id)}
														style={{
															...appleDotBead(
																t,
																active ? 'active' : done ? 'done' : 'idle',
															),
															border: 'none',
															padding: 0,
															margin: 0,
															cursor: 'pointer',
															background: undefined,
															transition:
																'width .38s cubic-bezier(.22,1,.36,1), background .28s ease',
														}}
													/>
												)
											})}
										</div>
									</div>
								)}
							</div>
						) : null}

						<AuthDocsSheet
							t={t}
							open={docsOpen}
							onClose={() => setDocsOpen(false)}
							desktop={isDesktop}
						/>
					</div>
				</div>
			</Row>
		</Stack>
	)
}

function ConnectStage({
	t,
	sources,
	connected,
	onToggle,
	onContinue,
}: {
	t: Theme
	sources: string[]
	connected: string[]
	onToggle: (name: string) => void
	onContinue?: () => void
}) {
	/*
	 * Soft edge fades via overlays (not mask-image).
	 * Color must match the phone wash at that Y — flat canvas looks lighter
	 * than the warmer bottom stop (#F3F0E8) and reads as a white haze.
	 * Fade opacity also drops at scroll ends so nothing sits on empty padding.
	 */
	const listRef = useRef<HTMLDivElement | null>(null)
	const [fadeTop, setFadeTop] = useState(0)
	const [fadeBottom, setFadeBottom] = useState(1)

	function syncFades() {
		const el = listRef.current
		if (!el) return
		const max = Math.max(0, el.scrollHeight - el.clientHeight)
		if (max < 2) {
			setFadeTop(0)
			setFadeBottom(0)
			return
		}
		const y = el.scrollTop
		setFadeTop(Math.min(1, y / 28))
		setFadeBottom(Math.min(1, (max - y) / 36))
	}

	useEffect(() => {
		syncFades()
		const el = listRef.current
		if (!el) return
		const ro = new ResizeObserver(() => syncFades())
		ro.observe(el)
		return () => ro.disconnect()
	}, [sources.length, connected.length])

	const fadeHue = t.canvas
	const header = connectHeaderFor(connected)

	return (
		<>
			<MasterGlassyH1
				key={`connect-${header.lead}`}
				t={t}
				lead={header.lead}
				rest={header.muted}
				stacked
			/>

			<div style={{ position: 'relative', width: '100%', marginTop: 16, marginBottom: 4 }}>
				<div
					ref={listRef}
					onScroll={syncFades}
					style={{
						maxHeight: 288,
						overflowY: 'auto',
						overflowX: 'hidden',
						display: 'flex',
						flexDirection: 'column',
						gap: 6,
						paddingTop: 10,
						paddingBottom: 56,
						paddingLeft: 0,
						paddingRight: 0,
						scrollbarWidth: 'none',
					}}
				>
					{sources.map((src) => {
						const on = connected.includes(src)
						const Logo = logoForSource(src, t.markInk)
						return (
							<button
								key={src}
								type="button"
								className={`master-choice${on ? ' is-on' : ''}`}
								onClick={(e: { currentTarget: HTMLButtonElement }) => {
									onToggle(src)
									/* Keep selection in the solid band when possible */
									const el = e.currentTarget
									requestAnimationFrame(() => {
										el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
									})
								}}
								style={{
									...choiceRow(t, { on }),
									display: 'flex',
									alignItems: 'center',
									gap: 12,
								}}
							>
								<span
									style={{
										width: 28,
										height: 28,
										borderRadius: 6,
										display: 'inline-flex',
										alignItems: 'center',
										justifyContent: 'center',
										background: t.iconTile,
										flexShrink: 0,
									}}
								>
									<Logo />
								</span>
								<span
									style={{
										flex: 1,
										fontSize: FIELD_FONT,
										color: t.ink,
										letterSpacing: '0.01em',
										lineHeight: 1.25,
										opacity: on ? 1 : 0.88,
									}}
								>
									{src}
								</span>
								<span style={{ fontSize: 12.5, color: t.muted, letterSpacing: '0.01em' }}>
									{on ? 'Verbunden' : 'Bald'}
								</span>
							</button>
						)
					})}
				</div>
				{/* Soft dissolve in canvas mid hue — no hard wash-bottom edge */}
				<div
					aria-hidden
					style={{
						pointerEvents: 'none',
						position: 'absolute',
						left: 0,
						right: 0,
						top: 0,
						height: 22,
						opacity: fadeTop,
						background: `linear-gradient(to bottom, ${hexAlpha(fadeHue, 1)} 0%, ${hexAlpha(fadeHue, 0.55)} 55%, ${hexAlpha(fadeHue, 0)} 100%)`,
						zIndex: 2,
						transition: 'opacity .18s ease',
					}}
				/>
				<div
					aria-hidden
					style={{
						pointerEvents: 'none',
						position: 'absolute',
						left: 0,
						right: 0,
						bottom: -10,
						height: 108,
						opacity: fadeBottom,
						background: `linear-gradient(to top, ${hexAlpha(fadeHue, 1)} 0%, ${hexAlpha(fadeHue, 0.88)} 22%, ${hexAlpha(fadeHue, 0.48)} 52%, ${hexAlpha(fadeHue, 0.16)} 78%, ${hexAlpha(fadeHue, 0)} 100%)`,
						zIndex: 2,
						transition: 'opacity .18s ease',
					}}
				/>
			</div>

			<p
				style={{
					margin: '10px 0 0',
					fontSize: 12,
					color: t.muted,
					letterSpacing: '0.01em',
					textAlign: 'left',
					lineHeight: 1.4,
				}}
			>
				Weitere Quellen ergänzt du später im Execution Panel.
			</p>
			{connected.length > 0 ? <ContinueHint onContinue={onContinue} /> : null}
		</>
	)
}

/** Keep fade hue identical while alpha falls — avoids muddy black→transparent mixes. */
function hexAlpha(hex: string, alpha: number): string {
	const h = hex.replace('#', '')
	const full =
		h.length === 3
			? h
					.split('')
					.map((c) => c + c)
					.join('')
			: h
	const n = parseInt(full, 16)
	const r = (n >> 16) & 255
	const g = (n >> 8) & 255
	const b = n & 255
	return `rgba(${r},${g},${b},${alpha})`
}

function logoForSource(name: string, markInk: string): () => ReactElement {
	const key = name.toLowerCase()
	if (key.includes('github')) return () => <LogoGithub ink={markInk} />
	if (key.includes('linear')) return LogoLinear
	if (key.includes('jira')) return LogoJira
	if (key.includes('slack')) return LogoSlack
	if (key.includes('notion')) return () => <LogoNotion ink={markInk} />
	if (key.includes('figma')) return LogoFigma
	if (key.includes('vercel')) return () => <LogoVercel ink={markInk} />
	if (key.includes('discord')) return LogoDiscord
	if (key.includes('calendar') || key.includes('google')) return LogoGoogle
	if (key.includes('microsoft')) return LogoMicrosoft
	if (key.includes('supabase')) return LogoSupabase
	return () => <LogoFallback ink={markInk} />
}

function LogoGithub({ ink = '#FFFFFF' }: { ink?: string }) {
	return (
		<svg width="16" height="16" viewBox="0 0 98 96" aria-hidden>
			<path
				fill={ink}
				fillRule="evenodd"
				clipRule="evenodd"
				d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.876 0 48.854 0z"
			/>
		</svg>
	)
}
function LogoLinear() {
	return (
		<svg width="15" height="15" viewBox="0 0 100 100" aria-hidden>
			<path
				fill="#5E6AD2"
				d="M1.227 61.122 38.878 98.773a4.64 4.64 0 0 0 7.17-.542L1.77 53.12a4.64 4.64 0 0 0-.543 8.002Zm6.98-13.78 43.43 43.43a4.64 4.64 0 0 0 2.26-1.07L10.533 44.27a4.64 4.64 0 0 0-2.326 3.072ZM14.32 38.04l47.64 47.64a57 57 0 0 0 4.53-4.97L19.29 33.51a57 57 0 0 0-4.97 4.53Zm9.75-8.08 45.97 45.97C92.05 52.4 92.05 20.28 69.96 5.72L24.07 29.96Zm21.36-21.2C30.45 3.64 11.25 18.76 6.3 38.1L45.43 8.76Z"
			/>
		</svg>
	)
}
function LogoJira() {
	return (
		<svg width="15" height="15" viewBox="0 0 32 32" aria-hidden>
			<path
				fill="#2684FF"
				d="M29.12 15.34 16.66 2.88a.96.96 0 0 0-1.36 0L12.5 5.68l3.66 3.66c.86-.3 1.84-.1 2.52.58a3.05 3.05 0 0 1 .58 2.58l3.52 3.52c.86-.3 1.84-.1 2.52.58a3.06 3.06 0 0 1 0 4.32 3.06 3.06 0 0 1-4.32 0 3.05 3.05 0 0 1-.62-3.3l-3.28-3.28v8.64a3.06 3.06 0 0 1 1.94 4.08 3.06 3.06 0 1 1-1.94-4.08V12.7a3.05 3.05 0 0 1-1.7-1.7L11.08 7.1 2.88 15.3a.96.96 0 0 0 0 1.36l12.46 12.46c.38.38.98.38 1.36 0l12.42-12.42a.96.96 0 0 0 0-1.36z"
			/>
		</svg>
	)
}
function LogoSlack() {
	return (
		<svg width="15" height="15" viewBox="0 0 127 127" aria-hidden>
			<path
				fill="#E01E5A"
				d="M27.2 80c0 7.3-5.9 13.2-13.2 13.2S.8 87.3.8 80s5.9-13.2 13.2-13.2h13.2V80zm6.6 0c0-7.3 5.9-13.2 13.2-13.2s13.2 5.9 13.2 13.2v33c0 7.3-5.9 13.2-13.2 13.2s-13.2-5.9-13.2-13.2V80z"
			/>
			<path
				fill="#36C5F0"
				d="M47 27.2c-7.3 0-13.2-5.9-13.2-13.2S39.7.8 47 .8s13.2 5.9 13.2 13.2v13.2H47zm0 6.6c7.3 0 13.2 5.9 13.2 13.2S54.3 60.2 47 60.2H14C6.7 60.2.8 54.3.8 47S6.7 33.8 14 33.8H47z"
			/>
			<path
				fill="#2EB67D"
				d="M99.8 47c0-7.3 5.9-13.2 13.2-13.2s13.2 5.9 13.2 13.2-5.9 13.2-13.2 13.2H99.8V47zm-6.6 0c0 7.3-5.9 13.2-13.2 13.2S66.8 54.3 66.8 47V14c0-7.3 5.9-13.2 13.2-13.2s13.2 5.9 13.2 13.2v33z"
			/>
			<path
				fill="#ECB22E"
				d="M80 99.8c7.3 0 13.2 5.9 13.2 13.2s-5.9 13.2-13.2 13.2-13.2-5.9-13.2-13.2V99.8H80zm0-6.6c-7.3 0-13.2-5.9-13.2-13.2S72.7 66.8 80 66.8h33c7.3 0 13.2 5.9 13.2 13.2s-5.9 13.2-13.2 13.2H80z"
			/>
		</svg>
	)
}
function LogoNotion({ ink = '#FFFFFF' }: { ink?: string }) {
	return (
		<svg width="14" height="14" viewBox="0 0 100 100" aria-hidden>
			<path
				fill={ink}
				d="M18 12h52c2 0 4 1 5 3l13 18c1 2 2 4 2 6v49c0 4-3 7-7 7H31c-2 0-4-1-5-3L13 74c-1-2-2-4-2-6V19c0-4 3-7 7-7z"
			/>
			<path
				fill={ink === '#FFFFFF' ? '#0C0D12' : '#FAF9F5'}
				d="M32 30h28v6H40v10h17v6H40v16h-8V30zm36 0c6 0 10 4 10 10v28c0 6-4 10-10 10s-10-4-10-10V40c0-6 4-10 10-10zm0 8c-2 0-3 1-3 3v26c0 2 1 3 3 3s3-1 3-3V41c0-2-1-3-3-3z"
			/>
		</svg>
	)
}
function LogoFigma() {
	return (
		<svg width="12" height="18" viewBox="0 0 38 57" aria-hidden>
			<path fill="#F24E1E" d="M19 28.5a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0z" />
			<path fill="#FF7262" d="M0 47.5A9.5 9.5 0 0 1 9.5 38H19v9.5a9.5 9.5 0 1 1-19 0z" />
			<path fill="#A259FF" d="M19 0v19h9.5a9.5 9.5 0 1 0 0-19H19z" />
			<path fill="#1ABCFE" d="M0 9.5A9.5 9.5 0 0 0 9.5 19H19V0H9.5A9.5 9.5 0 0 0 0 9.5z" />
			<path fill="#0ACF83" d="M0 28.5A9.5 9.5 0 0 0 9.5 38H19V19H9.5A9.5 9.5 0 0 0 0 28.5z" />
		</svg>
	)
}
function LogoVercel({ ink = '#FFFFFF' }: { ink?: string }) {
	return (
		<svg width="14" height="12" viewBox="0 0 76 65" aria-hidden>
			<path fill={ink} d="M37.5 0 75 65H0z" />
		</svg>
	)
}
function LogoDiscord() {
	return (
		<svg width="16" height="12" viewBox="0 0 71 55" aria-hidden>
			<path
				fill="#5865F2"
				d="M60.1 4.9A58.5 58.5 0 0 0 45.4.2a.22.22 0 0 0-.23.11 40.8 40.8 0 0 0-1.8 3.7 54 54 0 0 0-16.2 0A37.4 37.4 0 0 0 25.4.3a.23.23 0 0 0-.23-.11A58.4 58.4 0 0 0 10.5 4.9a.2.2 0 0 0-.1.08C1.5 18.7-.9 32.2.3 45.5a.24.24 0 0 0 .09.16 58.8 58.8 0 0 0 17.7 9 0.23.23 0 0 0 .25-.08 42 42 0 0 0 3.6-5.9.22.22 0 0 0-.12-.31 38.7 38.7 0 0 1-5.5-2.6.23.23 0 0 1-.02-.38c.37-.28.74-.56 1.1-.85a.22.22 0 0 1 .23-.03c11.6 5.3 24.1 5.3 35.5 0a.22.22 0 0 1 .24.03c.35.29.72.57 1.1.85a.23.23 0 0 1-.02.38 36.4 36.4 0 0 1-5.52 2.6.23.23 0 0 0-.12.31 47.2 47.2 0 0 0 3.6 5.9.23.23 0 0 0 .25.08 58.6 58.6 0 0 0 17.7-9 .23.23 0 0 0 .09-.16c1.4-15.4-2.3-28.8-9.9-40.5a.18.18 0 0 0-.09-.09zM23.7 37.3c-3.5 0-6.4-3.2-6.4-7.1s2.8-7.1 6.4-7.1 6.5 3.2 6.4 7.1c0 3.9-2.8 7.1-6.4 7.1zm23.3 0c-3.5 0-6.4-3.2-6.4-7.1s2.8-7.1 6.4-7.1 6.5 3.2 6.4 7.1c0 3.9-2.9 7.1-6.4 7.1z"
			/>
		</svg>
	)
}
function LogoGoogle() {
	return (
		<svg width="15" height="15" viewBox="0 0 24 24" aria-hidden>
			<path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
			<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
			<path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
			<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
		</svg>
	)
}
function LogoMicrosoft() {
	return (
		<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
			<path fill="#F25022" d="M1 1h10v10H1z" />
			<path fill="#7FBA00" d="M13 1h10v10H13z" />
			<path fill="#00A4EF" d="M1 13h10v10H1z" />
			<path fill="#FFB900" d="M13 13h10v10H13z" />
		</svg>
	)
}
function LogoSupabase() {
	return (
		<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
			<path
				fill="#3ECF8E"
				d="M13.9 2.2c-.4-.6-1.3-.3-1.3.4v7.7H3.4c-1 0-1.5 1.2-.8 1.9l6.7 7.6c.4.5 1.2.2 1.2-.4v-7.6h9.2c1 0 1.5-1.2.8-1.9L13.9 2.2z"
			/>
		</svg>
	)
}
function LogoFallback({ ink = 'rgba(230,232,238,0.35)' }: { ink?: string }) {
	return (
		<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
			<rect x="3" y="3" width="18" height="18" rx="4" fill={ink} opacity={0.35} />
		</svg>
	)
}

function IntentCanvasStage({
	t,
	value,
	onChange,
	onReadyChange,
	onAdvance,
	ready,
}: {
	t: Theme
	value: string
	onChange: (v: string) => void
	onReadyChange: (ready: boolean) => void
	onAdvance: () => void
	ready: boolean
}) {
	const [focused, setFocused] = useState(false)
	const [assistOpen, setAssistOpen] = useState(false)
	const [assistExpanded, setAssistExpanded] = useState(true)
	const [assistMenu, setAssistMenu] = useState<'none' | 'auto'>('none')
	const [assistAuto, setAssistAuto] = useState<'Auto' | 'Formell' | 'Sprachlich'>('Auto')
	const [tagroBusy, setTagroBusy] = useState(false)
	const [tagroMode, setTagroMode] = useState<'polish' | 'summary' | 'detail' | null>(null)
	const [exampleIdx, setExampleIdx] = useState(0)
	const [exampleIn, setExampleIn] = useState(true)
	const areaRef = useRef<HTMLTextAreaElement | null>(null)
	const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
	const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
	const tagroTimers = useRef<ReturnType<typeof setTimeout>[]>([])
	/** Allocated textarea height — grows when content overflows (stable, no height:auto flicker) */
	const fieldHRef = useRef(INTENT_FIELD_MIN_H)
	const [fieldH, setFieldH] = useState(INTENT_FIELD_MIN_H)
	const hasText = value.trim().length > 0
	const enough = value.trim().length >= 8
	const showExample = !hasText
	const showContinue = ready && enough
	const light = t.mode === 'light'

	useEffect(() => {
		const el = areaRef.current
		if (!el) return

		if (!value.trim()) {
			fieldHRef.current = INTENT_FIELD_MIN_H
		} else {
			el.style.height = `${fieldHRef.current}px`
			let guard = 0
			while (el.scrollHeight > el.clientHeight + 2 && guard < 8) {
				fieldHRef.current = Math.max(
					fieldHRef.current + INTENT_FIELD_STEP_H,
					el.scrollHeight + 4,
				)
				el.style.height = `${fieldHRef.current}px`
				guard += 1
			}
		}

		el.style.height = `${fieldHRef.current}px`
		el.style.overflow = 'hidden'
		setFieldH((prev: number) => (prev === fieldHRef.current ? prev : fieldHRef.current))
	}, [value])

	useEffect(() => {
		return () => {
			if (blurTimer.current) clearTimeout(blurTimer.current)
			if (settleTimer.current) clearTimeout(settleTimer.current)
			for (const id of tagroTimers.current) clearTimeout(id)
		}
	}, [])

	/* Weiter only after 1.5s idle with enough text */
	useEffect(() => {
		if (settleTimer.current) clearTimeout(settleTimer.current)
		onReadyChange(false)
		if (!enough) return
		settleTimer.current = setTimeout(() => {
			onReadyChange(true)
		}, 1500)
		return () => {
			if (settleTimer.current) clearTimeout(settleTimer.current)
		}
	}, [value, enough, onReadyChange])

	useEffect(() => {
		if (!showExample) return
		let fade: ReturnType<typeof setTimeout> | null = null
		const tick = window.setInterval(() => {
			setExampleIn(false)
			fade = setTimeout(() => {
				setExampleIdx((i) => (i + 1) % GOAL_EXAMPLES.length)
				setExampleIn(true)
			}, 420)
		}, 3800)
		return () => {
			window.clearInterval(tick)
			if (fade) clearTimeout(fade)
		}
	}, [showExample])

	/* Tagro panel only via BR orb — never auto-open on focus/type. */
	function reopenAssistPanel() {
		if (blurTimer.current) clearTimeout(blurTimer.current)
		setAssistOpen(true)
		setAssistExpanded(true)
		setAssistMenu('none')
		requestAnimationFrame(() => areaRef.current?.focus())
	}

	function closeAssistPanel() {
		setAssistMenu('none')
		setAssistOpen(false)
		setAssistExpanded(false)
	}

	function runTagroMode(mode: 'polish' | 'summary' | 'detail') {
		const raw = value.trim()
		if (!raw || tagroBusy) return
		for (const id of tagroTimers.current) clearTimeout(id)
		tagroTimers.current = []
		setTagroMode(mode)
		setTagroBusy(true)
		tagroTimers.current.push(
			setTimeout(() => {
				let next = raw
				if (mode === 'summary') {
					next = raw.length > 160 ? `${raw.slice(0, 156).trim()}…` : raw
				} else if (mode === 'detail') {
					next = /workspace|festag|tagro/i.test(raw)
						? raw
						: `${raw} Tagro richtet Workspace, Module und Anbindungen danach ein.`
				} else if (assistAuto === 'Sprachlich') {
					next = raw.replace(/\s+/g, ' ').trim()
					if (!/[.!?]$/.test(next)) next = `${next}.`
					next = next.charAt(0).toUpperCase() + next.slice(1)
				} else {
					/* Formell / Auto */
					next = raw.replace(/\s+/g, ' ').replace(/\s*,\s*/g, ', ').trim()
					next = next.charAt(0).toUpperCase() + next.slice(1)
					if (!/[.!?]$/.test(next)) next = `${next}.`
				}
				onChange(next)
				setTagroBusy(false)
				setTagroMode(null)
			}, 900),
		)
	}

	const example = GOAL_EXAMPLES[exampleIdx]
	const modes: Array<{ id: 'polish' | 'summary' | 'detail'; label: string }> = [
		{ id: 'polish', label: 'Besser schreiben' },
		{ id: 'summary', label: 'Zusammenfassen' },
		{ id: 'detail', label: 'Detaillierter' },
	]
	/* Tagro pencil once typing starts; Weiter only after settle. */
	const showTagroChip = hasText && !assistOpen
	const showTagroPanel = hasText && assistOpen && assistExpanded

	const popBg = light
		? assistMenu !== 'none'
			? '#FFFFFF'
			: 'rgba(255,255,255,0.96)'
		: assistMenu !== 'none'
			? '#0E0E10'
			: hasText
				? 'rgba(21, 21, 24, 0.97)'
				: 'rgba(14, 14, 16, 0.96)'
	const popBorder = light
		? 'rgba(30, 30, 32, 0.08)'
		: `rgba(255, 255, 255, ${assistMenu !== 'none' ? '0.08' : hasText ? '0.07' : '0.06'})`
	const popInk = light ? '#1A1917' : '#E6E6EA'
	const popMuted = light ? 'rgba(26, 25, 23, 0.48)' : 'rgba(230, 230, 234, 0.48)'

	return (
		<>
			<MasterGlassyH1
				key="intent"
				t={t}
				lead="Worum geht es?"
				rest="Tagro richtet Workspace und Struktur danach aus."
				stacked
			/>

			{/* Notebook field — no stroke; bare Tagro on type; Weiter after settle */}
			<div style={{ position: 'relative', width: '100%', marginTop: 18, boxSizing: 'border-box' }}>
				<div
					style={{
						position: 'relative',
						borderRadius: 0,
						border: 'none',
						boxShadow: 'none',
						background: 'transparent',
						padding: hasText ? '6px 4px 44px' : '6px 4px',
						minHeight: 56,
						boxSizing: 'border-box',
						display: 'flex',
						flexDirection: 'column',
						justifyContent: 'flex-start',
						animation: 'masterShellIn .34s cubic-bezier(.22,1,.36,1) both',
					}}
				>
					<textarea
						ref={areaRef}
						className="master-field"
						value={value}
						rows={2}
						placeholder=""
						aria-label={`Ziel, z. B. ${example}`}
						onChange={(e: { target: { value: string } }) =>
							onChange(e.target.value.replace(/\r?\n/g, ' '))
						}
						onFocus={() => setFocused(true)}
						onBlur={() => setFocused(false)}
						onKeyDown={(e: { key: string; preventDefault: () => void }) => {
							if (e.key !== 'Enter') return
							e.preventDefault()
							if (showContinue) onAdvance()
						}}
						style={{
							width: '100%',
							minHeight: INTENT_FIELD_MIN_H,
							height: fieldH,
							padding: 0,
							border: 'none',
							background: 'transparent',
							color: t.ink,
							fontSize: INTENT_FIELD_FONT,
							lineHeight: `${INTENT_LINE_H}px`,
							fontFamily: 'inherit',
							fontWeight: 400,
							resize: 'none',
							outline: 'none',
							boxSizing: 'border-box',
							overflow: 'hidden',
							caretColor: hasText ? CARET_PRIMARY : 'transparent',
							transition: 'height .34s cubic-bezier(.22,1,.36,1)',
						}}
					/>
					{showExample ? (
						<span
							aria-hidden
							key={example}
							style={{
								position: 'absolute',
								left: 4,
								top: 6,
								right: 4,
								fontSize: INTENT_FIELD_FONT,
								lineHeight: `${INTENT_LINE_H}px`,
								fontWeight: 400,
								letterSpacing: '0.01em',
								color: PLACEHOLDER,
								pointerEvents: 'none',
								opacity: exampleIn ? (focused ? 0.55 : 1) : 0,
								transform: exampleIn ? 'translate3d(0, 0, 0)' : 'translate3d(0, 8px, 0)',
								filter: exampleIn ? 'blur(0)' : 'blur(5px)',
								transition:
									'opacity .42s cubic-bezier(.22,1,.36,1), transform .42s cubic-bezier(.22,1,.36,1), filter .42s ease',
								willChange: 'opacity, transform, filter',
								whiteSpace: 'normal',
								overflow: 'hidden',
								display: '-webkit-box',
								WebkitBoxOrient: 'vertical',
								WebkitLineClamp: 2,
							}}
						>
							{example}
						</span>
					) : null}
					{!hasText ? (
						<span
							aria-hidden
							className="master-idle-caret"
							style={{
								position: 'absolute',
								left: 4,
								top: 6 + Math.round((INTENT_LINE_H - INTENT_CARET_H) / 2),
								width: 2,
								height: INTENT_CARET_H,
								borderRadius: 1,
								background: CARET_PRIMARY,
								pointerEvents: 'none',
							}}
						/>
					) : null}

					{showTagroChip ? (
						<button
							type="button"
							aria-label="Tagro Assist öffnen"
							onMouseDown={(e: { preventDefault?: () => void }) => e.preventDefault?.()}
							onClick={reopenAssistPanel}
							style={{
								position: 'absolute',
								right: 2,
								bottom: 2,
								zIndex: 12,
								display: 'inline-flex',
								alignItems: 'center',
								justifyContent: 'center',
								width: 28,
								height: 28,
								padding: 0,
								borderRadius: 0,
								border: 'none',
								background: 'transparent',
								boxShadow: 'none',
								color: '#5B647D',
								opacity: 0.72,
								fontFamily: 'inherit',
								cursor: 'pointer',
								animation: 'masterTagroChipIn .32s cubic-bezier(.22,1,.36,1) both',
							}}
						>
							<span aria-hidden style={{ display: 'inline-flex', color: 'inherit' }}>
								<svg width="14" height="14" viewBox="0 0 16 16" fill="none">
									<path
										d="M11.4 2.6a1.45 1.45 0 0 1 2 2L5.7 12.3 2.5 13.5l1.2-3.2L11.4 2.6Z"
										stroke="currentColor"
										strokeWidth="1.35"
										strokeLinejoin="round"
									/>
								</svg>
							</span>
						</button>
					) : null}
				</div>

				{showContinue ? (
					<p
						style={{
							margin: '10px 0 0',
							fontSize: 13,
							lineHeight: 1.45,
							color: t.ink,
							opacity: 1,
							letterSpacing: '0.01em',
							display: 'inline-flex',
							alignItems: 'center',
							gap: 8,
							animation: 'masterShellIn .28s ease both',
							cursor: 'pointer',
						}}
						onClick={() => onAdvance()}
						role="button"
					>
						<span>Weiter</span>
						<span aria-hidden style={{ display: 'inline-flex', color: 'inherit', opacity: 0.92 }}>
							<EnterReturnIcon size={13} />
						</span>
					</p>
				) : null}

				{showTagroPanel ? (
					<div
						role="dialog"
						aria-label="Tagro Assist"
						onMouseDown={(e: { preventDefault?: () => void }) => e.preventDefault?.()}
						style={{
							position: 'absolute',
							left: 0,
							right: 0,
							top: 'calc(100% + 10px)',
							zIndex: 12,
							display: 'flex',
							flexDirection: 'column',
							gap: 6,
							padding: '8px 10px',
							borderRadius: 12,
							background: popBg,
							border: `1px solid ${popBorder}`,
							boxShadow: light
								? '0 1px 2px rgba(0,0,0,0.04), 0 12px 28px rgba(0,0,0,0.08)'
								: '0 1px 0 rgba(255,255,255,0.03) inset, 0 10px 32px rgba(0,0,0,0.42)',
							animation: 'masterTagroFloatIn .34s cubic-bezier(.22,1,.36,1) both',
							pointerEvents: 'auto',
							color: popInk,
							backdropFilter: 'blur(18px)',
							WebkitBackdropFilter: 'blur(18px)',
						}}
					>
						<div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
							<span
								style={{
									display: 'inline-flex',
									alignItems: 'center',
									gap: 5,
									padding: '3px 8px 3px 5px',
									borderRadius: 7,
									fontSize: 12,
									letterSpacing: '0.01em',
									lineHeight: 1.3,
									background: light ? 'rgba(91, 100, 125, 0.10)' : 'rgba(91, 100, 125, 0.14)',
									color: light ? 'rgba(26, 25, 23, 0.72)' : 'rgba(200, 208, 224, 0.88)',
									whiteSpace: 'nowrap',
								}}
							>
								<span aria-hidden style={{ display: 'inline-flex', flexShrink: 0, color: t.primary }}>
									<svg width="14" height="14" viewBox="0 0 16 16" fill="none">
										<path
											d="M11.4 2.6a1.45 1.45 0 0 1 2 2L5.7 12.3 2.5 13.5l1.2-3.2L11.4 2.6Z"
											stroke="currentColor"
											strokeWidth="1.35"
											strokeLinejoin="round"
										/>
									</svg>
								</span>
								Ziel schärfen
							</span>
							{tagroBusy ? (
								<span style={{ marginLeft: 'auto', fontSize: 11.5, color: popMuted }}>
									Verdichtet…
								</span>
							) : null}
							<button
								type="button"
								aria-label="Schließen"
								onClick={closeAssistPanel}
								style={{
									marginLeft: tagroBusy ? 4 : 'auto',
									width: 28,
									height: 28,
									display: 'inline-flex',
									alignItems: 'center',
									justifyContent: 'center',
									border: 'none',
									borderRadius: 8,
									background: 'transparent',
									color: popMuted,
									cursor: 'pointer',
									flexShrink: 0,
								}}
							>
								<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
									<path
										d="M4 4l8 8M12 4l-8 8"
										stroke="currentColor"
										strokeWidth="1.5"
										strokeLinecap="round"
									/>
								</svg>
							</button>
						</div>
						<div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
							<div style={{ position: 'relative' }}>
								<button
									type="button"
									disabled={tagroBusy}
									onClick={() => setAssistMenu((m) => (m === 'auto' ? 'none' : 'auto'))}
									style={{
										display: 'inline-flex',
										alignItems: 'center',
										gap: 4,
										height: 28,
										padding: '0 8px',
										borderRadius: 8,
										border: 'none',
										background:
											assistMenu === 'auto'
												? light
													? 'rgba(30,30,32,0.05)'
													: 'rgba(255,255,255,0.05)'
												: 'transparent',
										color: popInk,
										fontSize: 12.5,
										letterSpacing: '0.01em',
										fontFamily: 'inherit',
										cursor: 'pointer',
										opacity: tagroBusy ? 0.45 : 1,
									}}
								>
									{assistAuto}
									<svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden>
										<path
											d="M3 4.5 6 7.5 9 4.5"
											stroke="currentColor"
											strokeWidth="1.4"
											strokeLinecap="round"
											strokeLinejoin="round"
										/>
									</svg>
								</button>
								{assistMenu === 'auto' ? (
									<ul
										style={{
											position: 'absolute',
											left: 0,
											bottom: 'calc(100% + 8px)',
											zIndex: 4,
											margin: 0,
											padding: 5,
											listStyle: 'none',
											minWidth: 176,
											borderRadius: 12,
											background: light ? '#FFFFFF' : '#1A1A1E',
											border: `1px solid ${popBorder}`,
											boxShadow: light
												? '0 8px 24px rgba(0,0,0,0.10)'
												: '0 12px 36px rgba(0,0,0,0.55)',
										}}
									>
										{(
											[
												{ id: 'Auto' as const, hint: 'Tagro wählt passend' },
												{ id: 'Formell' as const, hint: 'Klar, geschäftlich' },
												{ id: 'Sprachlich' as const, hint: 'Natürlich, gesprochen' },
											] as const
										).map((opt) => (
											<li key={opt.id}>
												<button
													type="button"
													onClick={() => {
														setAssistAuto(opt.id)
														setAssistMenu('none')
													}}
													style={{
														width: '100%',
														textAlign: 'left',
														padding: '8px 10px',
														borderRadius: 8,
														border: 'none',
														background:
															assistAuto === opt.id
																? light
																	? 'rgba(30,30,32,0.05)'
																	: 'rgba(255,255,255,0.06)'
																: 'transparent',
														color: popInk,
														fontFamily: 'inherit',
														cursor: 'pointer',
													}}
												>
													<span style={{ display: 'block', fontSize: 13 }}>{opt.id}</span>
													<span
														style={{
															display: 'block',
															fontSize: 11.5,
															color: popMuted,
															marginTop: 2,
														}}
													>
														{opt.hint}
													</span>
												</button>
											</li>
										))}
									</ul>
								) : null}
							</div>
							{modes.map((m) => {
								const active = tagroMode === m.id
								return (
									<button
										key={m.id}
										type="button"
										disabled={tagroBusy || !hasText}
										onClick={() => runTagroMode(m.id)}
										style={{
											height: 28,
											padding: '0 10px',
											borderRadius: 8,
											border: `1px solid ${
												active
													? 'rgba(91,100,125,0.55)'
													: light
														? 'rgba(30,30,32,0.08)'
														: 'rgba(234,230,223,0.10)'
											}`,
											background: active ? 'rgba(91,100,125,0.16)' : 'transparent',
											color:
												!hasText || tagroBusy
													? popMuted
													: active
														? popInk
														: light
															? 'rgba(26,25,23,0.68)'
															: 'rgba(234,230,223,0.68)',
											fontSize: 11.5,
											letterSpacing: '0.01em',
											fontFamily: 'inherit',
											cursor: tagroBusy || !hasText ? 'default' : 'pointer',
											whiteSpace: 'nowrap',
										}}
									>
										{m.label}
									</button>
								)
							})}
							{tagroBusy ? (
								<span
									aria-hidden
									className="master-tagro-spin"
									style={{
										marginLeft: 'auto',
										width: 12,
										height: 12,
										borderRadius: '50%',
										boxSizing: 'border-box',
										border: `1.5px solid ${light ? 'rgba(30,30,32,0.12)' : 'rgba(234,230,223,0.14)'}`,
										borderTopColor: light ? 'rgba(30,30,32,0.65)' : 'rgba(234,230,223,0.75)',
									}}
								/>
							) : (
								<button
									type="button"
									disabled={!hasText}
									onClick={() => runTagroMode('polish')}
									aria-label="Einsetzen"
									style={{
										marginLeft: 'auto',
										width: 28,
										height: 28,
										borderRadius: '50%',
										border: 'none',
										background: hasText ? t.primary : light ? 'rgba(30,30,32,0.06)' : 'rgba(234,230,223,0.08)',
										color: hasText ? '#F5F5F7' : popMuted,
										display: 'inline-flex',
										alignItems: 'center',
										justifyContent: 'center',
										cursor: hasText ? 'pointer' : 'default',
										flexShrink: 0,
									}}
								>
									<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
										<path
											d="M8 12.5V3.5M8 3.5 4.5 7M8 3.5 11.5 7"
											stroke="currentColor"
											strokeWidth="1.6"
											strokeLinecap="round"
											strokeLinejoin="round"
										/>
									</svg>
								</button>
							)}
						</div>
					</div>
				) : null}
			</div>

			{showTagroPanel ? (
				<div aria-hidden style={{ height: 96, transition: 'height .32s cubic-bezier(.22,1,.36,1)' }} />
			) : null}
		</>
	)
}

/** Word-rise H1 — same motion as live AuthGlassyHero / onboarding cards. */
function MasterGlassyH1({
	t,
	lead,
	rest,
	stacked = false,
	inline = false,
}: {
	t: Theme
	lead: string
	rest: string
	stacked?: boolean
	inline?: boolean
}) {
	const leadWords = lead.trim().split(/\s+/).filter(Boolean)
	const restWords = rest.trim().split(/\s+/).filter(Boolean)
	let i = 0
	function renderWords(words: string[], muted: boolean) {
		return words.map((word, wi) => {
			const index = i++
			const last = wi === words.length - 1
			return (
				<span
					key={`${muted ? 'm' : 'l'}-${wi}-${word}`}
					className="master-gword"
					style={{
						display: 'inline-block',
						overflow: 'hidden',
						verticalAlign: 'baseline',
						paddingBottom: '0.45em',
						marginBottom: '-0.4em',
					}}
				>
					<span
						style={{
							display: 'inline-block',
							color: muted ? t.muted : t.ink,
							animation: `masterWordIn .58s cubic-bezier(.16, 1, .3, 1) both`,
							animationDelay: `${index * 32}ms`,
						}}
					>
						{word}
						{last ? '' : '\u00A0'}
					</span>
				</span>
			)
		})
	}
	return (
		<h1
			style={{
				margin: 0,
				fontSize: 29,
				lineHeight: inline ? 1.12 : 1.08,
				letterSpacing: '0.01em',
				fontWeight: 400,
				fontFamily: 'Aeonik, system-ui, sans-serif',
			}}
		>
			{stacked ? (
				<>
					<span style={{ display: 'block' }}>{renderWords(leadWords, false)}</span>
					{restWords.length ? (
						<span style={{ display: 'block' }}>{renderWords(restWords, true)}</span>
					) : null}
				</>
			) : (
				<>
					{renderWords(leadWords, false)}
					{restWords.length ? <> {renderWords(restWords, true)}</> : null}
				</>
			)}
		</h1>
	)
}

function ClarifyStage({
	t,
	value,
	onPick,
	onContinue,
	blueprint,
}: {
	t: Theme
	value: string
	onPick: (v: string) => void
	onContinue?: () => void
	blueprint: TagroBlueprint
}) {
	const guess = blueprint.workspaceType !== '—' ? blueprint.workspaceType : 'deinem Workspace'
	const picked = CLARIFY_OPTIONS.includes(value as (typeof CLARIFY_OPTIONS)[number])
		? (value as (typeof CLARIFY_OPTIONS)[number])
		: null
	const header = picked
		? CLARIFY_HEADER[picked]
		: {
				lead: `Tagro erkennt eher „${guess}“.`,
				muted: 'Bitte bestätige die Einordnung.',
			}

	return (
		<>
			<MasterGlassyH1
				key={picked ? `clarify-${picked}` : `clarify-idle-${guess}`}
				t={t}
				lead={header.lead}
				rest={header.muted}
				inline
			/>
			<div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 8 }}>
				{CLARIFY_OPTIONS.map((opt) => {
					const on = value === opt
					return (
						<button
							key={opt}
							type="button"
							className={`master-choice${on ? ' is-on' : ''}`}
							onClick={() => onPick(opt)}
							style={{
								...choiceRow(t, { on }),
							}}
						>
							{opt}
						</button>
					)
				})}
			</div>
			{picked ? <ContinueHint onContinue={onContinue} /> : null}
		</>
	)
}

function AuthStage({
	t,
	mode,
	name,
	email,
	onName,
	onEmail,
	onSwitchMode,
	onProvider,
	onWeiter,
}: {
	t: Theme
	mode: 'login' | 'register'
	name: string
	email: string
	onName: (v: string) => void
	onEmail: (v: string) => void
	onSwitchMode: (m: 'login' | 'register') => void
	onProvider: (provider: 'google' | 'apple') => void
	onWeiter: () => void
}) {
	const isLogin = mode === 'login'
	const available = name.trim().length > 1
	const emailOk = isValidWorkEmail(email)
	const canGo = isLogin ? emailOk : available && emailOk
	const [nameFocused, setNameFocused] = useState(false)
	const [emailFocused, setEmailFocused] = useState(false)
	const [nameConfirmed, setNameConfirmed] = useState(false)
	const handle = name.trim().replace(/\s+/g, '').toLowerCase()
	const nameInputRef = useRef<HTMLInputElement | null>(null)

	useEffect(() => {
		/* Reset confirm when switching modes or clearing name */
		if (!available) setNameConfirmed(false)
	}, [available, mode])

	function confirmName() {
		if (!available) return
		setNameConfirmed(true)
		setNameFocused(false)
	}

	function editName() {
		setNameConfirmed(false)
		requestAnimationFrame(() => nameInputRef.current?.focus())
	}

	return (
		<>
			{/* One text block: title + name — tight line stack */}
			<div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
				<h1
					style={{
						margin: 0,
						padding: 0,
						fontSize: 26,
						lineHeight: 1.08,
						letterSpacing: '0.01em',
						fontWeight: 400,
						fontFamily: 'Aeonik, system-ui, sans-serif',
						color: t.ink,
					}}
				>
					{isLogin ? 'Willkommen zurück.' : 'Erstelle dein Konto.'}
				</h1>

				{isLogin ? (
					handle ? (
						/* Remembered Benutzer — display only, never re-type on Anmelden */
						<div
							style={{
								display: 'flex',
								alignItems: 'baseline',
								gap: 2,
								fontSize: 26,
								lineHeight: 1.08,
								letterSpacing: '0.01em',
								fontWeight: 400,
								fontFamily: 'Aeonik, system-ui, sans-serif',
								color: t.muted,
								minWidth: 0,
								maxWidth: '100%',
								overflow: 'hidden',
								textOverflow: 'ellipsis',
								whiteSpace: 'nowrap',
							}}
							aria-label={`/${handle}`}
						>
							/{handle}
						</div>
					) : null
				) : nameConfirmed && available ? (
					/* Confirmed — /username + check 8px to the right of the text */
					<div
						style={{
							display: 'inline-flex',
							alignItems: 'center',
							gap: 8,
							maxWidth: '100%',
							minHeight: 30,
							animation: 'masterShellIn .28s ease both',
						}}
					>
						<button
							type="button"
							onClick={editName}
							aria-label={`/${handle}, zum Bearbeiten tippen`}
							style={{
								border: 'none',
								background: 'transparent',
								padding: 0,
								margin: 0,
								cursor: 'pointer',
								fontFamily: 'Aeonik, system-ui, sans-serif',
								fontSize: 26,
								lineHeight: 1.08,
								letterSpacing: '0.01em',
								fontWeight: 400,
								color: t.muted,
								textAlign: 'left',
								minWidth: 0,
								maxWidth: '100%',
								overflow: 'hidden',
								textOverflow: 'ellipsis',
								whiteSpace: 'nowrap',
							}}
						>
							/{handle}
						</button>
						<span
							className="master-ok-badge"
							title="Verfügbar"
							role="status"
							aria-label="Verfügbar"
							style={{
								width: 22,
								height: 22,
								borderRadius: 99,
								display: 'inline-flex',
								alignItems: 'center',
								justifyContent: 'center',
								background:
									t.mode === 'light' ? 'rgba(46, 155, 82, 0.10)' : 'rgba(46, 155, 82, 0.14)',
								color: t.mode === 'light' ? '#2E9B52' : '#3dba66',
								flexShrink: 0,
							}}
						>
							<svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
								<path
									d="M3.2 8.2 6.4 11.4 12.8 4.6"
									stroke="currentColor"
									strokeWidth="2.2"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
							</svg>
						</span>
					</div>
				) : (
					<div
						style={{
							position: 'relative',
							display: 'inline-flex',
							alignItems: 'center',
							gap: 8,
							maxWidth: '100%',
							minHeight: 30,
						}}
					>
						<span
							style={{
								display: 'inline-grid',
								alignItems: 'center',
								maxWidth: '100%',
								fontSize: 26,
								lineHeight: 1.08,
								letterSpacing: '0.01em',
								fontWeight: 400,
								fontFamily: 'Aeonik, system-ui, sans-serif',
							}}
						>
							{/* Mirror grows the field to the text — check sits 8px after it */}
							<span
								aria-hidden
								style={{
									visibility: 'hidden',
									whiteSpace: 'pre',
									gridArea: '1 / 1',
									minWidth: 2,
									paddingRight: 1,
								}}
							>
								{name || ' '}
							</span>
							<input
								ref={nameInputRef}
								value={name}
								onChange={(e: { target: { value: string } }) => {
									onName(e.target.value)
									setNameConfirmed(false)
								}}
								onKeyDown={(e: { key: string; preventDefault: () => void }) => {
									if (e.key === 'Enter') {
										e.preventDefault()
										confirmName()
									}
								}}
								onBlur={() => {
									if (available) confirmName()
								}}
								placeholder=""
								aria-label="Dein Name in Festag"
								autoComplete="off"
								spellCheck={false}
								style={{
									gridArea: '1 / 1',
									width: '100%',
									minWidth: 2,
									border: 'none',
									outline: 'none',
									background: 'transparent',
									color: t.ink,
									fontSize: 26,
									lineHeight: 1.15,
									letterSpacing: '0.01em',
									fontWeight: 400,
									fontFamily: 'Aeonik, system-ui, sans-serif',
									padding: 0,
									margin: 0,
									boxSizing: 'border-box',
									caretColor: CARET_PRIMARY,
								}}
							/>
						</span>
						{!name.trim() ? (
							<span
								aria-hidden
								className="master-idle-caret"
								style={{
									position: 'absolute',
									left: 0,
									top: '50%',
									marginTop: -11,
									width: 2,
									height: 22,
									borderRadius: 1,
									background: CARET_PRIMARY,
									pointerEvents: 'none',
								}}
							/>
						) : null}
						{available ? (
							<span
								className="master-ok-badge"
								title="Verfügbar — Enter zum Bestätigen"
								role="status"
								aria-label="Verfügbar"
								style={{
									width: 22,
									height: 22,
									borderRadius: 99,
									display: 'inline-flex',
									alignItems: 'center',
									justifyContent: 'center',
									background:
										t.mode === 'light' ? 'rgba(46, 155, 82, 0.10)' : 'rgba(46, 155, 82, 0.14)',
									color: t.mode === 'light' ? '#2E9B52' : '#3dba66',
									flexShrink: 0,
									pointerEvents: 'none',
								}}
							>
								<svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
									<path
										d="M3.2 8.2 6.4 11.4 12.8 4.6"
										stroke="currentColor"
										strokeWidth="2.2"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
								</svg>
							</span>
						) : null}
					</div>
				)}
			</div>

			<div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
				<button
					type="button"
					onClick={() => onProvider('google')}
					style={{
						...oauth(t),
						/* Light: Festag fill primary (strokes use lighter CARET_PRIMARY) */
						background: t.mode === 'light' ? '#5B647D' : 'transparent',
						border:
							t.mode === 'light'
								? '1px solid transparent'
								: `1px solid ${t.hairline}`,
						color: t.mode === 'light' ? '#F5F6F8' : t.ink,
						boxShadow: 'none',
						cursor: 'pointer',
						fontFamily: 'inherit',
						width: '100%',
					}}
				>
					<span
						style={{
							display: 'inline-flex',
							opacity: t.mode === 'light' ? 1 : 0.72,
							color: t.mode === 'light' ? '#F5F6F8' : t.ink,
						}}
					>
						<GoogleIcon />
					</span>
					<span>{isLogin ? 'Mit Google fortfahren' : 'Mit Google registrieren'}</span>
				</button>
				<button
					type="button"
					onClick={() => onProvider('apple')}
					style={{
						...oauth(t),
						cursor: 'pointer',
						fontFamily: 'inherit',
						width: '100%',
					}}
				>
					<span style={{ display: 'inline-flex', opacity: 0.42, color: t.ink }}>
						<AppleIcon />
					</span>
					<span>{isLogin ? 'Mit Apple fortfahren' : 'Mit Apple registrieren'}</span>
				</button>
				<div style={divider(t)}>
					<span style={{ flex: 1, height: 1, background: t.divider }} />
					<span style={{ color: t.muted, fontSize: 13 }}>oder</span>
					<span style={{ flex: 1, height: 1, background: t.divider }} />
				</div>
				<input
					className="master-field"
					value={email}
					onChange={(e: { target: { value: string } }) => onEmail(e.target.value)}
					onFocus={() => setEmailFocused(true)}
					onBlur={() => setEmailFocused(false)}
					placeholder="Arbeits-E-Mail eingeben"
					aria-label="Arbeits-E-Mail eingeben"
					style={field(t, { focused: emailFocused, filled: Boolean(email.trim()) })}
				/>
				<button
					type="button"
					disabled={!canGo}
					onClick={() => {
						if (!canGo) return
						onWeiter()
					}}
					style={{
						width: '100%',
						minWidth: 0,
						height: 44,
						marginTop: 2,
						padding: '0 14px',
						borderRadius: 6,
						display: 'flex',
						alignItems: 'center',
						justifyContent: email.trim() ? 'space-between' : 'center',
						gap: 10,
						/* Idle = quiet clarify hairline (not white plate); ready = white CTA */
						border: canGo
							? `1px solid ${t.mode === 'light' ? 'rgba(30, 30, 32, 0.10)' : 'rgba(255, 255, 255, 0.10)'}`
							: `1px solid ${t.mode === 'light' ? 'rgba(30, 30, 32, 0.04)' : t.hairline}`,
						background: canGo ? '#FFFFFF' : 'transparent',
						color: canGo ? '#1e1e20' : t.muted,
						fontSize: 14,
						fontWeight: 400,
						fontFamily: 'inherit',
						cursor: canGo ? 'pointer' : 'default',
						opacity: 1,
						boxShadow: canGo ? '0 1px 2px rgba(0, 0, 0, 0.04)' : 'none',
						transition:
							'background .18s ease, color .18s ease, border-color .18s ease, box-shadow .18s ease',
					}}
				>
					<span>Weiter</span>
					{email.trim() ? (
						<span aria-hidden style={{ display: 'inline-flex', opacity: canGo ? 0.88 : 0.72 }}>
							<EnterReturnIcon />
						</span>
					) : null}
				</button>
				<div style={oauthGhost(t)}>Single Sign-On (SSO)</div>
			</div>

			<button
				type="button"
				onClick={() => onSwitchMode(isLogin ? 'register' : 'login')}
				style={{
					marginTop: 28,
					padding: 0,
					border: 'none',
					background: 'transparent',
					color: t.ink,
					fontSize: 15,
					fontWeight: 400,
					fontFamily: 'inherit',
					cursor: 'pointer',
					textAlign: 'left',
					alignSelf: 'flex-start',
				}}
			>
				{isLogin ? 'Konto erstellen' : 'Anmelden'}
			</button>
		</>
	)
}

const DOCS_LINKS = [
	{ title: 'Erste Schritte', hint: 'Konto, Workspace, Tagro' },
	{ title: 'Workspace & Rollen', hint: 'Client und Developer in einem Graph' },
	{ title: 'Tagro verstehen', hint: 'Status, Entscheidungen, nächste Schritte' },
	{ title: 'Anbindungen', hint: 'GitHub, Figma und mehr' },
] as const

const LEGAL_LINK = {
	title: 'Rechtliches',
	hint: 'Datenschutz, AGB, Impressum und mehr',
} as const

function AuthDocsSheet({
	t,
	open,
	onClose,
	desktop = false,
}: {
	t: Theme
	open: boolean
	onClose: () => void
	desktop?: boolean
}) {
	const light = t.mode === 'light'
	const [visible, setVisible] = useState(open)
	const [dragY, setDragY] = useState(0)
	const [draggingSheet, setDraggingSheet] = useState(false)
	const [query, setQuery] = useState('')
	const startY = useRef(0)
	const dragYRef = useRef(0)

	useEffect(() => {
		if (open) {
			setVisible(true)
			setDragY(0)
			dragYRef.current = 0
			return
		}
		const id = window.setTimeout(() => setVisible(false), 280)
		return () => clearTimeout(id)
	}, [open])

	useEffect(() => {
		if (!open) setQuery('')
	}, [open])

	useEffect(() => {
		if (!draggingSheet || desktop) return
		const move = (e: MouseEvent | TouchEvent) => {
			const clientY = 'touches' in e ? e.touches[0]?.clientY : e.clientY
			if (clientY == null) return
			const dy = Math.max(0, clientY - startY.current)
			setDragY(dy)
		}
		const up = () => {
			setDraggingSheet(false)
			setDragY((y) => {
				if (y > 88) onClose()
				return 0
			})
			dragYRef.current = 0
		}
		window.addEventListener('mousemove', move)
		window.addEventListener('mouseup', up)
		window.addEventListener('touchmove', move, { passive: true })
		window.addEventListener('touchend', up)
		return () => {
			window.removeEventListener('mousemove', move)
			window.removeEventListener('mouseup', up)
			window.removeEventListener('touchmove', move)
			window.removeEventListener('touchend', up)
		}
	}, [draggingSheet, onClose, desktop])

	if (!visible) return null

	const sheetBg = light ? '#FFFFFF' : '#1A1A1E'
	const sheetBorder = light ? 'rgba(30, 30, 32, 0.06)' : 'rgba(255, 255, 255, 0.08)'
	const grip = light ? 'rgba(30, 30, 32, 0.16)' : 'rgba(255, 255, 255, 0.18)'
	const rowBg = light ? '#FAF9F5' : 'rgba(255,255,255,0.04)'
	const rowBorder = light ? 'rgba(30, 30, 32, 0.06)' : 'rgba(255, 255, 255, 0.06)'
	const q = query.trim().toLowerCase()
	const filtered = q
		? DOCS_LINKS.filter(
				(item) =>
					item.title.toLowerCase().includes(q) || item.hint.toLowerCase().includes(q),
			)
		: DOCS_LINKS
	const showLegal =
		!q ||
		LEGAL_LINK.title.toLowerCase().includes(q) ||
		LEGAL_LINK.hint.toLowerCase().includes(q) ||
		q.includes('agb') ||
		q.includes('datenschutz') ||
		q.includes('impressum') ||
		q.includes('recht')

	function onGripDown(clientY: number) {
		startY.current = clientY
		dragYRef.current = 0
		setDragY(0)
		setDraggingSheet(true)
	}

	const searchField = (
		<div
			style={{
				display: 'flex',
				alignItems: 'center',
				gap: 8,
				height: 42,
				marginTop: desktop ? 0 : 16,
				padding: '0 14px',
				borderRadius: 6,
				border: `1px solid ${light ? 'rgba(30, 30, 32, 0.12)' : 'rgba(255,255,255,0.12)'}`,
				boxSizing: 'border-box',
			}}
		>
			<svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
				<circle cx="11" cy="11" r="6.5" stroke={t.muted} strokeWidth="1.6" />
				<path
					d="M16.2 16.2L20 20"
					stroke={t.muted}
					strokeWidth="1.6"
					strokeLinecap="round"
				/>
			</svg>
			<input
				type="text"
				role="searchbox"
				value={query}
				onChange={(e: { target: { value: string } }) => setQuery(e.target.value)}
				placeholder="Suchen…"
				aria-label="Dokumentation durchsuchen"
				autoFocus={open && desktop}
				style={{
					flex: 1,
					minWidth: 0,
					border: 'none',
					outline: 'none',
					background: 'transparent',
					fontSize: 14,
					fontFamily: 'inherit',
					color: t.ink,
					padding: 0,
				}}
			/>
		</div>
	)

	const docsRowStyle = {
		textAlign: 'left' as const,
		padding: desktop ? '10px 10px' : '14px 16px',
		borderRadius: desktop ? 6 : 12,
		border: `1px solid ${rowBorder}`,
		background: rowBg,
		boxShadow: light && !desktop ? '0 1px 2px rgba(0,0,0,0.03)' : 'none',
		cursor: 'pointer',
		fontFamily: 'inherit',
		width: '100%',
	}

	/* Desktop: anchored search popup under Docs — no sheet, no drag grip */
	if (desktop) {
		return (
			<div
				style={{
					position: 'absolute',
					inset: 0,
					zIndex: 40,
					pointerEvents: 'auto',
				}}
			>
				<button
					type="button"
					aria-label="Docs schließen"
					onClick={onClose}
					style={{
						position: 'absolute',
						inset: 0,
						border: 'none',
						padding: 0,
						margin: 0,
						cursor: 'default',
						background: 'transparent',
					}}
				/>
				<div
					role="dialog"
					aria-modal="true"
					aria-label="Dokumentation"
					style={{
						position: 'absolute',
						top: 56,
						right: 36,
						width: 320,
						maxWidth: 'calc(100% - 48px)',
						display: 'flex',
						flexDirection: 'column',
						gap: 8,
						padding: 10,
						borderRadius: 12,
						background: sheetBg,
						border: 'none',
						boxShadow: light
							? '0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px rgba(15, 23, 42, 0.08)'
							: '0 1px 2px rgba(0,0,0,0.28), 0 10px 24px rgba(0,0,0,0.36)',
						opacity: open ? 1 : 0,
						transform: open ? 'none' : 'translateY(6px) scale(0.98)',
						transformOrigin: 'top right',
						transition: 'opacity .24s ease, transform .24s cubic-bezier(.16,1,.3,1)',
						pointerEvents: open ? 'auto' : 'none',
						fontFamily: 'Aeonik, system-ui, sans-serif',
					}}
				>
					{searchField}
					<button
						type="button"
						onClick={onClose}
						style={{
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'flex-start',
							gap: 2,
							width: '100%',
							margin: 0,
							padding: '10px 10px',
							borderRadius: 6,
							border: `1px solid ${light ? 'rgba(30, 30, 32, 0.08)' : 'rgba(255,255,255,0.08)'}`,
							background: light ? 'rgba(91, 100, 125, 0.05)' : 'rgba(186, 194, 210, 0.06)',
							cursor: 'pointer',
							fontFamily: 'inherit',
							textAlign: 'left',
						}}
					>
						<span
							style={{
								fontSize: 13.5,
								letterSpacing: '0.01em',
								color: t.ink,
							}}
						>
							Support kontaktieren
						</span>
						<span
							style={{
								fontSize: 12,
								lineHeight: 1.35,
								letterSpacing: '0.01em',
								color: t.muted,
							}}
						>
							Benutzername oder Passwort vergessen — wir helfen dir weiter.
						</span>
					</button>
					<div
						style={{
							display: 'flex',
							flexDirection: 'column',
							maxHeight: 280,
							overflowY: 'auto',
						}}
					>
						{filtered.map((item) => (
							<button
								key={item.title}
								type="button"
								onClick={onClose}
								style={{
									textAlign: 'left',
									padding: '10px',
									borderRadius: 6,
									border: 'none',
									background: 'transparent',
									cursor: 'pointer',
									fontFamily: 'inherit',
								}}
							>
								<span
									style={{
										display: 'block',
										fontSize: 13.5,
										letterSpacing: '0.01em',
										color: t.ink,
									}}
								>
									{item.title}
								</span>
								<span
									style={{
										display: 'block',
										marginTop: 2,
										fontSize: 12,
										lineHeight: 1.35,
										color: t.muted,
									}}
								>
									{item.hint}
								</span>
							</button>
						))}
						{showLegal ? (
							<button type="button" onClick={onClose} style={docsRowStyle}>
								<span
									style={{
										display: 'block',
										fontSize: 13.5,
										color: t.ink,
										letterSpacing: '0.01em',
									}}
								>
									{LEGAL_LINK.title}
								</span>
								<span
									style={{
										display: 'block',
										marginTop: 2,
										fontSize: 12,
										lineHeight: 1.35,
										color: t.muted,
									}}
								>
									{LEGAL_LINK.hint}
								</span>
							</button>
						) : null}
						{filtered.length === 0 && !showLegal ? (
							<div
								style={{
									padding: '14px 10px',
									fontSize: 13,
									color: t.muted,
								}}
							>
								Keine Treffer
							</div>
						) : null}
					</div>
					<button
						type="button"
						onClick={onClose}
						style={{
							width: '100%',
							height: 40,
							borderRadius: 6,
							border: light
								? `1px solid ${t.ctaReadyBorder}`
								: `1px solid ${t.hairline}`,
							background: light ? '#FFFFFF' : 'transparent',
							color: light ? '#1e1e20' : t.ink,
							boxShadow: light ? '0 1px 2px rgba(0,0,0,0.04)' : 'none',
							fontSize: 14,
							fontWeight: 400,
							letterSpacing: '0.01em',
							fontFamily: 'inherit',
							cursor: 'pointer',
						}}
					>
						Alle anzeigen
					</button>
				</div>
			</div>
		)
	}

	return (
		<div
			style={{
				position: 'absolute',
				inset: 0,
				zIndex: 40,
				pointerEvents: 'auto',
			}}
		>
			<button
				type="button"
				aria-label="Docs schließen"
				onClick={onClose}
				style={{
					position: 'absolute',
					inset: 0,
					border: 'none',
					padding: 0,
					margin: 0,
					cursor: 'pointer',
					background: open
						? light
							? 'rgba(26, 25, 23, 0.22)'
							: 'rgba(0, 0, 0, 0.48)'
						: 'transparent',
					transition: 'background .28s ease',
				}}
			/>
			<div
				role="dialog"
				aria-modal="true"
				aria-label="Dokumentation"
				style={{
					position: 'absolute',
					left: 0,
					right: 0,
					bottom: 0,
					maxHeight: '78%',
					display: 'flex',
					flexDirection: 'column',
					borderRadius: '20px 20px 0 0',
					background: sheetBg,
					border: `1px solid ${sheetBorder}`,
					borderBottom: 'none',
					boxShadow: light
						? '0 -8px 32px rgba(26, 25, 23, 0.08), 0 -1px 0 rgba(255,255,255,0.8) inset'
						: '0 -12px 40px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.04) inset',
					transform: open ? `translate3d(0, ${dragY}px, 0)` : 'translate3d(0, 108%, 0)',
					transition: draggingSheet
						? 'none'
						: 'transform .34s cubic-bezier(.22,1,.36,1)',
					paddingBottom: 22,
				}}
			>
				{/* Drag handle — mobile sheet only */}
				<div
					style={{
						flexShrink: 0,
						padding: '12px 0 6px',
						display: 'flex',
						justifyContent: 'center',
						cursor: 'grab',
						touchAction: 'none',
						userSelect: 'none',
					}}
					onMouseDown={(e: { clientY: number; preventDefault: () => void }) => {
						e.preventDefault()
						onGripDown(e.clientY)
					}}
					onTouchStart={(e: { touches: Array<{ clientY: number }> }) => {
						const p = e.touches[0]
						if (p) onGripDown(p.clientY)
					}}
				>
					<span
						aria-hidden
						style={{
							width: 36,
							height: 4,
							borderRadius: 99,
							background: grip,
							display: 'block',
						}}
					/>
				</div>

				<div
					style={{
						padding: '4px 22px 8px',
						overflowY: 'auto',
						WebkitOverflowScrolling: 'touch',
						minHeight: 0,
					}}
				>
					<h2
						style={{
							margin: 0,
							fontSize: 26,
							lineHeight: 1.22,
							letterSpacing: '0.01em',
							fontWeight: 400,
							fontFamily: 'Aeonik, system-ui, sans-serif',
							color: t.ink,
						}}
					>
						Alles zu Festag — klar und kurz nachschlagen.
					</h2>

					{searchField}

					<button
						type="button"
						onClick={onClose}
						style={{
							marginTop: 12,
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'flex-start',
							gap: 3,
							width: '100%',
							padding: '14px 16px',
							borderRadius: 12,
							border: `1px solid ${rowBorder}`,
							background: rowBg,
							boxShadow: light ? '0 1px 2px rgba(0,0,0,0.03)' : 'none',
							cursor: 'pointer',
							fontFamily: 'inherit',
							textAlign: 'left',
						}}
					>
						<span
							style={{
								display: 'block',
								fontSize: 15,
								color: t.ink,
								letterSpacing: '0.01em',
							}}
						>
							Support kontaktieren
						</span>
						<span
							style={{
								display: 'block',
								fontSize: 13,
								color: t.muted,
								lineHeight: 1.4,
							}}
						>
							Benutzername oder Passwort vergessen — wir helfen dir weiter.
						</span>
					</button>

					<div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
						{filtered.map((item) => (
							<button
								key={item.title}
								type="button"
								onClick={onClose}
								style={docsRowStyle}
							>
								<span
									style={{
										display: 'block',
										fontSize: 15,
										color: t.ink,
										letterSpacing: '0.01em',
									}}
								>
									{item.title}
								</span>
								<span
									style={{
										display: 'block',
										marginTop: 3,
										fontSize: 13,
										color: t.muted,
										lineHeight: 1.4,
									}}
								>
									{item.hint}
								</span>
							</button>
						))}
						{showLegal ? (
							<button type="button" onClick={onClose} style={docsRowStyle}>
								<span
									style={{
										display: 'block',
										fontSize: 15,
										color: t.ink,
										letterSpacing: '0.01em',
									}}
								>
									{LEGAL_LINK.title}
								</span>
								<span
									style={{
										display: 'block',
										marginTop: 3,
										fontSize: 13,
										color: t.muted,
										lineHeight: 1.4,
									}}
								>
									{LEGAL_LINK.hint}
								</span>
							</button>
						) : null}
						{filtered.length === 0 && !showLegal ? (
							<div style={{ padding: '14px 10px', fontSize: 13, color: t.muted }}>
								Keine Treffer
							</div>
						) : null}
					</div>

					<button
						type="button"
						onClick={onClose}
						style={{
							marginTop: 16,
							width: '100%',
							height: 44,
							borderRadius: 6,
							border: light
								? `1px solid ${t.ctaReadyBorder}`
								: `1px solid ${t.hairline}`,
							background: light ? '#FFFFFF' : 'transparent',
							color: light ? '#1e1e20' : t.ink,
							boxShadow: light ? '0 1px 2px rgba(0,0,0,0.04)' : 'none',
							fontSize: 14,
							fontWeight: 400,
							letterSpacing: '0.01em',
							fontFamily: 'inherit',
							cursor: 'pointer',
						}}
					>
						Alle anzeigen
					</button>
				</div>
			</div>
		</div>
	)
}

function PreparingStage({
	t,
	onProgress,
}: {
	t: Theme
	onProgress: (progress: number, ready: boolean) => void
	onOpen?: () => void
}) {
	const lines = PREP_LINES
	const [index, setIndex] = useState(0)
	const [lit, setLit] = useState(0)
	const raf = useRef(0)
	const fillStart = useRef(0)
	const stepMs = 1050
	/* Match card H1 size (26) — slot keeps one-line carousel spacing */
	const PREP_FONT = 26
	const LINE_SLOT = Math.round(PREP_FONT * 1.3)
	const gray = t.lyricsDim
	const white = t.lyricsLit

	useEffect(() => {
		const timers: number[] = []
		setIndex(0)
		for (let i = 1; i < lines.length; i++) {
			timers.push(window.setTimeout(() => setIndex(i), i * stepMs))
		}
		timers.push(window.setTimeout(() => setIndex(0), lines.length * stepMs + 420))
		const loop = window.setInterval(() => {
			setIndex(0)
			for (let i = 1; i < lines.length; i++) {
				window.setTimeout(() => setIndex(i), i * stepMs)
			}
		}, lines.length * stepMs + 620)
		return () => {
			for (const id of timers) clearTimeout(id)
			clearInterval(loop)
		}
	}, [lines, stepMs])

	useEffect(() => {
		const text = lines[index] || ''
		const total = Array.from(text).length
		if (!total) {
			setLit(0)
			return
		}
		const fillMs = Math.min(stepMs * 0.72, Math.max(380, total * 22))
		fillStart.current = performance.now()
		setLit(0)
		cancelAnimationFrame(raf.current)
		const tick = (now: number) => {
			const p = Math.min(1, (now - fillStart.current) / fillMs)
			const eased = 1 - (1 - p) * (1 - p)
			setLit(Math.floor(eased * total))
			if (p < 1) raf.current = requestAnimationFrame(tick)
			else setLit(total)
		}
		raf.current = requestAnimationFrame(tick)
		return () => cancelAnimationFrame(raf.current)
	}, [index, lines, stepMs])

	const fillProgress = Math.min(
		1,
		(index + lit / Math.max(1, Array.from(lines[index] || '').length)) / lines.length,
	)
	const ready = index >= lines.length - 1 && lit >= Array.from(lines[index] || '').length

	useEffect(() => {
		onProgress(fillProgress, ready)
	}, [fillProgress, ready, onProgress])

	/* Lyrics only — left-aligned (Festag mark). Loading lives in the footer navi. */
	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'stretch',
				justifyContent: 'center',
				flex: 1,
				width: '100%',
				minHeight: '100%',
				paddingBottom: 24,
				boxSizing: 'border-box',
			}}
		>
			<div
				style={{
					position: 'relative',
					width: '100%',
					maxWidth: 340,
					height: LINE_SLOT * 3,
					overflow: 'hidden',
					maskImage:
						'linear-gradient(to bottom, transparent 0%, #000 12%, #000 88%, transparent 100%)',
					WebkitMaskImage:
						'linear-gradient(to bottom, transparent 0%, #000 12%, #000 88%, transparent 100%)',
				}}
			>
				{lines.map((text, i) => {
					const offset = i - index
					if (offset < -2 || offset > 2) return null
					const isCurrent = offset === 0
					const opacity =
						offset <= -2
							? 0
							: offset === -1
								? 0.42
								: offset === 0
									? 1
									: offset === 1
										? 0.42
										: 0
					return (
						<p
							key={`prep-${i}`}
							style={{
								position: 'absolute',
								left: 0,
								right: 0,
								top: LINE_SLOT,
								margin: 0,
								height: LINE_SLOT,
								fontSize: PREP_FONT,
								lineHeight: `${LINE_SLOT}px`,
								letterSpacing: '0.006em',
								fontWeight: 400,
								color: gray,
								fontFamily: 'Aeonik, system-ui, sans-serif',
								whiteSpace: 'nowrap',
								overflow: 'hidden',
								textOverflow: 'ellipsis',
								textAlign: 'left',
								transform: `translate3d(0, ${offset * LINE_SLOT}px, 0)`,
								opacity,
								transition:
									'opacity .58s cubic-bezier(.22,1,.36,1), transform .58s cubic-bezier(.22,1,.36,1)',
							}}
						>
							{Array.from(text).map((ch, ci) => (
								<span
									key={ci}
									style={{
										color: isCurrent && ci < lit ? white : gray,
										transition: 'color .07s linear',
									}}
								>
									{ch}
								</span>
							))}
						</p>
					)
				})}
			</div>
		</div>
	)
}

function Hero({
	t,
	lead,
	rest,
	single,
}: {
	t: Theme
	lead: string
	rest: string
	single?: boolean
}) {
	const leadWords = lead.trim().split(/\s+/).filter(Boolean)
	const restWords = rest.trim().split(/\s+/).filter(Boolean)
	let n = 0
	function word(text: string, color: string, key: string, last: boolean) {
		const delay = n++
		return (
			<span key={key} style={{ display: 'inline' }}>
				<span style={{ display: 'inline-block', overflow: 'hidden', verticalAlign: 'baseline' }}>
					<span
						style={{
							display: 'inline-block',
							color,
							animation: `masterWordIn .58s cubic-bezier(.16,1,.3,1) both`,
							animationDelay: `${delay * 28}ms`,
						}}
					>
						{text}
					</span>
				</span>
				{last ? '' : ' '}
			</span>
		)
	}
	return (
		<h1
			style={{
				margin: 0,
				fontSize: 26,
				lineHeight: 1.15,
				letterSpacing: '0.01em',
				fontWeight: 400,
				fontFamily: 'Aeonik, system-ui, sans-serif',
				animation: 'masterShellIn .42s cubic-bezier(.22,1,.36,1) both',
			}}
		>
			<span style={{ display: single ? 'inline' : 'block', whiteSpace: 'normal' }}>
				{leadWords.map((w, idx) =>
					word(w, t.ink, `l-${idx}`, idx === leadWords.length - 1 && restWords.length === 0),
				)}
				{restWords.length ? ' ' : null}
				{restWords.map((w, idx) => word(w, t.muted, `r-${idx}`, idx === restWords.length - 1))}
			</span>
		</h1>
	)
}

type Theme = {
	mode: Appearance
	canvas: string
	frame: string
	ink: string
	muted: string
	mutedSoft: string
	primary: string
	hairline: string
	markFilter: string
	markInk: string
	cardBorder: string
	cardBg: string
	cardBgOn: string
	iconTile: string
	oauthBg: string
	divider: string
	panelBg: string
	fieldBorderFilled: string
	ctaReadyBg: string
	ctaReadyFg: string
	ctaReadyBorder: string
	prepIdle: string
	prepFg: string
	lyricsDim: string
	lyricsLit: string
	available: string
	dotActive: string
	dotDone: string
	dotIdle: string
	screenWashTop: string
	screenWashBottom: string
	/** Solid stops of the phone screen wash — edge fades must match these, not flat canvas */
	screenSolidTop: string
	screenSolidBottom: string
	commandFade: string
}

function themeFor(mode: Appearance): Theme {
	return mode === 'light' ? ivory() : dusk()
}

/** Night OLED — Festag Night */
function dusk(): Theme {
	return {
		mode: 'dark',
		canvas: '#070708',
		frame: '#12141A',
		ink: '#E6E8EE',
		muted: '#8891a0',
		mutedSoft: '#6B7385',
		primary: '#5B647D',
		hairline: 'rgba(230,232,238,0.10)',
		markFilter: 'brightness(0) invert(1)',
		markInk: '#FFFFFF',
		cardBorder: 'rgba(234,230,223,0.07)',
		cardBg: 'rgba(234,230,223,0.035)',
		cardBgOn: 'rgba(91, 100, 125, 0.10)',
		iconTile: 'rgba(232,230,225,0.08)',
		oauthBg: 'rgba(255,255,255,0.04)',
		divider: 'rgba(230,232,238,0.08)',
		panelBg: 'rgba(230,232,238,0.03)',
		fieldBorderFilled: 'rgba(230,232,238,0.20)',
		ctaReadyBg: '#5B647D',
		ctaReadyFg: '#F5F5F7',
		ctaReadyBorder: 'transparent',
		prepIdle: 'rgba(91, 100, 125, 0.38)',
		prepFg: '#F5F5F7',
		lyricsDim: 'rgba(230, 232, 238, 0.28)',
		lyricsLit: '#E6E8EE',
		available: '#7d8f7a',
		dotActive: 'rgba(230,232,238,0.9)',
		dotDone: 'rgba(230,232,238,0.4)',
		dotIdle: 'rgba(230,232,238,0.2)',
		screenWashTop: 'rgba(91, 100, 125, 0.10)',
		screenWashBottom: 'rgba(91, 100, 125, 0.08)',
		screenSolidTop: '#0A0B0F',
		screenSolidBottom: '#050506',
		commandFade: 'linear-gradient(to top, #070708 55%, rgba(7,7,8,0))',
	}
}

/** Anthropic ivory + soft read paper — warm yellow-ivory `#FBF7EE` */
function ivory(): Theme {
	return {
		mode: 'light',
		canvas: '#FBF7EE',
		frame: '#E8E6DF',
		ink: '#1A1917',
		muted: '#8891a0',
		mutedSoft: '#9A9388',
		primary: '#7E889F',
		/* Soft input stroke — buttons use even quieter btn hairline via oauth/cta */
		hairline: 'rgba(30, 30, 32, 0.10)',
		markFilter: 'brightness(0)',
		markInk: '#1A1917',
		cardBorder: 'rgba(30, 30, 32, 0.06)',
		cardBg: '#FFFFFF',
		cardBgOn: '#FFFFFF',
		iconTile: 'rgba(30, 30, 32, 0.04)',
		oauthBg: '#FFFFFF',
		divider: 'rgba(30, 30, 32, 0.06)',
		panelBg: 'rgba(255, 255, 255, 0.72)',
		fieldBorderFilled: 'rgba(30, 30, 32, 0.16)',
		/* Light CTAs: pure white + minimal hairline */
		ctaReadyBg: '#FFFFFF',
		ctaReadyFg: '#1e1e20',
		ctaReadyBorder: 'rgba(30, 30, 32, 0.06)',
		prepIdle: 'rgba(255, 255, 255, 0.92)',
		prepFg: '#1A1917',
		lyricsDim: 'rgba(26, 25, 23, 0.28)',
		lyricsLit: '#1A1917',
		available: '#5a7a58',
		dotActive: 'rgba(26, 25, 23, 0.85)',
		dotDone: 'rgba(26, 25, 23, 0.35)',
		dotIdle: 'rgba(26, 25, 23, 0.15)',
		screenWashTop: 'rgba(91, 100, 125, 0.06)',
		screenWashBottom: 'rgba(180, 160, 130, 0.08)',
		screenSolidTop: '#FCFAF3',
		screenSolidBottom: '#F3EFE4',
		commandFade: 'linear-gradient(to top, #FBF7EE 55%, rgba(251,247,238,0))',
	}
}

function phoneShell(t: Theme): CSSProperties {
	return {
		width: 390,
		padding: 10,
		borderRadius: 36,
		border: `1px solid ${t.frame}`,
		background: t.frame,
		flexShrink: 0,
	}
}

function desktopShell(t: Theme): CSSProperties {
	return {
		width: 'min(100%, 980px)',
		padding: 12,
		borderRadius: 16,
		border: `1px solid ${t.frame}`,
		background: t.frame,
		flexShrink: 0,
	}
}

function phoneScreen(t: Theme): CSSProperties {
	const mid = t.canvas
	const top = t.screenSolidTop
	const bottom = t.screenSolidBottom
	return {
		width: 370,
		height: 780,
		borderRadius: 28,
		background: `
			radial-gradient(ellipse 100% 52% at 50% -6%, ${t.screenWashTop}, transparent 58%),
			radial-gradient(ellipse 95% 50% at 50% 108%, ${t.screenWashBottom}, transparent 74%),
			linear-gradient(180deg, ${top} 0%, ${mid} 46%, ${bottom} 100%)
		`,
		overflow: 'hidden',
		display: 'flex',
		flexDirection: 'column',
		fontFamily: 'Aeonik, system-ui, sans-serif',
		fontWeight: 400,
		letterSpacing: '0.01em',
		position: 'relative',
	}
}

function desktopScreen(t: Theme): CSSProperties {
	const mid = t.canvas
	const top = t.screenSolidTop
	const bottom = t.screenSolidBottom
	return {
		width: '100%',
		height: 720,
		borderRadius: 10,
		background: `
			radial-gradient(ellipse 100% 52% at 50% -6%, ${t.screenWashTop}, transparent 58%),
			radial-gradient(ellipse 95% 50% at 50% 108%, ${t.screenWashBottom}, transparent 74%),
			linear-gradient(180deg, ${top} 0%, ${mid} 46%, ${bottom} 100%)
		`,
		overflow: 'hidden',
		display: 'flex',
		flexDirection: 'column',
		fontFamily: 'Aeonik, system-ui, sans-serif',
		fontWeight: 400,
		letterSpacing: '0.01em',
		position: 'relative',
	}
}

const headerBar: CSSProperties = {
	padding: '18px 28px 8px',
	display: 'flex',
	alignItems: 'center',
	flexShrink: 0,
}

const contentArea: CSSProperties = {
	flex: 1,
	padding: '8px 28px 100px',
	minHeight: 0,
	overflowY: 'auto',
	overflowX: 'hidden',
	display: 'flex',
	flexDirection: 'column',
	alignItems: 'center',
	WebkitOverflowScrolling: 'touch',
	overscrollBehavior: 'contain',
}

const contentCard: CSSProperties = {
	width: '100%',
	maxWidth: 380,
	margin: '0 auto',
	alignSelf: 'center',
	display: 'flex',
	flexDirection: 'column',
}

function appleDotsTrack(t: Theme): CSSProperties {
	return {
		position: 'absolute',
		left: '50%',
		transform: 'translateX(-50%)',
		bottom: 28,
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 9,
		padding: 0,
		background: 'transparent',
		border: 'none',
		minHeight: 7,
		boxSizing: 'border-box',
		zIndex: 6,
	}
}

function appleDotBead(t: Theme, state: 'active' | 'idle' | 'done'): CSSProperties {
	const active = state === 'active'
	return {
		display: 'block',
		width: active ? 26 : 8,
		height: 8,
		borderRadius: 999,
		background: active ? t.dotActive : state === 'done' ? t.dotDone : t.dotIdle,
		flexShrink: 0,
	}
}

function commandBar(t: Theme): CSSProperties {
	return {
		position: 'absolute',
		left: 0,
		right: 0,
		bottom: 0,
		padding: '12px 20px 22px',
		display: 'flex',
		alignItems: 'center',
		gap: 14,
		background: t.commandFade,
		boxSizing: 'border-box',
	}
}

const dotsRow: CSSProperties = {
	display: 'flex',
	alignItems: 'center',
	gap: 6,
	flex: 1,
}

function cta(t: Theme, ready: boolean): CSSProperties {
	return {
		height: 42,
		minWidth: 118,
		padding: '0 18px',
		borderRadius: 8,
		border: ready ? `1px solid ${t.ctaReadyBorder}` : `1px solid ${t.hairline}`,
		background: ready ? t.ctaReadyBg : 'transparent',
		color: ready ? t.ctaReadyFg : t.muted,
		fontSize: 14,
		fontWeight: 400,
		fontFamily: 'inherit',
		cursor: ready ? 'pointer' : 'default',
		opacity: ready ? 1 : 0.55,
		flexShrink: 0,
		boxShadow: ready && t.mode === 'light' ? '0 1px 2px rgba(0,0,0,0.04)' : 'none',
	}
}

function selectCard(t: Theme, on: boolean): CSSProperties {
	return {
		textAlign: 'left',
		padding: '14px 16px',
		borderRadius: 12,
		border: `1.5px solid ${on ? t.primary : t.cardBorder}`,
		background: on ? t.cardBgOn : t.cardBg,
		cursor: 'pointer',
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'flex-start',
		fontFamily: 'inherit',
		transition: 'border-color .2s ease, background .2s ease',
	}
}

const chipGrid: CSSProperties = {
	marginTop: 20,
	display: 'flex',
	flexWrap: 'wrap',
	gap: 8,
}

function chip(t: Theme, on: boolean): CSSProperties {
	return {
		padding: '10px 14px',
		borderRadius: 8,
		border: `1px solid ${on ? t.primary : t.hairline}`,
		background: on ? t.cardBgOn : 'transparent',
		color: t.ink,
		fontSize: 13,
		fontFamily: 'inherit',
		cursor: 'pointer',
	}
}

function integRow(t: Theme, on: boolean): CSSProperties {
	return {
		display: 'flex',
		alignItems: 'center',
		gap: 12,
		padding: '11px 14px',
		borderRadius: 10,
		border: `1.5px solid ${on ? t.primary : 'rgba(234,230,223,0.07)'}`,
		background: on ? 'rgba(91,100,125,0.10)' : 'rgba(234,230,223,0.03)',
		cursor: 'pointer',
		fontFamily: 'inherit',
		width: '100%',
		boxSizing: 'border-box',
	}
}

const integIcon: CSSProperties = {
	width: 28,
	height: 28,
	borderRadius: 8,
	display: 'inline-flex',
	alignItems: 'center',
	justifyContent: 'center',
	background: 'rgba(232,230,225,0.08)',
	color: '#E6E8EE',
	fontSize: 12,
	flexShrink: 0,
}

function field(
	t: Theme,
	opts: { focused?: boolean; filled?: boolean; marginTop?: number } = {},
): CSSProperties {
	const { focused = false, filled = false, marginTop = 8 } = opts
	return {
		marginTop,
		width: '100%',
		height: FIELD_H,
		minHeight: FIELD_H,
		borderRadius: FIELD_RADIUS,
		...inputStroke(t, { focused, filled }),
		/* Match Intent field — transparent on ivory; CTAs stay white */
		background: 'transparent',
		color: t.ink,
		padding: `0 ${FIELD_PAD_X}px`,
		fontSize: FIELD_FONT,
		lineHeight: 1.25,
		fontWeight: 400,
		fontFamily: 'inherit',
		boxSizing: 'border-box',
		outline: 'none',
		caretColor: CARET_PRIMARY,
	}
}

/** Clarify + Quellen rows — same height/type as login email field. */
function choiceRow(
	t: Theme,
	opts: { on?: boolean } = {},
): CSSProperties {
	const on = Boolean(opts.on)
	const light = t.mode === 'light'
	/* Idle: quiet 1px hairline. Selected: primary stroke. Hover via .master-choice CSS. */
	const idleStroke = light ? 'rgba(30, 30, 32, 0.04)' : 'rgba(255, 255, 255, 0.05)'
	return {
		width: '100%',
		height: FIELD_H,
		minHeight: FIELD_H,
		maxHeight: FIELD_H,
		padding: `0 ${FIELD_PAD_X}px`,
		borderRadius: FIELD_RADIUS,
		border: on ? `2px solid ${t.primary}` : `1px solid ${idleStroke}`,
		background: on ? (light ? '#FFFFFF' : '#151518') : light ? '#FFFFFF' : t.cardBg,
		boxShadow: on
			? light
				? '0 1px 3px rgba(0,0,0,0.06)'
				: '0 1px 3px rgba(0,0,0,0.35)'
			: 'none',
		color: on ? t.ink : t.ink,
		opacity: on ? 1 : 0.88,
		fontSize: FIELD_FONT,
		fontWeight: 400,
		letterSpacing: '0.01em',
		lineHeight: 1.25,
		fontFamily: 'inherit',
		textAlign: 'left' as const,
		cursor: 'pointer',
		boxSizing: 'border-box',
		margin: 0,
		flexShrink: 0,
		transition: 'border-color .18s ease, border-width .18s ease, background .18s ease, box-shadow .18s ease, opacity .18s ease',
	}
}

function oauth(t: Theme): CSSProperties {
	const light = t.mode === 'light'
	return {
		height: 42,
		borderRadius: 6,
		border: light ? `1px solid ${t.ctaReadyBorder}` : `1px solid ${t.hairline}`,
		background: t.oauthBg,
		color: t.ink,
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 10,
		fontSize: 14,
		boxShadow: light ? '0 1px 2px rgba(0,0,0,0.04)' : 'none',
	}
}

/** Monochrome Google G — currentColor, muted via parent opacity. */
function GoogleIcon() {
	return (
		<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden style={{ display: 'block', flexShrink: 0 }}>
			<path
				fill="currentColor"
				d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
			/>
			<path
				fill="currentColor"
				d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
			/>
			<path
				fill="currentColor"
				d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
			/>
			<path
				fill="currentColor"
				d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
			/>
		</svg>
	)
}

/** Official Apple mark — currentColor. */
function AppleIcon() {
	return (
		<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden style={{ display: 'block', flexShrink: 0 }}>
			<path
				fill="currentColor"
				d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"
			/>
		</svg>
	)
}

function oauthGhost(t: Theme): CSSProperties {
	/* Light: SSO matches Google/Apple — white fill, minimal stroke */
	if (t.mode === 'light') {
		return {
			...oauth(t),
			color: t.ink,
		}
	}
	return {
		...oauth(t),
		background: 'transparent',
		color: t.muted,
	}
}

function divider(t: Theme): CSSProperties {
	return {
		display: 'flex',
		alignItems: 'center',
		gap: 12,
		padding: '2px 0',
	}
}

const CSS = `
  @keyframes masterWordIn {
    from { opacity: 0; transform: translate3d(0, 110%, 0); filter: blur(10px); }
    to { opacity: 1; transform: none; filter: blur(0); }
  }
  @keyframes masterShellIn {
    from { opacity: 0; filter: blur(12px); transform: translateY(8px); }
    to { opacity: 1; filter: none; transform: none; }
  }
  @keyframes masterCaretBlink {
    0%, 49% { opacity: 1; }
    50%, 100% { opacity: 0; }
  }
  @keyframes masterOkIn {
    from { opacity: 0; transform: scale(0.86); }
    to { opacity: 1; transform: scale(1); }
  }
  .master-idle-caret {
    animation: masterCaretBlink 1.05s steps(1, end) infinite;
  }
  .master-ok-badge {
    animation: masterOkIn 0.22s ease-out both;
  }
  .master-ok-badge svg {
    display: block;
  }
  @keyframes masterTagroFloatIn {
    from { opacity: 0; transform: translate3d(0, 8px, 0) scale(0.985); filter: blur(4px); }
    to { opacity: 1; transform: translate3d(0, 0, 0) scale(1); filter: blur(0); }
  }
  @keyframes masterTagroChipIn {
    from { opacity: 0; transform: translate3d(0, 4px, 0) scale(0.9); }
    to { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
  }
  @keyframes masterTagroSpin {
    to { transform: rotate(360deg); }
  }
  .master-tagro-spin {
    animation: masterTagroSpin 0.85s linear infinite;
  }
  /* Preparing — mark + beads use inline styles in PreparingStage */
  @media (prefers-reduced-motion: reduce) {
    .master-prep-orb, .master-prep-bridge { animation: none !important; }
  }
  /* Clarify / Quellen rows — quiet idle hairline; lift on hover; primary when on */
  .master-phone button.master-choice:not(.is-on) {
    border: 1px solid rgba(30, 30, 32, 0.04) !important;
    box-shadow: none !important;
  }
  .master-phone button.master-choice:not(.is-on):hover {
    border-color: rgba(30, 30, 32, 0.12) !important;
    border-width: 1px !important;
  }
  .master-phone button.master-choice.is-on {
    border: 2px solid #7E889F !important;
  }
  /* Canonical form fields — match AuthStage email (46 / 15 / focus stroke) */
  .master-phone input.master-field {
    height: 46px !important;
    min-height: 46px !important;
    max-height: 46px !important;
    font-size: 15px !important;
    line-height: 1.25 !important;
    font-weight: 400 !important;
    border-radius: 8px !important;
    padding: 0 14px !important;
    box-sizing: border-box !important;
    outline: none !important;
    caret-color: #7E889F !important;
  }
  /* Kill Chrome autofill blue — canvas-matched inset (reads as transparent) */
  .master-phone input.master-field:-webkit-autofill,
  .master-phone input.master-field:-webkit-autofill:hover,
  .master-phone input.master-field:-webkit-autofill:focus,
  .master-phone input.master-field:-webkit-autofill:active {
    -webkit-text-fill-color: #1A1917 !important;
    caret-color: #7E889F !important;
    transition: background-color 9999s ease-out 0s;
    -webkit-box-shadow: 0 0 0 1000px #FBF7EE inset !important;
    box-shadow: 0 0 0 1000px #FBF7EE inset !important;
  }
  .master-phone input.master-field:-webkit-autofill:focus {
    -webkit-box-shadow: 0 0 0 1000px #FBF7EE inset !important;
    box-shadow: 0 0 0 1000px #FBF7EE inset !important;
    border: 2px solid #7E889F !important;
  }
  .master-phone textarea.master-field {
    font-size: 15px !important;
    font-weight: 400 !important;
    line-height: 22px !important;
    outline: none !important;
    caret-color: #7E889F !important;
  }
  /* Headers + UI: Aeonik Regular; headers open a touch; buttons/meta open more */
  .master-phone h1,
  .master-phone button,
  .master-phone input,
  .master-phone textarea,
  .master-phone p,
  .master-phone span {
    font-family: Aeonik, system-ui, sans-serif;
    font-weight: 400;
  }
  .master-phone h1 {
    letter-spacing: 0.006em !important;
    font-weight: 400 !important;
  }
  .master-phone button {
    letter-spacing: 0.01em !important;
  }
  .master-phone button span {
    letter-spacing: 0.01em !important;
  }
  .master-phone p {
    letter-spacing: 0.01em !important;
  }
`
