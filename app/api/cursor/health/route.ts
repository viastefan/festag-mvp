import { NextResponse } from 'next/server'
import { cursorConfigured } from '@/lib/cursor/cloud-agent-client'

/**
 * GET /api/cursor/health
 * Reports whether Cursor Cloud Agent API is configured (never exposes the key).
 */
export async function GET() {
  const configured = cursorConfigured()
  return NextResponse.json({
    configured,
    model: process.env.CURSOR_AGENT_MODEL?.trim() || 'default',
    defaultRepo: Boolean(process.env.FESTAG_CURSOR_DEFAULT_REPO_URL?.trim()),
    message: configured
      ? 'Cursor API Key gesetzt. Tasks können an Cloud Agents gesendet werden.'
      : 'Setze CURSOR_API_KEY in Vercel (.env.local lokal).',
  })
}
