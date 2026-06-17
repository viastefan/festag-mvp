import type { SupabaseClient } from '@supabase/supabase-js'

// Resolve the current user's personal workspace slug — the canonical
// workspace-home URL (festag.app/<slug>). Returns null when no slug is set.
export async function getMyWorkspaceSlug(
  supabase: SupabaseClient<any>,
  userId: string,
): Promise<string | null> {
  try {
    const { data } = await supabase
      .from('workspaces')
      .select('slug')
      .eq('primary_owner_id', userId)
      .eq('is_personal', true)
      .maybeSingle()
    const slug = (data as any)?.slug
    return typeof slug === 'string' && slug.trim() ? slug.trim() : null
  } catch {
    return null
  }
}

// Reserved top-level paths the workspace-slug route must never shadow.
// Used as a guard so a slug accidentally equal to a real route can't
// hijack it.
export const RESERVED_SLUGS = new Set<string>([
  'dashboard', 'projects', 'project', 'tasks', 'decisions', 'reports',
  'messages', 'inbox', 'ai', 'notes', 'observers', 'clients', 'teams',
  'settings', 'connectors', 'addons', 'estimator', 'docs', 'blog',
  'onboarding', 'login', 'register', 'logout', 'dev', 'new-project',
  'whats-new', 'updates', 'download', 'documents', 'voice-reports',
])
