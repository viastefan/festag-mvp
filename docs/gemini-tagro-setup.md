# Tagro AI: Claude (Anthropic) / Gemini / OpenAI

**Provider-Priorität: Claude → Gemini → OpenAI → Heuristik.**

## Claude (Anthropic) — bevorzugt

Tagro läuft auf Claude, sobald `ANTHROPIC_API_KEY` gesetzt ist (vor Gemini/OpenAI).

```bash
ANTHROPIC_API_KEY=sk-ant-...
TAGRO_CLAUDE_MODEL=claude-sonnet-4-6   # optional; default claude-sonnet-4-6
```

- Implementierung: `lib/tagro/claude.ts` (`runClaudeJson` / `runClaudeText`).
- Der stabile System-Prompt wird mit `cache_control: ephemeral` **prompt-gecacht** (günstiger/schneller bei wiederholten Orchestrierungs-Runs).
- JSON-Pfade laufen über `lib/tagro/openai.ts` (`runOpenAIJson`), Text-Pfade über `lib/tagro/text.ts` (`runTagroText`). Beide wählen Claude automatisch zuerst.
- Modelle: Opus 4.8 `claude-opus-4-8`, Sonnet 4.6 `claude-sonnet-4-6`, Haiku 4.5 `claude-haiku-4-5-20251001`.

## Gemini API fuer Tagro

Tagro nutzt Gemini automatisch, sobald `GEMINI_API_KEY` gesetzt ist (und kein `ANTHROPIC_API_KEY`). Danach fallen die bestehenden Fallbacks weiter auf Minimax oder OpenAI zurueck, falls Gemini nicht konfiguriert ist oder eine Anfrage fehlschlaegt.

## Lokal

1. In Google AI Studio einen Gemini API Key erstellen.
2. In `.env.local` setzen:

```bash
GEMINI_API_KEY=dein-google-ai-studio-key
TAGRO_GEMINI_MODEL=gemini-3.5-flash
```

3. Dev-Server neu starten.

## Vercel

In den Project Settings unter Environment Variables:

```bash
GEMINI_API_KEY=dein-google-ai-studio-key
TAGRO_GEMINI_MODEL=gemini-3.5-flash
```

Danach neu deployen.

## Tagro-Pfade

Diese Bereiche verwenden Gemini zuerst:

- `/api/ai/chat`
- `/api/ai/intake-step`
- `/api/ai/decompose`
- `/api/ai/test-project`
- `/api/ai/report-to-tasks`
- `/api/ai/progress`
- `/api/ai/conversations/[id]/messages`
- `/api/ai/conversations/[id]/end`
- `/api/decisions/[id]/suggest`
- `/api/notes/[id]/suggest`
- Projektklassifizierung
- alle `runOpenAIJson`-basierten Tagro-Orchestrierungen
