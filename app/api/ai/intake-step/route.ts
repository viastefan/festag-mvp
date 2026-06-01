import { NextRequest, NextResponse } from 'next/server'
import { hasVeyraAI as hasGeminiKey, runVeyraText as runGeminiText } from '@/lib/tagro/text'

export const runtime = 'nodejs'

/**
 * POST /api/ai/intake-step  { chatHistory: [{role:'tagro'|'user', text}] }
 *
 * One turn of the project-intake conversation. Veyra asks one focused
 * question at a time, extracts the title + summary as they crystallise,
 * and flags when it has enough to hand the chatHistory off to
 * /api/ai/decompose for the full structuring.
 *
 * Returns:
 *   {
 *     question:  string | null,    // next thing for Veyra to say (null when complete)
 *     title:     string | null,    // best current guess of the project title
 *     summary:   string | null,    // 1–2 sentence project summary
 *     complete:  boolean,          // true → caller should call decompose now
 *     reasoning: string            // short note for debugging (ignored client-side)
 *   }
 *
 * Falls back to a deterministic script when no AI key is configured so
 * the surface is never empty.
 */

const SYSTEM_PROMPT = `Du bist Veyra, der AI-Projektmanager von Festag.

Du führst einen kurzen, ruhigen Intake-Chat mit einem Kunden, um sein neues Softwareprojekt zu verstehen. Deine Aufgabe: pro Antwort EINE konkrete, kurze Folgefrage stellen — bis du genug Substanz hast.

Du sammelst:
  1. Was wird gebaut (Produkt/Lösung in einem Satz)
  2. Für wen (Zielgruppe / Nutzer)
  3. Welches Problem (Kernschmerz)
  4. Wichtigste Funktionen (3–5 Features grob)
  5. Zeit/Budget (grob, optional)

Spielregeln:
  • Eine Frage pro Turn. Keine Listen, kein Smalltalk.
  • Auf Deutsch, ruhig, professionell, kein Emoji-Style.
  • Sobald du genug hast (mind. Punkte 1–3 klar): complete=true setzen, KEINE Frage mehr stellen.
  • Maximal 6 Fragen insgesamt — danach zwangsweise complete=true.
  • title: prägnant, max 5 Wörter, wirklich der Projekttitel (kein Produkttyp-Wort allein).
  • summary: 1–2 Sätze, was das Projekt ist + für wen.

Antworte AUSSCHLIESSLICH mit validem JSON, kein Markdown, kein Erklärungstext:
{
  "question": "Deine nächste Frage oder null",
  "title": "Aktuell beste Titelschätzung oder null",
  "summary": "Aktuell beste 1–2-Satz-Zusammenfassung oder null",
  "complete": false,
  "reasoning": "kurze interne Notiz"
}`

type ChatTurn = { role: 'tagro' | 'user' | 'ai'; text: string }

const FALLBACK_QUESTIONS = [
  'Was möchtest du bauen — beschreib es bitte in einem Satz.',
  'Für wen ist das gedacht? Wer sind die Hauptnutzer?',
  'Welches konkrete Problem löst es für sie?',
  'Welche 3–5 Funktionen sind dir am wichtigsten?',
  'Hast du eine grobe Vorstellung zu Zeitrahmen oder Budget?',
]

function stripCodeFence(s: string): string {
  return s.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
}

function parseJsonPayload(raw: string) {
  const cleaned = stripCodeFence(raw).replace(/<think>[\s\S]*?<\/think>/g, '').trim()
  const match = cleaned.match(/\{[\s\S]*\}/)
  return JSON.parse(match?.[0] ?? cleaned)
}

function deriveFallbackTitle(history: ChatTurn[]): string | null {
  const userTexts = history.filter(h => h.role === 'user').map(h => h.text)
  if (!userTexts.length) return null
  const first = userTexts[0].trim()
  if (!first) return null
  // Take the first 4–5 meaningful words, strip filler.
  const words = first.split(/\s+/).filter(w => w.length > 1).slice(0, 5)
  if (!words.length) return null
  return words.join(' ').replace(/[.,;:!?]+$/, '')
}

function deriveFallbackSummary(history: ChatTurn[]): string | null {
  const userTexts = history.filter(h => h.role === 'user').map(h => h.text.trim()).filter(Boolean)
  if (!userTexts.length) return null
  return userTexts.slice(0, 2).join(' — ').slice(0, 220)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const chatHistory: ChatTurn[] = Array.isArray(body?.chatHistory) ? body.chatHistory : []
    const userTurnCount = chatHistory.filter(h => h.role === 'user').length

    const apiKey = process.env.MINIMAX_API_KEY
      || 'sk-cp-i7jkWRarSBe8qM82Zj2YXxHh7bXCCUAwciPjL5t-WrYRF3WHR4tgVXeJk-Y27k62RDsp7hrb1RJS2nr9rqXB-Q6GBMCKXU6-igQu2pPH6gerajhYbZySzHA'

    // Deterministic fallback — also kicks in if AI throws below.
    const fallback = () => {
      const idx = Math.max(0, Math.min(userTurnCount, FALLBACK_QUESTIONS.length - 1))
      const complete = userTurnCount >= 4
      return NextResponse.json({
        question: complete ? null : FALLBACK_QUESTIONS[idx],
        title: deriveFallbackTitle(chatHistory),
        summary: deriveFallbackSummary(chatHistory),
        complete,
        reasoning: 'fallback',
      })
    }

    if (!apiKey) return fallback()

    const conversation = chatHistory.map(t => ({
      role: t.role === 'user' ? 'user' as const : 'assistant' as const,
      content: t.text,
    }))

    if (hasGeminiKey()) {
      const gemini = await runGeminiText({
        system: SYSTEM_PROMPT,
        messages: conversation.map(message => ({
          role: message.role === 'assistant' ? 'model' as const : 'user' as const,
          text: message.content,
        })),
        prompt: `So weit der bisherige Chat. Wir sind in Turn ${userTurnCount + 1}. Antworte mit dem JSON-Schema.`,
        maxTokens: 1200,
        temperature: 0.2,
        responseMimeType: 'application/json',
      })
      if (gemini.ok && gemini.text) {
        let parsed: any
        try { parsed = parseJsonPayload(gemini.text) } catch { parsed = null }
        if (parsed) {
          const complete = Boolean(parsed?.complete) || userTurnCount >= 6
          return NextResponse.json({
            question: complete ? null : (typeof parsed?.question === 'string' ? parsed.question.trim() : null),
            title: typeof parsed?.title === 'string' ? parsed.title.trim() || null : null,
            summary: typeof parsed?.summary === 'string' ? parsed.summary.trim() || null : null,
            complete,
            reasoning: typeof parsed?.reasoning === 'string' ? parsed.reasoning.slice(0, 200) : '',
          })
        }
      }
    }

    const res = await fetch('https://api.minimax.io/v1/text/chatcompletion_v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'MiniMax-M2.7',
        max_tokens: 1200,
        reasoning_effort: 'none',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...conversation,
          {
            role: 'user',
            content: `So weit der bisherige Chat. Wir sind in Turn ${userTurnCount + 1}. Antworte mit dem JSON-Schema.`,
          },
        ],
      }),
    })

    if (!res.ok) return fallback()
    const ai = await res.json().catch(() => null)
    const raw: string | undefined = ai?.choices?.[0]?.message?.content
    if (!raw) return fallback()

    let parsed: any
    try { parsed = parseJsonPayload(raw) } catch { return fallback() }

    // Force-complete after 6 user turns regardless of model output.
    const complete = Boolean(parsed?.complete) || userTurnCount >= 6

    return NextResponse.json({
      question: complete ? null : (typeof parsed?.question === 'string' ? parsed.question.trim() : null),
      title: typeof parsed?.title === 'string' ? parsed.title.trim() || null : null,
      summary: typeof parsed?.summary === 'string' ? parsed.summary.trim() || null : null,
      complete,
      reasoning: typeof parsed?.reasoning === 'string' ? parsed.reasoning.slice(0, 200) : '',
    })
  } catch (error: any) {
    return NextResponse.json({
      question: 'Beschreibe dein Projekt in einem Satz.',
      title: null,
      summary: null,
      complete: false,
      reasoning: error?.message || 'error',
    })
  }
}
