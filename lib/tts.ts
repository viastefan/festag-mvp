/**
 * Server-side TTS via OpenAI Audio API.
 *
 * Only used when OPENAI_API_KEY is set in the environment (Vercel env).
 * Returns an MP3 buffer the caller can attach to an email or upload
 * to storage. Falls back to null when no key is configured — callers
 * should degrade gracefully (e.g. send a "Audio im Browser verfügbar"
 * link instead of an attachment).
 */

const OPENAI_TTS_ENDPOINT = 'https://api.openai.com/v1/audio/speech'

export type TtsOptions = {
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'
  speed?: number
  model?: 'tts-1' | 'tts-1-hd'
}

export async function synthesizeBriefingMp3(
  text: string,
  opts: TtsOptions = {},
): Promise<Buffer | null> {
  const key = process.env.OPENAI_API_KEY
  if (!key) return null

  const trimmed = text.trim().slice(0, 4000) // OpenAI TTS limit ≈ 4096 chars
  if (!trimmed) return null

  try {
    const res = await fetch(OPENAI_TTS_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: opts.model ?? 'tts-1',
        voice: opts.voice ?? 'alloy',
        speed: opts.speed ?? 1,
        input: trimmed,
        response_format: 'mp3',
      }),
    })
    if (!res.ok) {
      console.error('[tts] OpenAI error', res.status, await res.text().catch(() => ''))
      return null
    }
    const ab = await res.arrayBuffer()
    return Buffer.from(ab)
  } catch (e) {
    console.error('[tts] exception', e)
    return null
  }
}
