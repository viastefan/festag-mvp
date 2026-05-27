# Gemini API fuer Tagro

Tagro nutzt Gemini automatisch, sobald `GEMINI_API_KEY` gesetzt ist. Danach fallen die bestehenden Fallbacks weiter auf Minimax oder OpenAI zurueck, falls Gemini nicht konfiguriert ist oder eine Anfrage fehlschlaegt.

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
