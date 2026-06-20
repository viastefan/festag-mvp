import type { PostgrestError } from '@supabase/supabase-js'

/** True when Postgres/Supabase reports a missing relation. */
export function isMissingTableError(error: PostgrestError | null | undefined): boolean {
  if (!error) return false
  const msg = String(error.message || '').toLowerCase()
  return (
    error.code === '42P01'
    || error.code === 'PGRST205'
    || msg.includes('does not exist')
    || msg.includes('could not find the table')
    || msg.includes('schema cache')
  )
}

export async function safeTableRows<T>(
  query: PromiseLike<{ data: T[] | null; error: PostgrestError | null }>,
): Promise<T[]> {
  try {
    const { data, error } = await query
    if (error) return []
    return (data ?? []) as T[]
  } catch {
    return []
  }
}
