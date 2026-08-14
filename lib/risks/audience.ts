import type { SupabaseClient } from '@supabase/supabase-js'
import type { RiskAudience } from '@/lib/risks/present'

/**
 * Which framing a user gets. Driven by the account type, never by a query
 * parameter — a client account can ask for `audience=delivery` all day and
 * still gets the client view.
 *
 * @see lib/risks/present.ts
 */
export async function resolveRiskAudience(
  supa: SupabaseClient<any, any, any>,
  userId: string,
): Promise<RiskAudience> {
  const { data } = await (supa as any)
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle()

  const role = String(data?.role || 'client')
  return role === 'client' ? 'client' : 'delivery'
}
