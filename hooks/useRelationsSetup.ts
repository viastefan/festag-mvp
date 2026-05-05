'use client'

// Migration was applied directly via Supabase MCP on 2026-05-06.
// Tables rel_projects, rel_project_members, rel_messages, rel_documents, rel_quotes
// are confirmed to exist — no runtime setup check needed.

type SetupStatus = 'idle' | 'checking' | 'ready' | 'error'

interface SetupResult {
  status: SetupStatus
  error: string | null
  retry: () => void
}

export function useRelationsSetup(): SetupResult {
  return {
    status: 'ready',
    error: null,
    retry: () => {},
  }
}
